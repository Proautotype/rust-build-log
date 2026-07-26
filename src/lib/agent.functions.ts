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
