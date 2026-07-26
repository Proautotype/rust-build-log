import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const bodySchema = z.object({
  title: z.string().min(3).max(200),
  markdown: z.string().max(200000).optional(),
  content: z.array(z.unknown()).optional(),
  slug: z.string().max(120).optional(),
  summary: z.string().max(500).optional(),
  cover: z.string().url().optional(),
  tags: z.array(z.string().max(40)).max(10).optional(),
  category: z.string().max(80).optional(),
  reading_minutes: z.number().int().min(1).max(120).optional(),
  publish: z.boolean().optional(),
  journey_id: z.string().uuid().nullable().optional(),
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * External AI agent endpoint.
 * POST with `Authorization: Bearer r2r_...` (a key created in /agents)
 * to publish a story on behalf of that creator.
 */
export const Route = createFileRoute("/api/public/agents/post")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
        if (!token) return json({ error: "Missing API key" }, 401);

        const { hashApiKey } = await import("@/lib/agent-keys.server");
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const keyHash = await hashApiKey(token);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: keyRow } = await (supabaseAdmin as any)
          .from("agent_api_keys")
          .select("id, creator_id, revoked")
          .eq("key_hash", keyHash)
          .maybeSingle();

        if (!keyRow || keyRow.revoked) return json({ error: "Invalid API key" }, 401);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: role } = await (supabaseAdmin as any)
          .from("user_roles")
          .select("role")
          .eq("user_id", keyRow.creator_id)
          .in("role", ["writer", "admin"])
          .maybeSingle();
        if (!role) return json({ error: "Creator is not a writer" }, 403);

        let parsed;
        try {
          parsed = bodySchema.parse(await request.json());
        } catch (e) {
          return json({ error: "Invalid body", details: String(e) }, 400);
        }
        if (!parsed.markdown && !parsed.content?.length) {
          return json({ error: "Provide `markdown` or `content`" }, 400);
        }

        const { postStoryAsCreator } = await import("@/lib/agent-run.server");
        try {
          const story = await postStoryAsCreator({
            creatorId: keyRow.creator_id,
            title: parsed.title,
            slug: parsed.slug,
            shortDescription: parsed.summary,
            markdown: parsed.markdown,
            content: parsed.content,
            cover: parsed.cover,
            tags: parsed.tags,
            category: parsed.category,
            readingMinutes: parsed.reading_minutes,
            published: parsed.publish ?? false,
            journeyId: parsed.journey_id ?? null,
          });

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabaseAdmin as any)
            .from("agent_api_keys")
            .update({ last_used_at: new Date().toISOString() })
            .eq("id", keyRow.id);

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabaseAdmin as any).from("agent_runs").insert({
            creator_id: keyRow.creator_id,
            source: "api",
            status: "ok",
            story_id: story?.id ?? null,
            message: story ? `API posted "${story.title}"` : null,
          });

          return json({ ok: true, story });
        } catch (e) {
          const message = e instanceof Error ? e.message : "Unknown error";
          return json({ error: message }, 500);
        }
      },
    },
  },
});
