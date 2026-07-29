/**
 * Per-writer X (Twitter) API bearer tokens.
 * Server-only: tokens are stored encrypted and never returned to the browser.
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

function key(): Buffer {
  const raw = process.env.WRITER_X_TOKEN_SECRET;
  if (!raw) throw new Error("WRITER_X_TOKEN_SECRET is not set");
  // Secret is a random alphanumeric string; derive a stable 32-byte key from it.
  return createHash("sha256").update(raw).digest();
}

export function encryptToken(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ct]).toString("base64");
}

export function decryptToken(stored: string): string {
  const buf = Buffer.from(stored, "base64");
  const decipher = createDecipheriv("aes-256-gcm", key(), buf.subarray(0, 12));
  decipher.setAuthTag(buf.subarray(12, 28));
  return Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]).toString("utf8");
}

export interface XCredentialStatus {
  connected: boolean;
  status: "active" | "invalid" | null;
  last4: string | null;
  verifiedAt: string | null;
}

/** Ask X who owns this token. Returns the handle, or throws with the provider error. */
export async function verifyXToken(token: string): Promise<{ username: string | null }> {
  const res = await fetch("https://api.x.com/2/users/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401 || res.status === 403) {
    // App-only bearer tokens cannot call /users/me; fall back to a read they can do.
    const probe = await fetch(
      "https://api.x.com/2/tweets/search/recent?query=hello&max_results=10",
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (probe.ok || probe.status === 429) return { username: null };
    const body = await probe.text();
    throw new Error(`X rejected this token [${probe.status}]: ${body.slice(0, 300)}`);
  }
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`X rejected this token [${res.status}]: ${body.slice(0, 300)}`);
  }
  const payload = (await res.json()) as { data?: { username?: string } };
  return { username: payload.data?.username ?? null };
}

export async function saveWriterXToken(creatorId: string, token: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabaseAdmin as any).from("writer_x_credentials").upsert(
    {
      creator_id: creatorId,
      token_ciphertext: encryptToken(token),
      token_last4: token.slice(-4),
      status: "active",
      verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "creator_id" },
  );
  if (error) throw new Error(error.message);
}

export async function deleteWriterXToken(creatorId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabaseAdmin as any).from("writer_x_credentials").delete().eq("creator_id", creatorId);
}

export async function getWriterXStatus(creatorId: string): Promise<XCredentialStatus> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabaseAdmin as any)
    .from("writer_x_credentials")
    .select("token_last4, status, verified_at")
    .eq("creator_id", creatorId)
    .maybeSingle();
  if (!data) return { connected: false, status: null, last4: null, verifiedAt: null };
  return {
    connected: true,
    status: data.status === "invalid" ? "invalid" : "active",
    last4: data.token_last4 || null,
    verifiedAt: data.verified_at ?? null,
  };
}

/** Decrypted token for a writer, or null when they have not connected X. */
export async function getWriterXToken(creatorId: string): Promise<string | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabaseAdmin as any)
    .from("writer_x_credentials")
    .select("token_ciphertext")
    .eq("creator_id", creatorId)
    .maybeSingle();
  if (!data?.token_ciphertext) return null;
  try {
    return decryptToken(data.token_ciphertext);
  } catch {
    return null;
  }
}

export async function markWriterXInvalid(creatorId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabaseAdmin as any)
    .from("writer_x_credentials")
    .update({ status: "invalid", updated_at: new Date().toISOString() })
    .eq("creator_id", creatorId);
}
