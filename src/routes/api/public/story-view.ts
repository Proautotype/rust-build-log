import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const bodySchema = z.object({
  storyId: z.string().uuid(),
  sessionKey: z.string().min(6).max(100).optional(),
});

/**
 * Public view counter. Lives under /api/public so signed-out readers (and
 * gated deployments, where authenticated-only RPC paths are blocked) can
 * always record a view. Only ever increments a published story's counter.
 */
export const Route = createFileRoute("/api/public/story-view")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let parsed;
        try {
          parsed = bodySchema.parse(await request.json());
        } catch {
          return Response.json({ error: "Invalid request" }, { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error: incrementError } = await supabaseAdmin.rpc("increment_story_view", {
          _story_id: parsed.storyId,
          _session_key: parsed.sessionKey,
        });
        if (incrementError) {
          console.error("Failed to record story view", {
            storyId: parsed.storyId,
            code: incrementError.code,
            message: incrementError.message,
          });
          return Response.json({ error: "Unable to record this story view" }, { status: 500 });
        }

        const { data: story } = await supabaseAdmin
          .from("stories")
          .select("view_count")
          .eq("id", parsed.storyId)
          .eq("published", true)
          .maybeSingle();

        return Response.json({ viewCount: story?.view_count ?? null });
      },
    },
  },
});
