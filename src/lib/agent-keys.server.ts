/** Server-only helpers for agent API keys. */

const KEY_PREFIX = "r2r_";

export function generateApiKey() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const body = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `${KEY_PREFIX}${body}`;
}

export async function hashApiKey(key: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function keyPreview(key: string) {
  return `${key.slice(0, 8)}…${key.slice(-4)}`;
}
