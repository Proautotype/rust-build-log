import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/backend/auth-middleware";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function addCoins(supabase: any, userId: string, delta: number) {
  const { data: p, error } = await supabase
    .from("profiles")
    .select("coin_balance")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const next = Math.max(0, (p?.coin_balance ?? 0) + delta);
  const { error: uerr } = await supabase
    .from("profiles")
    .update({ coin_balance: next })
    .eq("id", userId);
  if (uerr) throw new Error(uerr.message);
  return next;
}

export const getMyCoinState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin: admin } = await import("@/integrations/backend/client.server");
    const [{ data: profile }, { data: unlocks }, { data: tx }] = await Promise.all([
      admin.from("profiles").select("coin_balance").eq("id", context.userId).maybeSingle(),
      context.supabase.from("story_unlocks").select("story_id").eq("user_id", context.userId),
      context.supabase
        .from("coin_transactions")
        .select("id, amount, kind, story_id, note, created_at")
        .eq("user_id", context.userId)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);
    return {
      balance: profile?.coin_balance ?? 0,
      unlockedStoryIds: (unlocks ?? []).map((u) => u.story_id),
      transactions: tx ?? [],
    };
  });

export const purchaseCoins = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ amount: z.number().int().min(50).max(10000) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/backend/client.server");
    const balance = await addCoins(supabaseAdmin, context.userId, data.amount);
    await supabaseAdmin.from("coin_transactions").insert({
      user_id: context.userId,
      amount: data.amount,
      kind: "purchase",
      note: `Mock purchase of ${data.amount} coins`,
    });
    return { balance };
  });

export const unlockStory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ storyId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/backend/client.server");
    const { data: story, error } = await context.supabase
      .from("stories")
      .select("id, creator_id, monetization, unlock_price, title")
      .eq("id", data.storyId)
      .maybeSingle();
    if (error || !story) throw new Error("Story not found");
    if (story.monetization !== "locked" || story.unlock_price <= 0) {
      throw new Error("Story is not locked");
    }
    if (story.creator_id === context.userId) {
      throw new Error("You already own this story");
    }

    // Already unlocked?
    const { data: existing } = await context.supabase
      .from("story_unlocks")
      .select("id")
      .eq("user_id", context.userId)
      .eq("story_id", story.id)
      .maybeSingle();
    if (existing) return { ok: true, alreadyUnlocked: true };

    const { data: buyer } = await supabaseAdmin
      .from("profiles")
      .select("coin_balance")
      .eq("id", context.userId)
      .maybeSingle();
    if ((buyer?.coin_balance ?? 0) < story.unlock_price) {
      throw new Error("Not enough coins. Top up first.");
    }

    // Debit buyer, credit writer
    await addCoins(supabaseAdmin, context.userId, -story.unlock_price);
    if (story.creator_id) {
      await addCoins(supabaseAdmin, story.creator_id, story.unlock_price);
    }

    await supabaseAdmin.from("story_unlocks").insert({
      user_id: context.userId,
      story_id: story.id,
      price_paid: story.unlock_price,
    });

    await supabaseAdmin.from("coin_transactions").insert([
      {
        user_id: context.userId,
        amount: -story.unlock_price,
        kind: "unlock_spend",
        story_id: story.id,
        counterparty_id: story.creator_id,
        note: `Unlocked "${story.title}"`,
      },
      ...(story.creator_id
        ? [
            {
              user_id: story.creator_id,
              amount: story.unlock_price,
              kind: "unlock_earn" as const,
              story_id: story.id,
              counterparty_id: context.userId,
              note: `Sold access to "${story.title}"`,
            },
          ]
        : []),
    ]);

    return { ok: true };
  });

export const tipStory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({ storyId: z.string().uuid(), amount: z.number().int().min(1).max(10000) })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/backend/client.server");
    const { data: story, error } = await context.supabase
      .from("stories")
      .select("id, creator_id, tip_enabled, monetization, title")
      .eq("id", data.storyId)
      .maybeSingle();
    if (error || !story) throw new Error("Story not found");
    if (!story.tip_enabled && story.monetization !== "tips") {
      throw new Error("Tips are not enabled for this story");
    }
    if (!story.creator_id) throw new Error("This story has no creator to tip");
    if (story.creator_id === context.userId) throw new Error("You can't tip yourself");

    const { data: buyer } = await supabaseAdmin
      .from("profiles")
      .select("coin_balance")
      .eq("id", context.userId)
      .maybeSingle();
    if ((buyer?.coin_balance ?? 0) < data.amount) {
      throw new Error("Not enough coins. Top up first.");
    }

    await addCoins(supabaseAdmin, context.userId, -data.amount);
    await addCoins(supabaseAdmin, story.creator_id, data.amount);

    await supabaseAdmin.from("coin_transactions").insert([
      {
        user_id: context.userId,
        amount: -data.amount,
        kind: "tip_spend",
        story_id: story.id,
        counterparty_id: story.creator_id,
        note: `Tipped "${story.title}"`,
      },
      {
        user_id: story.creator_id,
        amount: data.amount,
        kind: "tip_earn",
        story_id: story.id,
        counterparty_id: context.userId,
        note: `Tip on "${story.title}"`,
      },
    ]);

    return { ok: true };
  });
