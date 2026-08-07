import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/backend/auth-middleware";
import { assertRole } from "@/lib/roles";

const SUPPORT_ROLES = ["support", "admin", "manager"] as const;

/** Anyone (signed in or not) can send a message to customer service. */
export const sendSupportMessage = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        name: z.string().trim().min(1).max(120),
        email: z.string().trim().toLowerCase().email().max(255),
        subject: z.string().trim().min(1).max(160),
        message: z.string().trim().min(5).max(4000),
        category: z.enum(["support", "billing", "content", "donation", "other"]).default("support"),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/backend/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabaseAdmin as any).from("support_messages").insert({
      name: data.name,
      email: data.email,
      subject: data.subject,
      body: data.message,
      category: data.category,
      status: "open",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Customer service inbox. */
export const listSupportMessages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertRole(context.supabase, context.userId, [...SUPPORT_ROLES]);
    const { supabaseAdmin } = await import("@/integrations/backend/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabaseAdmin as any)
      .from("support_messages")
      .select("id, name, email, subject, body, category, status, reply, created_at, replied_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return (data ?? []) as SupportMessage[];
  });

export type SupportMessage = {
  id: string;
  name: string;
  email: string;
  subject: string;
  body: string;
  category: string;
  status: "open" | "pending" | "resolved";
  reply: string | null;
  created_at: string;
  replied_at: string | null;
};

/** Update a ticket's status and/or store the reply that was sent. */
export const updateSupportMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["open", "pending", "resolved"]).optional(),
        reply: z.string().trim().max(4000).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertRole(context.supabase, context.userId, [...SUPPORT_ROLES]);
    const { supabaseAdmin } = await import("@/integrations/backend/client.server");
    const patch: Record<string, unknown> = { handled_by: context.userId };
    if (data.status) patch["status"] = data.status;
    if (data.reply !== undefined) {
      patch["reply"] = data.reply || null;
      patch["replied_at"] = data.reply ? new Date().toISOString() : null;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabaseAdmin as any)
      .from("support_messages")
      .update(patch)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
