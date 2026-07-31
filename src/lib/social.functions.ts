import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/backend/auth-middleware";

const storyInput = (input: unknown) => z.object({ storyId: z.string().uuid() }).parse(input);

/** Public like count for a story (safe for signed-out readers). */
export const getStoryLikeCount = createServerFn({ method: "GET" })
  .inputValidator(storyInput)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/backend/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count } = await (supabaseAdmin as any)
      .from("story_likes")
      .select("id", { count: "exact", head: true })
      .eq("story_id", data.storyId);
    return { likeCount: count ?? 0 };
  });

/** Signed-in reader's like/flag state for a story. */
export const getMyStorySocial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(storyInput)
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    const [{ data: like }, { data: flag }, { count }] = await Promise.all([
      sb
        .from("story_likes")
        .select("id")
        .eq("story_id", data.storyId)
        .eq("user_id", context.userId)
        .maybeSingle(),
      sb
        .from("story_flags")
        .select("id")
        .eq("story_id", data.storyId)
        .eq("reporter_id", context.userId)
        .maybeSingle(),
      sb.from("story_likes").select("id", { count: "exact", head: true }).eq("story_id", data.storyId),
    ]);
    return { liked: !!like, flagged: !!flag, likeCount: count ?? 0 };
  });

/** Toggle a like and keep stories.like_count in sync. */
export const toggleStoryLike = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(storyInput)
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    const { data: existing } = await sb
      .from("story_likes")
      .select("id")
      .eq("story_id", data.storyId)
      .eq("user_id", context.userId)
      .maybeSingle();

    if (existing) {
      const { error } = await sb.from("story_likes").delete().eq("id", existing.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await sb
        .from("story_likes")
        .insert({ story_id: data.storyId, user_id: context.userId });
      if (error) throw new Error(error.message);
    }

    const { supabaseAdmin } = await import("@/integrations/backend/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = supabaseAdmin as any;
    const { count } = await admin
      .from("story_likes")
      .select("id", { count: "exact", head: true })
      .eq("story_id", data.storyId);
    await admin.from("stories").update({ like_count: count ?? 0 }).eq("id", data.storyId);

    return { liked: !existing, likeCount: count ?? 0 };
  });

/** Report a story. A DB trigger notifies admins once the threshold is hit. */
export const flagStory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({ storyId: z.string().uuid(), reason: z.string().trim().max(500).default("") })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    const { error } = await sb
      .from("story_flags")
      .insert({ story_id: data.storyId, reporter_id: context.userId, reason: data.reason });
    if (error) {
      if (error.code === "23505" || /duplicate key/i.test(error.message)) {
        return { ok: true, alreadyFlagged: true };
      }
      throw new Error(error.message);
    }
    return { ok: true };
  });
