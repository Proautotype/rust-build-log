import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Records a story view. The underlying SECURITY DEFINER SQL function is no
 * longer executable by anon/authenticated roles, so counting happens here on
 * the server with the service role.
 */
export const recordStoryView = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        storyId: z.string().uuid(),
        sessionKey: z.string().min(6).max(100).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.rpc("increment_story_view", {
      _story_id: data.storyId,
      _session_key: data.sessionKey ?? null,
    });
    const { data: story } = await supabaseAdmin
      .from("stories")
      .select("view_count")
      .eq("id", data.storyId)
      .eq("published", true)
      .maybeSingle();
    return { viewCount: story?.view_count ?? null };
  });
