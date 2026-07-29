import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertRole } from "@/lib/roles";

export interface XAccessState {
  connected: boolean;
  status: "active" | "invalid" | null;
  last4: string | null;
  verifiedAt: string | null;
  houseAvailable: boolean;
  setupPriceCoins: number;
  request: {
    id: string;
    status: string;
    created_at: string;
    admin_note: string;
  } | null;
}

async function priceCoins(): Promise<number> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabaseAdmin as any)
    .from("site_settings")
    .select("x_setup_price_coins")
    .limit(1)
    .maybeSingle();
  return data?.x_setup_price_coins ?? 500;
}

/** Whether this writer has X access, without ever exposing the token. */
export const getMyXAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<XAccessState> => {
    const [{ getWriterXStatus }, { isHouseXConnected }] = await Promise.all([
      import("./x-credentials.server"),
      import("./x-trends.server"),
    ]);
    const status = await getWriterXStatus(context.userId);

    const { data: req } = await context.supabase
      .from("x_setup_requests")
      .select("id, status, created_at, admin_note")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return {
      ...status,
      houseAvailable: isHouseXConnected(),
      setupPriceCoins: await priceCoins(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      request: (req as any) ?? null,
    };
  });

/** Verify a token against X, then store it encrypted for this writer. */
export const connectMyXToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ token: z.string().trim().min(20).max(2000) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { verifyXToken, saveWriterXToken } = await import("./x-credentials.server");
    const { username } = await verifyXToken(data.token);
    await saveWriterXToken(context.userId, data.token);
    return { ok: true, username, last4: data.token.slice(-4) };
  });

export const disconnectMyXToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { deleteWriterXToken } = await import("./x-credentials.server");
    await deleteWriterXToken(context.userId);
    return { ok: true };
  });

/* ------------------------------------------------------------------ */
/*  Paid concierge setup                                               */
/* ------------------------------------------------------------------ */

export const requestXSetup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        contactEmail: z.string().trim().email().max(255),
        xHandle: z.string().trim().max(80).optional(),
        notes: z.string().trim().max(1000).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: open } = await (supabaseAdmin as any)
      .from("x_setup_requests")
      .select("id")
      .eq("user_id", context.userId)
      .in("status", ["paid", "in_progress"])
      .maybeSingle();
    if (open) throw new Error("You already have a setup request in progress.");

    const price = await priceCoins();
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("coin_balance")
      .eq("id", context.userId)
      .maybeSingle();
    const balance = profile?.coin_balance ?? 0;
    if (balance < price) {
      throw new Error(`You need ${price} coins for this service. Your balance is ${balance}.`);
    }

    const { error: berr } = await supabaseAdmin
      .from("profiles")
      .update({ coin_balance: balance - price })
      .eq("id", context.userId);
    if (berr) throw new Error(berr.message);

    await supabaseAdmin.from("coin_transactions").insert({
      user_id: context.userId,
      amount: -price,
      kind: "x_setup",
      note: "Paid X access setup by R2R",
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: row, error } = await (supabaseAdmin as any)
      .from("x_setup_requests")
      .insert({
        user_id: context.userId,
        contact_email: data.contactEmail,
        x_handle: data.xHandle ?? "",
        notes: data.notes ?? "",
        status: "paid",
        price_coins: price,
      })
      .select("id, status, created_at, admin_note")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const listXSetupRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertRole(context.supabase, context.userId, ["admin", "manager"]);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabaseAdmin as any)
      .from("x_setup_requests")
      .select("id, user_id, contact_email, x_handle, notes, status, price_coins, admin_note, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);

    const ids = Array.from(new Set(((data ?? []) as { user_id: string }[]).map((r) => r.user_id)));
    const { data: profiles } = ids.length
      ? await supabaseAdmin.from("profiles").select("id, display_name").in("id", ids)
      : { data: [] };
    const names = new Map(
      ((profiles ?? []) as { id: string; display_name: string | null }[]).map((p) => [
        p.id,
        p.display_name,
      ]),
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ((data ?? []) as any[]).map((r) => ({
      ...r,
      display_name: names.get(r.user_id) ?? null,
    }));
  });

/** Admin fulfils a request: optionally stores the token for the writer, sets status. */
export const resolveXSetupRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["in_progress", "done", "rejected"]),
        token: z.string().trim().max(2000).optional(),
        adminNote: z.string().trim().max(1000).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertRole(context.supabase, context.userId, ["admin", "manager"]);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: req, error: rerr } = await (supabaseAdmin as any)
      .from("x_setup_requests")
      .select("id, user_id, status, price_coins")
      .eq("id", data.id)
      .maybeSingle();
    if (rerr || !req) throw new Error("Request not found");

    if (data.token && data.token.length >= 20) {
      const { verifyXToken, saveWriterXToken } = await import("./x-credentials.server");
      await verifyXToken(data.token);
      await saveWriterXToken(req.user_id, data.token);
    }

    // Refund on rejection, once.
    if (data.status === "rejected" && req.status !== "rejected" && req.price_coins > 0) {
      const { data: p } = await supabaseAdmin
        .from("profiles")
        .select("coin_balance")
        .eq("id", req.user_id)
        .maybeSingle();
      await supabaseAdmin
        .from("profiles")
        .update({ coin_balance: (p?.coin_balance ?? 0) + req.price_coins })
        .eq("id", req.user_id);
      await supabaseAdmin.from("coin_transactions").insert({
        user_id: req.user_id,
        amount: req.price_coins,
        kind: "refund",
        note: "Refund for X setup request",
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabaseAdmin as any)
      .from("x_setup_requests")
      .update({
        status: data.status,
        admin_note: data.adminNote ?? "",
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
