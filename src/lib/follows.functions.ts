import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/backend/auth-middleware";

const writerInput = (input: unknown) => z.object({ writerId: z.string().uuid() }).parse(input);

/** Public follower count for a writer. */
export const getWriterFollowerCount = createServerFn({ method: "GET" })
  .inputValidator(writerInput)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/backend/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count } = await (supabaseAdmin as any)
      .from("writer_follows")
      .select("id", { count: "exact", head: true })
      .eq("writer_id", data.writerId);
    return { followers: count ?? 0 };
  });

/** Signed-in reader's follow state for a writer. */
export const getMyFollowState = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(writerInput)
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    const [{ data: row }, { count }] = await Promise.all([
      sb
        .from("writer_follows")
        .select("id")
        .eq("writer_id", data.writerId)
        .eq("follower_id", context.userId)
        .maybeSingle(),
      sb
        .from("writer_follows")
        .select("id", { count: "exact", head: true })
        .eq("writer_id", data.writerId),
    ]);
    return { following: !!row, followers: count ?? 0, isSelf: context.userId === data.writerId };
  });

/** Follow / unfollow a writer. */
export const toggleFollowWriter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(writerInput)
  .handler(async ({ data, context }) => {
    if (context.userId === data.writerId) throw new Error("You cannot follow yourself.");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    const { data: existing } = await sb
      .from("writer_follows")
      .select("id")
      .eq("writer_id", data.writerId)
      .eq("follower_id", context.userId)
      .maybeSingle();

    if (existing) {
      const { error } = await sb.from("writer_follows").delete().eq("id", existing.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await sb
        .from("writer_follows")
        .insert({ writer_id: data.writerId, follower_id: context.userId });
      if (error) throw new Error(error.message);
    }

    const { count } = await sb
      .from("writer_follows")
      .select("id", { count: "exact", head: true })
      .eq("writer_id", data.writerId);
    return { following: !existing, followers: count ?? 0 };
  });
