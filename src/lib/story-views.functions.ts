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
    const { supabaseAdmin } = await import("@/integrations/backend/client.server");
    const { error: incrementError } = await supabaseAdmin.rpc("increment_story_view", {
      _story_id: data.storyId,
      _session_key: data.sessionKey,
    });
    if (incrementError) {
      console.error("Failed to record story view", {
        storyId: data.storyId,
        code: incrementError.code,
        message: incrementError.message,
      });
      throw new Error("Unable to record this story view");
    }

    const { data: story, error: storyError } = await supabaseAdmin
      .from("stories")
      .select("view_count")
      .eq("id", data.storyId)
      .eq("published", true)
      .maybeSingle();
    if (storyError) {
      console.error("Failed to read updated story view count", {
        storyId: data.storyId,
        code: storyError.code,
        message: storyError.message,
      });
      throw new Error("Unable to read the updated story view count");
    }
    return { viewCount: story?.view_count ?? null };
  });
