import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/integrations/supabase/types";

const templateInput = z.object({
  id: z.string().uuid().optional(),
  kind: z.enum(["story", "card"]).default("story"),
  name: z.string().min(1).max(120),
  description: z.string().max(500).default(""),
  preview: z.string().max(1000).default(""),
  blocks: z.array(z.any()).default([]),
  theme: z.record(z.string(), z.any()).default({}),
  card_variant: z.enum(["poster", "row", "feature", "minimal"]).default("poster"),
  visibility: z.enum(["private", "public"]).default("private"),
  price: z.number().int().min(0).max(100000).default(0),
});

const SELECT =
  "id, creator_id, kind, name, description, preview, blocks, theme, card_variant, visibility, price, uses, created_at, updated_at";

export const listMyTemplates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("templates")
      .select(SELECT)
      .eq("creator_id", context.userId)
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

/** Public marketplace listing plus, when signed in, which ones the caller owns. */
export const listSharedTemplates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: rows, error }, { data: unlocks }] = await Promise.all([
      context.supabase
        .from("templates")
        .select(SELECT)
        .eq("visibility", "public")
        .order("uses", { ascending: false }),
      context.supabase.from("template_unlocks").select("template_id").eq("user_id", context.userId),
    ]);
    if (error) throw new Error(error.message);
    const owned = new Set((unlocks ?? []).map((u) => u.template_id));
    return (rows ?? []).map((t) => {
      const mine = t.creator_id === context.userId;
      const unlocked = mine || t.price === 0 || owned.has(t.id);
      return {
        ...t,
        mine,
        unlocked,
        blocks: unlocked ? t.blocks : [],
      };
    });
  });

export const saveTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => templateInput.parse(input))
  .handler(async ({ data, context }) => {
    const payload = {
      creator_id: context.userId,
      kind: data.kind,
      name: data.name,
      description: data.description,
      preview: data.preview,
      blocks: data.blocks as unknown as Json,
      theme: data.theme as unknown as Json,
      card_variant: data.card_variant,
      visibility: data.visibility,
      price: data.visibility === "public" ? data.price : 0,
    };
    if (data.id) {
      const { data: row, error } = await context.supabase
        .from("templates")
        .update(payload)
        .eq("id", data.id)
        .eq("creator_id", context.userId)
        .select(SELECT)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return row;
    }
    const { data: row, error } = await context.supabase
      .from("templates")
      .insert(payload)
      .select(SELECT)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("templates")
      .delete()
      .eq("id", data.id)
      .eq("creator_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Acquire a shared template — free ones are instant, paid ones cost coins. */
export const acquireTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: tpl, error } = await context.supabase
      .from("templates")
      .select(SELECT)
      .eq("id", data.id)
      .maybeSingle();
    if (error || !tpl) throw new Error("Template not found");
    if (tpl.creator_id === context.userId) return { template: tpl, charged: 0 };
    if (tpl.visibility !== "public") throw new Error("This template is not shared");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: existing } = await context.supabase
      .from("template_unlocks")
      .select("id")
      .eq("user_id", context.userId)
      .eq("template_id", tpl.id)
      .maybeSingle();

    let charged = 0;
    if (!existing && tpl.price > 0) {
      const { data: buyer } = await supabaseAdmin
        .from("profiles")
        .select("coin_balance")
        .eq("id", context.userId)
        .maybeSingle();
      const balance = buyer?.coin_balance ?? 0;
      if (balance < tpl.price) throw new Error("Not enough coins to buy this template");

      await supabaseAdmin
        .from("profiles")
        .update({ coin_balance: balance - tpl.price })
        .eq("id", context.userId);

      const { data: seller } = await supabaseAdmin
        .from("profiles")
        .select("coin_balance")
        .eq("id", tpl.creator_id)
        .maybeSingle();
      await supabaseAdmin
        .from("profiles")
        .update({ coin_balance: (seller?.coin_balance ?? 0) + tpl.price })
        .eq("id", tpl.creator_id);

      await supabaseAdmin.from("coin_transactions").insert([
        {
          user_id: context.userId,
          amount: -tpl.price,
          kind: "template_purchase",
          counterparty_id: tpl.creator_id,
          note: `Bought template "${tpl.name}"`,
        },
        {
          user_id: tpl.creator_id,
          amount: tpl.price,
          kind: "template_sale",
          counterparty_id: context.userId,
          note: `Sold template "${tpl.name}"`,
        },
      ]);
      charged = tpl.price;
    }

    if (!existing) {
      await supabaseAdmin.from("template_unlocks").insert({
        user_id: context.userId,
        template_id: tpl.id,
        price_paid: charged,
      });
    }

    await supabaseAdmin
      .from("templates")
      .update({ uses: (tpl.uses ?? 0) + 1 })
      .eq("id", tpl.id);

    return { template: tpl, charged };
  });
