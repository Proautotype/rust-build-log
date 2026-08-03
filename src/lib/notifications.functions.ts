import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/backend/auth-middleware";

export interface AppNotification {
  id: string;
  kind: string;
  title: string;
  body: string;
  story_slug: string | null;
  read: boolean;
  created_at: string;
}

/** Latest notifications for the signed-in reader. */
export const getMyNotifications = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (context.supabase as any)
      .from("notifications")
      .select("id, kind, title, body, story_slug, read, created_at")
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) return { items: [] as AppNotification[], unread: 0 };
    const items = (data ?? []) as AppNotification[];
    return { items, unread: items.filter((n) => !n.read).length };
  });

/** Mark one notification, or all of them, as read. */
export const markNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ id: z.string().uuid().optional() }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q = (context.supabase as any)
      .from("notifications")
      .update({ read: true })
      .eq("user_id", context.userId);
    if (data.id) q = q.eq("id", data.id);
    else q = q.eq("read", false);
    const { error } = await q;
    if (error) throw new Error(error.message);
    return { ok: true };
  });
