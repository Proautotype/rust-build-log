/**
 * Reads trending public posts from X.
 *
 * Each writer brings their own X API bearer token (stored encrypted), so R2R
 * does not pay for X access. A workspace-level X connector, if one is ever
 * connected, is used as an optional house fallback.
 *
 * Server-only: tokens never reach the browser.
 */

const GATEWAY_URL = "https://connector-gateway.lovable.dev/x";
const X_API_URL = "https://api.x.com";

export type XAuth =
  | { mode: "token"; token: string; creatorId?: string }
  | { mode: "gateway" };

export interface TrendPost {
  id: string;
  text: string;
  author: string;
  url: string;
  likes: number;
  reposts: number;
  replies: number;
  engagement: number;
  createdAt: string | null;
}

export interface Trend {
  key: string;
  keyword: string;
  label: string;
  engagement: number;
  posts: TrendPost[];
}

export class XNotConnectedError extends Error {
  constructor(message?: string) {
    super(
      message ??
        "X isn't connected yet. Add your own X API token in Agents → Your X access to pull trending posts.",
    );
    this.name = "XNotConnectedError";
  }
}

/** True when a house (workspace-level) X connection exists. */
export function isHouseXConnected() {
  return Boolean(process.env.LOVABLE_API_KEY && process.env.X_API_KEY);
}

/** Back-compat alias. */
export function isXConnected() {
  return isHouseXConnected();
}

/** The X credentials a given writer should use: their own token, else the house one. */
export async function resolveXAuthForCreator(creatorId: string): Promise<XAuth | null> {
  const { getWriterXToken } = await import("./x-credentials.server");
  const token = await getWriterXToken(creatorId);
  if (token) return { mode: "token", token, creatorId };
  if (isHouseXConnected()) return { mode: "gateway" };
  return null;
}


interface XUser {
  id: string;
  username: string;
}

interface XPost {
  id: string;
  text: string;
  author_id?: string;
  created_at?: string;
  public_metrics?: {
    like_count?: number;
    retweet_count?: number;
    reply_count?: number;
    quote_count?: number;
  };
}

function trendKey(keyword: string, postIds: string[]) {
  return `${keyword.toLowerCase().trim()}:${postIds.slice(0, 3).sort().join("-")}`;
}

/** Short human label for a trend, derived from the loudest post. */
function trendLabel(keyword: string, top: TrendPost | undefined) {
  const snippet = (top?.text ?? "")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 90);
  return snippet ? `${keyword} — ${snippet}` : keyword;
}

async function searchKeyword(
  keyword: string,
  maxResults: number,
  auth: XAuth,
): Promise<TrendPost[]> {
  const query = `${keyword} -is:retweet -is:reply lang:en`;
  const params = new URLSearchParams({
    query,
    max_results: String(Math.min(100, Math.max(10, maxResults))),
    "tweet.fields": "public_metrics,created_at,author_id",
    expansions: "author_id",
    "user.fields": "username",
  });

  let url: string;
  const headers: Record<string, string> = {};
  if (auth.mode === "token") {
    url = `${X_API_URL}/2/tweets/search/recent?${params.toString()}`;
    headers.Authorization = `Bearer ${auth.token}`;
  } else {
    const lovableKey = process.env.LOVABLE_API_KEY;
    const connectionKey = process.env.X_API_KEY;
    if (!lovableKey || !connectionKey) throw new XNotConnectedError();
    url = `${GATEWAY_URL}/2/tweets/search/recent?${params.toString()}`;
    headers.Authorization = `Bearer ${lovableKey}`;
    headers["X-Connection-Api-Key"] = connectionKey;
  }

  const response = await fetch(url, { method: "GET", headers });

  if (!response.ok) {
    const body = await response.text();
    if (response.status === 429) {
      const retry = response.headers.get("Retry-After");
      throw new Error(
        `X rate limit reached${retry ? ` — retry in ${retry}s` : ""}. Try fewer keywords.`,
      );
    }
    if ((response.status === 401 || response.status === 403) && auth.mode === "token") {
      if (auth.creatorId) {
        const { markWriterXInvalid } = await import("./x-credentials.server");
        await markWriterXInvalid(auth.creatorId);
      }
      throw new XNotConnectedError(
        "Your X token was rejected. Reconnect your X access in Agents → Your X access.",
      );
    }
    throw new Error(`X request failed [${response.status}]: ${body.slice(0, 500)}`);
  }


  const payload = (await response.json()) as {
    data?: XPost[];
    includes?: { users?: XUser[] };
  };

  const users = new Map((payload.includes?.users ?? []).map((u) => [u.id, u.username]));

  return (payload.data ?? []).map((post) => {
    const m = post.public_metrics ?? {};
    const likes = m.like_count ?? 0;
    const reposts = (m.retweet_count ?? 0) + (m.quote_count ?? 0);
    const replies = m.reply_count ?? 0;
    const author = post.author_id ? (users.get(post.author_id) ?? "unknown") : "unknown";
    return {
      id: post.id,
      text: post.text,
      author,
      url: `https://x.com/${author}/status/${post.id}`,
      likes,
      reposts,
      replies,
      engagement: likes + reposts * 2 + replies,
      createdAt: post.created_at ?? null,
    };
  });
}

/**
 * Fetch trending posts for a set of keywords and group them into candidate trends.
 * Stops after repeated provider failures instead of hammering the API.
 */
export async function fetchTrends(opts: {
  keywords: string[];
  minEngagement?: number;
  postsPerTrend?: number;
}): Promise<{ trends: Trend[]; errors: string[] }> {
  const keywords = opts.keywords
    .map((k) => k.trim())
    .filter(Boolean)
    .slice(0, 5);
  if (keywords.length === 0) return { trends: [], errors: ["No keywords provided."] };

  const trends: Trend[] = [];
  const errors: string[] = [];
  let consecutiveFailures = 0;

  for (const keyword of keywords) {
    if (consecutiveFailures >= 2) {
      errors.push("Stopped early after repeated X errors.");
      break;
    }
    try {
      const posts = (await searchKeyword(keyword, 25))
        .filter((p) => p.engagement >= (opts.minEngagement ?? 0))
        .sort((a, b) => b.engagement - a.engagement)
        .slice(0, opts.postsPerTrend ?? 6);

      consecutiveFailures = 0;
      if (posts.length === 0) continue;

      trends.push({
        key: trendKey(
          keyword,
          posts.map((p) => p.id),
        ),
        keyword,
        label: trendLabel(keyword, posts[0]),
        engagement: posts.reduce((sum, p) => sum + p.engagement, 0),
        posts,
      });
    } catch (e) {
      consecutiveFailures += 1;
      if (e instanceof XNotConnectedError) throw e;
      errors.push(e instanceof Error ? e.message : "Unknown X error");
    }
  }

  trends.sort((a, b) => b.engagement - a.engagement);
  return { trends, errors };
}

/** Prompt material describing a trend, for the story generator. */
export function trendBriefing(trend: Trend) {
  const lines = trend.posts.map(
    (p) =>
      `- @${p.author} (${p.likes} likes, ${p.reposts} reposts): ${p.text.replace(/\s+/g, " ").trim()} [${p.url}]`,
  );
  return [
    `These are the highest-engagement recent public posts on X about "${trend.keyword}":`,
    ...lines,
  ].join("\n");
}

/** Markdown "Sources" section appended to generated stories. */
export function trendSourcesMarkdown(trend: Trend) {
  const items = trend.posts.map((p) => `- [@${p.author} on X](${p.url})`).join("\n");
  return `\n\n## Sources\n\nBased on public posts on X:\n\n${items}\n`;
}
