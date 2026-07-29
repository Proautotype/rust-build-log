import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface AgentDraft {
  title: string;
  slug: string;
  shortDescription: string;
  tags: string[];
  readingMinutes: number;
  markdown: string;
}

/* ------------------------------------------------------------------ */
/*  Studio assistant                                                   */
/* ------------------------------------------------------------------ */

export const draftStoryWithAi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        topic: z.string().min(3).max(500),
        tone: z.string().max(120).optional(),
        category: z.string().max(80).optional(),
        extraInstructions: z.string().max(1000).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<AgentDraft> => {
    const { generateStory } = await import("./agent.server");
    return generateStory(data);
  });

/* ------------------------------------------------------------------ */
/*  X trends                                                           */
/* ------------------------------------------------------------------ */

export const fetchXTrends = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        keywords: z.array(z.string().max(80)).max(5),
        useReaderInterests: z.boolean().optional(),
        minEngagement: z.number().int().min(0).max(1000000).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { fetchTrends, resolveXAuthForCreator } = await import("./x-trends.server");
    const auth = await resolveXAuthForCreator(context.userId);
    if (!auth) {
      return { connected: false as const, trends: [], errors: [] as string[] };
    }
    const { TOPICS } = await import("@/data/topics");
    const keywords = [
      ...data.keywords.map((k) => k.trim()).filter(Boolean),
      ...(data.useReaderInterests ? TOPICS.map((t) => t.label) : []),
    ].slice(0, 5);

    try {
      const { trends, errors } = await fetchTrends({
        keywords,
        minEngagement: data.minEngagement ?? 0,
        auth,
      });
      return { connected: true as const, trends, errors };
    } catch (e) {
      return {
        connected: false as const,
        trends: [],
        errors: [e instanceof Error ? e.message : "Unknown X error"],
      };
    }
  });


/** Draft a story from one selected X trend, with a sources section appended. */
export const draftStoryFromTrend = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        keyword: z.string().min(1).max(80),
        tone: z.string().max(120).optional(),
        category: z.string().max(80).optional(),
        posts: z
          .array(
            z.object({
              author: z.string().max(80),
              text: z.string().max(2000),
              url: z.string().max(300),
              likes: z.number().int().min(0),
              reposts: z.number().int().min(0),
            }),
          )
          .max(10),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<AgentDraft> => {
    const { generateStory } = await import("./agent.server");
    const briefing = data.posts
      .map(
        (p) =>
          `- @${p.author} (${p.likes} likes, ${p.reposts} reposts): ${p.text.replace(/\s+/g, " ").trim()} [${p.url}]`,
      )
      .join("\n");

    const draft = await generateStory({
      topic: `What is trending on X about "${data.keyword}"`,
      tone: data.tone,
      category: data.category,
      extraInstructions: [
        `These are the highest-engagement recent public posts on X about "${data.keyword}":`,
        briefing,
        ``,
        `Write an ORIGINAL article explaining the trend, why it matters and what readers should take from it.`,
        `Do not copy post text verbatim; paraphrase and attribute by @handle where you reference someone.`,
      ].join("\n"),
    });

    const sources = data.posts.map((p) => `- [@${p.author} on X](${p.url})`).join("\n");
    return {
      ...draft,
      markdown: `${draft.markdown}\n\n## Sources\n\nBased on public posts on X:\n\n${sources}\n`,
    };
  });

/* ------------------------------------------------------------------ */
/*  Agent configuration                                                */
/* ------------------------------------------------------------------ */

const agentInput = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(80),
  enabled: z.boolean(),
  topic: z.string().max(500),
  tone: z.string().max(120),
  cadence: z.enum(["daily", "weekly", "monthly"]),
  auto_publish: z.boolean(),
  journey_id: z.string().uuid().nullable(),
  category: z.string().max(80),
  monetization: z.enum(["free", "tips", "locked"]),
  unlock_price: z.number().int().min(0).max(100000),
  tip_enabled: z.boolean(),
  source_mode: z.enum(["topic", "x_trends"]).default("topic"),
  x_keywords: z.array(z.string().max(80)).max(5).default([]),
  use_reader_interests: z.boolean().default(false),
  min_engagement: z.number().int().min(0).max(1000000).default(0),
});

export const listMyAgents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("creator_agents")
      .select("*")
      .eq("creator_id", context.userId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const saveAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => agentInput.parse(input))
  .handler(async ({ data, context }) => {
    const payload = { ...data, creator_id: context.userId };
    if (data.id) {
      const { data: row, error } = await context.supabase
        .from("creator_agents")
        .update(payload)
        .eq("id", data.id)
        .eq("creator_id", context.userId)
        .select()
        .maybeSingle();
      if (error) throw new Error(error.message);
      return row;
    }
    const { id: _omit, ...insert } = payload;
    const { data: row, error } = await context.supabase
      .from("creator_agents")
      .insert(insert)
      .select()
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("creator_agents")
      .delete()
      .eq("id", data.id)
      .eq("creator_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const runAgentNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: agent, error } = await context.supabase
      .from("creator_agents")
      .select("*")
      .eq("id", data.id)
      .eq("creator_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!agent) throw new Error("Agent not found.");

    const { runAgent } = await import("./agent-run.server");
    return runAgent(agent, "manual");
  });

export const listAgentRuns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("agent_runs")
      .select("*")
      .eq("creator_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(25);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

/* ------------------------------------------------------------------ */
/*  API keys                                                           */
/* ------------------------------------------------------------------ */

export const listMyApiKeys = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("agent_api_keys")
      .select("id, label, key_prefix, revoked, last_used_at, created_at")
      .eq("creator_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ label: z.string().min(1).max(80) }).parse(input))
  .handler(async ({ data, context }) => {
    const { generateApiKey, hashApiKey, keyPreview } = await import("./agent-keys.server");
    const key = generateApiKey();
    const { error } = await context.supabase.from("agent_api_keys").insert({
      creator_id: context.userId,
      label: data.label,
      key_prefix: keyPreview(key),
      key_hash: await hashApiKey(key),
    });
    if (error) throw new Error(error.message);
    // Returned once — never stored in plaintext.
    return { key };
  });

export const revokeApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("agent_api_keys")
      .update({ revoked: true })
      .eq("id", data.id)
      .eq("creator_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
