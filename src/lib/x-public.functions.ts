import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export interface HomeTrend {
  key: string;
  keyword: string;
  label: string;
  engagement: number;
  topPostUrl: string | null;
  posts: { author: string; url: string; likes: number }[];
}

export interface HomeTrendStory {
  slug: string;
  title: string;
  short_description: string | null;
  cover: string | null;
  x_trend_keyword: string | null;
}

let cache: { at: number; trends: HomeTrend[] } | null = null;
const CACHE_MS = 15 * 60 * 1000;

function publicClient() {
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient<Database>(process.env.SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

/**
 * Public "Trending on X" feed for the landing page: the R2R stories writers
 * published from X trends, plus live trends for the keywords writers opted in
 * to showing on the home page. Degrades to empty when X is not connected.
 */
export const getHomeXTrends = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = publicClient();
  const { data: storyRows } = await supabase
    .from("stories")
    .select("slug, title, short_description, cover, x_trend_keyword")
    .eq("published", true)
    .not("x_trend_keyword", "is", null)
    .order("created_at", { ascending: false })
    .limit(12);

  const stories = (storyRows ?? []) as HomeTrendStory[];

  const { isHouseXConnected, fetchTrends, resolveXAuthForCreator } = await import(
    "./x-trends.server"
  );

  if (cache && Date.now() - cache.at < CACHE_MS) {
    return { connected: true as const, trends: cache.trends, stories };
  }

  // Writers who opted into showing their keywords publicly.
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: settings } = await (supabaseAdmin as any)
    .from("writer_x_settings")
    .select("creator_id, keywords")
    .eq("enabled", true)
    .eq("show_on_home", true);

  const rows = (settings ?? []) as { creator_id: string; keywords: string[] | null }[];
  const keywords = Array.from(
    new Set(
      rows
        .flatMap((s) => s.keywords ?? [])
        .map((k) => k.trim())
        .filter(Boolean)
        .map((k) => k.toLowerCase()),
    ),
  ).slice(0, 4);

  // Use the house connection when one exists, otherwise borrow the token of an
  // opted-in writer so the public row still has a source.
  let auth: import("./x-trends.server").XAuth | null = isHouseXConnected()
    ? { mode: "gateway" }
    : null;
  if (!auth) {
    for (const row of rows) {
      const resolved = await resolveXAuthForCreator(row.creator_id);
      if (resolved) {
        auth = resolved;
        break;
      }
    }
  }


  if (!auth) {
    return { connected: false as const, trends: [] as HomeTrend[], stories };
  }
  if (keywords.length === 0) {
    return { connected: true as const, trends: [] as HomeTrend[], stories };
  }

  try {
    const { trends } = await fetchTrends({
      keywords,
      minEngagement: 0,
      postsPerTrend: 4,
      auth,
    });

    const mapped: HomeTrend[] = trends.slice(0, 8).map((t) => ({
      key: t.key,
      keyword: t.keyword,
      label: t.label,
      engagement: t.engagement,
      topPostUrl: t.posts[0]?.url ?? null,
      posts: t.posts.map((p) => ({ author: p.author, url: p.url, likes: p.likes })),
    }));
    cache = { at: Date.now(), trends: mapped };
    return { connected: true as const, trends: mapped, stories };
  } catch {
    return { connected: true as const, trends: [] as HomeTrend[], stories };
  }
});
