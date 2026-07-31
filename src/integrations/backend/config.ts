/**
 * Backend connection config for the R2R Supabase project.
 *
 * The URL and publishable key are public values (safe in the bundle). The
 * service role key lives in the R2R_SERVICE_ROLE_KEY secret and is only read
 * server-side.
 */
export const SUPABASE_PROJECT_ID = "hybzcouzsxktxgakuplw";
export const SUPABASE_URL = "https://hybzcouzsxktxgakuplw.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_OLfoEbMFDj4zqjCgtQO78g_dU5qu3G2";
export const STORAGE_BUCKET = "right2read";
export const EMAIL_REDIRECT_URL = "https://right2read.net";

export function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

/** Supabase's opaque `sb_*` keys are not JWTs — send them as `apikey` only. */
export function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );

    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }

    if (
      isNewSupabaseApiKey(supabaseKey) &&
      headers.get("Authorization") === `Bearer ${supabaseKey}`
    ) {
      headers.delete("Authorization");
    }

    headers.set("apikey", supabaseKey);
    return fetch(input, { ...init, headers });
  };
}
