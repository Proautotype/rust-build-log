import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/backend/auth-middleware";

/**
 * Public newsletter signup. Stores the address so new stories can be mailed out.
 * Delivery runs once an email sender domain is configured for the project.
 */
export const subscribeToNewsletter = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        email: z.string().trim().toLowerCase().email().max(255),
        topics: z.array(z.string().max(40)).max(24).default([]),
        source: z.string().max(40).default("site"),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/backend/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabaseAdmin as any)
      .from("newsletter_subscribers")
      .upsert(
        {
          email: data.email,
          topics: data.topics,
          source: data.source,
          unsubscribed_at: null,
        },
        { onConflict: "email" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Unsubscribe an address. */
export const unsubscribeFromNewsletter = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ email: z.string().trim().toLowerCase().email().max(255) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/backend/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabaseAdmin as any)
      .from("newsletter_subscribers")
      .update({ unsubscribed_at: new Date().toISOString() })
      .eq("email", data.email);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Newsletter status + queued issues for the signed-in reader. */
export const getMyNewsletterState = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const email = String(context.claims?.email ?? "");
    if (!email) return { email: "", subscribed: false };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (context.supabase as any)
      .from("newsletter_subscribers")
      .select("email, unsubscribed_at")
      .eq("email", email.toLowerCase())
      .maybeSingle();
    return { email, subscribed: !!data && !data.unsubscribed_at };
  });
