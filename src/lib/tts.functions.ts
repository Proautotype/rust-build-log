import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/backend/auth-middleware";

const storyInput = (input: unknown) => z.object({ storyId: z.string().uuid() }).parse(input);

async function listenPrice(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
): Promise<number> {
  const { data } = await admin.from("site_settings").select("tts_price_coins").limit(1).maybeSingle();
  const price = Number(data?.tts_price_coins ?? 1);
  return Number.isFinite(price) && price >= 0 ? Math.round(price) : 1;
}

/** Whether the reader can already listen, plus the current price + balance. */
export const getListenState = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(storyInput)
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/backend/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = supabaseAdmin as any;
    const [{ data: listen }, { data: story }, { data: profile }, price] = await Promise.all([
      admin
        .from("story_listens")
        .select("id")
        .eq("story_id", data.storyId)
        .eq("user_id", context.userId)
        .maybeSingle(),
      admin.from("stories").select("creator_id").eq("id", data.storyId).maybeSingle(),
      admin.from("profiles").select("coin_balance").eq("id", context.userId).maybeSingle(),
      listenPrice(admin),
    ]);
    const isCreator = story?.creator_id === context.userId;
    return {
      canListen: !!listen || isCreator,
      price,
      balance: profile?.coin_balance ?? 0,
    };
  });

/** Charge the reader once for audio narration; the coin goes to the writer. */
export const purchaseListen = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(storyInput)
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/backend/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = supabaseAdmin as any;

    const { data: story } = await admin
      .from("stories")
      .select("id, title, creator_id")
      .eq("id", data.storyId)
      .eq("published", true)
      .maybeSingle();
    if (!story) throw new Error("Story not found");
    if (story.creator_id === context.userId) return { ok: true, canListen: true };

    const { data: existing } = await admin
      .from("story_listens")
      .select("id")
      .eq("story_id", story.id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (existing) return { ok: true, canListen: true, alreadyPaid: true };

    const price = await listenPrice(admin);

    if (price > 0) {
      const { data: reader } = await admin
        .from("profiles")
        .select("coin_balance")
        .eq("id", context.userId)
        .maybeSingle();
      const balance = reader?.coin_balance ?? 0;
      if (balance < price) throw new Error("Not enough coins. Top up first.");

      await admin
        .from("profiles")
        .update({ coin_balance: balance - price })
        .eq("id", context.userId);

      if (story.creator_id) {
        const { data: writer } = await admin
          .from("profiles")
          .select("coin_balance")
          .eq("id", story.creator_id)
          .maybeSingle();
        await admin
          .from("profiles")
          .update({ coin_balance: (writer?.coin_balance ?? 0) + price })
          .eq("id", story.creator_id);
      }

      await admin.from("coin_transactions").insert(
        [
          {
            user_id: context.userId,
            amount: -price,
            kind: "listen_spend",
            story_id: story.id,
            counterparty_id: story.creator_id,
            note: `Audio narration for "${story.title}"`,
          },
          ...(story.creator_id
            ? [
                {
                  user_id: story.creator_id,
                  amount: price,
                  kind: "listen_earn",
                  story_id: story.id,
                  counterparty_id: context.userId,
                  note: `Narration listen on "${story.title}"`,
                },
              ]
            : []),
        ].filter(Boolean),
      );
    }

    await admin
      .from("story_listens")
      .insert({ story_id: story.id, user_id: context.userId, price_paid: price });

    return { ok: true, canListen: true };
  });
