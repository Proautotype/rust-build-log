import { generateStory, slugify } from "./agent.server";

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
    if (!agent.topic?.trim()) throw new Error("This agent has no topic configured.");

    const generated = await generateStory({
      topic: agent.topic,
      tone: agent.tone,
      category: agent.category,
    });

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
    });

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabaseAdmin as any)
      .from("creator_agents")
      .update({ last_run_at: new Date().toISOString() })
      .eq("id", agent.id);

    await logRun({
      creator_id: agent.creator_id,
      agent_id: agent.id,
      source,
      status: "ok",
      story_id: story?.id ?? null,
      message: story ? `${agent.auto_publish ? "Published" : "Drafted"} "${story.title}"` : null,
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
