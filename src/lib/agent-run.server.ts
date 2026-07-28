import { generateStory, slugify } from "./agent.server";
import { TOPICS } from "@/data/topics";

export interface AgentRow {
  id: string;
  creator_id: string;
  name: string;
  enabled: boolean;
  topic: string;
  tone: string;
  cadence: string;
  auto_publish: boolean;
  journey_id: string | null;
  category: string;
  monetization: "free" | "tips" | "locked";
  unlock_price: number;
  tip_enabled: boolean;
  last_run_at: string | null;
  source_mode?: string | null;
  x_keywords?: string[] | null;
  use_reader_interests?: boolean | null;
  min_engagement?: number | null;
}

/** Keywords an agent should search X with: its own list, plus reader interests when asked. */
export function agentKeywords(agent: AgentRow): string[] {
  const own = (agent.x_keywords ?? []).map((k) => k.trim()).filter(Boolean);
  const interests = agent.use_reader_interests ? TOPICS.map((t) => t.label) : [];
  const merged = [...own, ...interests];
  const seen = new Set<string>();
  return merged.filter((k) => {
    const key = k.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export interface PostStoryInput {
  creatorId: string;
  agentId?: string | null;
  title: string;
  slug?: string;
  shortDescription?: string;
  markdown?: string;
  content?: unknown[];
  cover?: string;
  tags?: string[];
  category?: string;
  readingMinutes?: number;
  published?: boolean;
  journeyId?: string | null;
  monetization?: "free" | "tips" | "locked";
  unlockPrice?: number;
  tipEnabled?: boolean;
  xTrendKeyword?: string | null;
  xSourceUrls?: string[];
}


// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function uniqueSlug(supabaseAdmin: any, base: string): Promise<string> {
  let slug = base;
  for (let i = 0; i < 8; i++) {
    const { data } = await supabaseAdmin.from("stories").select("id").eq("slug", slug).maybeSingle();
    if (!data) return slug;
    slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
  }
  return `${base}-${Date.now().toString(36)}`;
}

/** Insert a story on behalf of a creator. Caller MUST have verified the creator. */
export async function postStoryAsCreator(input: PostStoryInput) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const content =
    input.content && input.content.length > 0
      ? input.content
      : [{ type: "markdown", markdown: input.markdown ?? "" }];

  const slug = await uniqueSlug(supabaseAdmin, slugify(input.slug || input.title));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabaseAdmin as any)
    .from("stories")
    .insert({
      creator_id: input.creatorId,
      title: input.title,
      slug,
      short_description: input.shortDescription ?? "",
      cover: input.cover ?? "",
      category: input.category ?? "Fundamentals",
      difficulty: null,
      reading_minutes: input.readingMinutes ?? 5,
      tags: input.tags ?? [],
      content,
      published: input.published ?? false,
      journey_id: input.journeyId ?? null,
      monetization: input.monetization ?? "free",
      unlock_price: input.unlockPrice ?? 0,
      tip_enabled: input.tipEnabled ?? false,
      ai_generated: true,
      x_trend_keyword: input.xTrendKeyword ?? null,
      x_source_urls: input.xSourceUrls ?? [],

    })
    .select("id, title, slug, published")
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as { id: string; title: string; slug: string; published: boolean } | null;
}

async function logRun(entry: {
  creator_id: string;
  agent_id?: string | null;
  source: string;
  status: string;
  story_id?: string | null;
  message?: string | null;
}) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabaseAdmin as any).from("agent_runs").insert(entry);
}

/** Generate + post one story for an agent. */
export async function runAgent(agent: AgentRow, source: "schedule" | "manual") {
  try {
    const useX = (agent.source_mode ?? "topic") === "x_trends";

    let generated: Awaited<ReturnType<typeof generateStory>>;
    let usedTrend: import("./x-trends.server").Trend | null = null;

    if (useX) {
      const { fetchTrends, trendBriefing, trendSourcesMarkdown } = await import("./x-trends.server");
      const keywords = agentKeywords(agent);
      if (keywords.length === 0) throw new Error("This agent has no X keywords configured.");

      const { trends, errors } = await fetchTrends({
        keywords,
        minEngagement: agent.min_engagement ?? 0,
      });
      if (trends.length === 0) {
        throw new Error(errors[0] ?? "No trending posts matched this agent's keywords.");
      }

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: used } = await (supabaseAdmin as any)
        .from("agent_trend_sources")
        .select("trend_key")
        .eq("creator_id", agent.creator_id);
      const usedKeys = new Set(((used ?? []) as { trend_key: string }[]).map((r) => r.trend_key));

      usedTrend = trends.find((t) => !usedKeys.has(t.key)) ?? null;
      if (!usedTrend) throw new Error("All current trends have already been covered.");

      generated = await generateStory({
        topic: `What is trending on X about "${usedTrend.keyword}"`,
        tone: agent.tone,
        category: agent.category,
        extraInstructions: [
          trendBriefing(usedTrend),
          ``,
          `Write an ORIGINAL article explaining the trend, why it matters and what readers should take from it.`,
          `Do not copy post text verbatim; paraphrase and attribute by @handle where you reference someone.`,
        ].join("\n"),
      });
      generated = { ...generated, markdown: generated.markdown + trendSourcesMarkdown(usedTrend) };
    } else {
      if (!agent.topic?.trim()) throw new Error("This agent has no topic configured.");
      generated = await generateStory({
        topic: agent.topic,
        tone: agent.tone,
        category: agent.category,
      });
    }

    const story = await postStoryAsCreator({
      creatorId: agent.creator_id,
      agentId: agent.id,
      title: generated.title,
      slug: generated.slug,
      shortDescription: generated.shortDescription,
      markdown: generated.markdown,
      tags: generated.tags,
      category: agent.category,
      readingMinutes: generated.readingMinutes,
      published: agent.auto_publish,
      journeyId: agent.journey_id,
      monetization: agent.monetization,
      unlockPrice: agent.unlock_price,
      tipEnabled: agent.tip_enabled,
      xTrendKeyword: usedTrend?.keyword ?? null,
      xSourceUrls: usedTrend ? usedTrend.posts.map((p) => p.url) : [],

    });

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabaseAdmin as any)
      .from("creator_agents")
      .update({ last_run_at: new Date().toISOString() })
      .eq("id", agent.id);

    if (usedTrend) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabaseAdmin as any).from("agent_trend_sources").insert({
        creator_id: agent.creator_id,
        agent_id: agent.id,
        story_id: story?.id ?? null,
        trend_key: usedTrend.key,
        label: usedTrend.label.slice(0, 200),
        source_urls: usedTrend.posts.map((p) => p.url),
      });
    }

    await logRun({
      creator_id: agent.creator_id,
      agent_id: agent.id,
      source,
      status: "ok",
      story_id: story?.id ?? null,
      message: story
        ? `${agent.auto_publish ? "Published" : "Drafted"} "${story.title}"${usedTrend ? ` from X trend "${usedTrend.keyword}"` : ""}`
        : null,
    });

    return { ok: true as const, story };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    await logRun({
      creator_id: agent.creator_id,
      agent_id: agent.id,
      source,
      status: "error",
      message,
    });
    return { ok: false as const, error: message };
  }
}

function isDue(agent: AgentRow) {
  if (!agent.last_run_at) return true;
  const last = new Date(agent.last_run_at).getTime();
  const hours: Record<string, number> = { daily: 24, weekly: 24 * 7, monthly: 24 * 30 };
  return Date.now() - last >= (hours[agent.cadence] ?? 24 * 7) * 3600 * 1000;
}

/** Run every enabled agent that is due. Used by the scheduled endpoint. */
export async function runDueAgents() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabaseAdmin as any)
    .from("creator_agents")
    .select("*")
    .eq("enabled", true);
  if (error) throw new Error(error.message);

  const due = ((data ?? []) as AgentRow[]).filter(isDue);
  const results: unknown[] = [];
  for (const agent of due) {
    results.push({ agent: agent.id, ...(await runAgent(agent, "schedule")) });
  }
  return { checked: data?.length ?? 0, ran: results.length, results };
}
