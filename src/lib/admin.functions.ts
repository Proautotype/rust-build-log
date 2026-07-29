import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertRole } from "@/lib/roles";

export const getSiteSettings = createServerFn({ method: "GET" }).handler(async () => {
  // Public read is allowed by RLS; use the shared anon client.
  const { supabase } = await import("@/integrations/supabase/client");
  const { data, error } = await supabase
    .from("site_settings")
    .select(
      "id, adsense_enabled, adsense_client, adsense_slot, adsense_global_enabled, media_bucket_public, media_max_mb, media_allowed_types, x_setup_price_coins",
    )

    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
});

export const updateSiteSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        adsense_enabled: z.boolean(),
        adsense_client: z.string().max(120).nullable().optional(),
        adsense_slot: z.string().max(120).nullable().optional(),
        adsense_global_enabled: z.boolean().optional(),
        media_bucket_public: z.boolean().optional(),
        media_max_mb: z.number().int().min(1).max(1024).optional(),
        media_allowed_types: z.string().max(2000).optional(),
        x_setup_price_coins: z.number().int().min(0).max(100000).optional(),

      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertRole(context.supabase, context.userId, ["admin"]);

    const { data: existing } = await context.supabase
      .from("site_settings")
      .select("id")
      .limit(1)
      .maybeSingle();

    const payload = {
      adsense_enabled: data.adsense_enabled,
      adsense_client: data.adsense_client?.trim() || null,
      adsense_slot: data.adsense_slot?.trim() || null,
      adsense_global_enabled: data.adsense_global_enabled ?? true,
      updated_at: new Date().toISOString(),
      updated_by: context.userId,
      ...(data.media_bucket_public !== undefined ? { media_bucket_public: data.media_bucket_public } : {}),
      ...(data.media_max_mb !== undefined ? { media_max_mb: data.media_max_mb } : {}),
      ...(data.media_allowed_types !== undefined ? { media_allowed_types: data.media_allowed_types } : {}),
      ...(data.x_setup_price_coins !== undefined
        ? { x_setup_price_coins: data.x_setup_price_coins }
        : {}),

    };

    if (existing) {
      const { data: row, error } = await context.supabase
        .from("site_settings")
        .update(payload)
        .eq("id", existing.id)
        .select()
        .maybeSingle();
      if (error) throw new Error(error.message);
      return row;
    } else {
      const { data: row, error } = await context.supabase
        .from("site_settings")
        .insert(payload)
        .select()
        .maybeSingle();
      if (error) throw new Error(error.message);
      return row;
    }
  });

export const upgradeToPro = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .update({ is_pro: true })
      .eq("id", context.userId)
      .select()
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

export const downgradeFromPro = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .update({ is_pro: false })
      .eq("id", context.userId)
      .select()
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });
