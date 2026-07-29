import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertRole } from "@/lib/roles";

export const getMyWriterRequest = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("writer_requests")
      .select("*")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

export const submitWriterRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ message: z.string().max(2000).optional() }).parse(input))
  .handler(async ({ data, context }) => {
    // Delete any existing rejected request so the user can retry.
    await context.supabase
      .from("writer_requests")
      .delete()
      .eq("user_id", context.userId)
      .eq("status", "rejected");

    const { data: row, error } = await context.supabase
      .from("writer_requests")
      .insert({
        user_id: context.userId,
        message: data.message ?? null,
        status: "pending",
      })
      .select()
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const cancelMyWriterRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("writer_requests")
      .delete()
      .eq("user_id", context.userId)
      .eq("status", "pending");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Admin
export const listWriterRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertRole(context.supabase, context.userId, ["admin", "manager"]);
    const { data, error } = await context.supabase
      .from("writer_requests")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    // Fetch profiles separately
    const ids = Array.from(new Set((data ?? []).map((r) => r.user_id)));
    let profileMap: Record<string, { display_name: string | null; avatar_url: string | null }> = {};
    if (ids.length > 0) {
      const { data: profs } = await context.supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", ids);
      profileMap = Object.fromEntries(
        (profs ?? []).map((p) => [p.id, { display_name: p.display_name, avatar_url: p.avatar_url }]),
      );
    }
    return (data ?? []).map((r) => ({ ...r, profile: profileMap[r.user_id] ?? null }));
  });

export const reviewWriterRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({ id: z.string().uuid(), decision: z.enum(["approved", "rejected"]) })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertRole(context.supabase, context.userId, ["admin", "manager"]);
    const { data: row, error } = await context.supabase
      .from("writer_requests")
      .update({ status: data.decision })
      .eq("id", data.id)
      .select()
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        display_name: z.string().min(1).max(80),
        bio: z.string().max(1000).nullable().optional(),
        avatar_url: z.string().url().nullable().optional().or(z.literal("")),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const payload = {
      display_name: data.display_name,
      bio: data.bio ?? null,
      avatar_url: data.avatar_url ? data.avatar_url : null,
    };
    const { data: row, error } = await context.supabase
      .from("profiles")
      .update(payload)
      .eq("id", context.userId)
      .select()
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });
