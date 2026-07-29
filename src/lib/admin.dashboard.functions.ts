import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertRole } from "@/lib/roles";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function assertStaff(context: { supabase: any; userId: string }) {
  await assertRole(context.supabase, context.userId, ["admin", "manager"]);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function assertAdmin(context: { supabase: any; userId: string }) {
  await assertRole(context.supabase, context.userId, ["admin"]);
}


export const getAdminMetrics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [users, stories, publishedStories, journeys, comments, pending, coinsAgg, unlocks] =
      await Promise.all([
        context.supabase.from("profiles").select("id", { count: "exact", head: true }),
        context.supabase.from("stories").select("id", { count: "exact", head: true }),
        context.supabase
          .from("stories")
          .select("id", { count: "exact", head: true })
          .eq("published", true),
        context.supabase.from("journeys").select("id", { count: "exact", head: true }),
        context.supabase.from("comments").select("id", { count: "exact", head: true }),
        context.supabase
          .from("writer_requests")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending"),
        supabaseAdmin.from("profiles").select("coin_balance"),
        context.supabase.from("story_unlocks").select("id", { count: "exact", head: true }),
      ]);


    const coinsInCirculation = (coinsAgg.data ?? []).reduce(
      (a: number, r: { coin_balance: number }) => a + (r.coin_balance ?? 0),
      0,
    );

    return {
      users: users.count ?? 0,
      stories: stories.count ?? 0,
      publishedStories: publishedStories.count ?? 0,
      journeys: journeys.count ?? 0,
      comments: comments.count ?? 0,
      pendingRequests: pending.count ?? 0,
      coinsInCirculation,
      unlocks: unlocks.count ?? 0,
    };
  });

export const listUsersForAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ search: z.string().optional() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("profiles")
      .select("id, display_name, avatar_url, bio, is_pro, coin_balance, banned, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (data.search && data.search.trim()) {
      q = q.ilike("display_name", `%${data.search.trim()}%`);
    }
    const { data: profiles, error } = await q;
    if (error) throw new Error(error.message);

    const ids = (profiles ?? []).map((p) => p.id);
    let roleMap: Record<string, string[]> = {};
    if (ids.length) {
      const { data: rs } = await context.supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", ids);
      roleMap = (rs ?? []).reduce<Record<string, string[]>>((acc, r) => {
        (acc[r.user_id] ??= []).push(r.role);
        return acc;
      }, {});
    }
    return (profiles ?? []).map((p) => ({ ...p, roles: roleMap[p.id] ?? [] }));
  });

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        userId: z.string().uuid(),
        role: z.enum(["reader", "writer", "manager", "admin"]),
        grant: z.boolean(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.grant) {
      await context.supabase
        .from("user_roles")
        .insert({ user_id: data.userId, role: data.role });
    } else {
      await context.supabase
        .from("user_roles")
        .delete()
        .eq("user_id", data.userId)
        .eq("role", data.role);
    }
    return { ok: true };
  });

export const setUserBanned = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ userId: z.string().uuid(), banned: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("profiles")
      .update({ banned: data.banned })
      .eq("id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adjustUserCoins = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        userId: z.string().uuid(),
        delta: z.number().int().min(-100000).max(100000),
        note: z.string().max(200).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: p } = await context.supabase
      .from("profiles")
      .select("coin_balance")
      .eq("id", data.userId)
      .maybeSingle();
    const next = Math.max(0, (p?.coin_balance ?? 0) + data.delta);
    await context.supabase.from("profiles").update({ coin_balance: next }).eq("id", data.userId);
    await context.supabase.from("coin_transactions").insert({
      user_id: data.userId,
      amount: data.delta,
      kind: "admin_adjust",
      counterparty_id: context.userId,
      note: data.note ?? "Admin adjustment",
    });
    return { balance: next };
  });

export const listAllStoriesForAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const { data, error } = await context.supabase
      .from("stories")
      .select(
        "id, title, slug, published, monetization, unlock_price, tip_enabled, creator_id, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminDeleteStory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { error } = await context.supabase.from("stories").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listCoinLedger = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const { data, error } = await context.supabase
      .from("coin_transactions")
      .select("id, user_id, amount, kind, story_id, counterparty_id, note, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listAllCommentsForAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const { data, error } = await context.supabase
      .from("comments")
      .select("id, story_slug, user_id, body, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminDeleteComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { error } = await context.supabase.from("comments").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
