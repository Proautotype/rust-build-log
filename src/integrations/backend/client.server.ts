// Server-only Supabase client (service role) for the R2R project. Bypasses RLS.
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { SUPABASE_URL, createSupabaseFetch } from "./config";

function createBackendAdminClient() {
  const key =
    import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    const message = "Missing SERVICE_ROLE_KEY environment variable.";
    console.error(`[Backend] ${message}`);
    throw new Error(message);
  }

  return createClient<Database>(SUPABASE_URL, key, {
    global: { fetch: createSupabaseFetch(key) },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

let _admin: ReturnType<typeof createBackendAdminClient> | undefined;

// Load inside server handlers only:
// const { supabaseAdmin } = await import("@/integrations/backend/client.server");
export const supabaseAdmin = new Proxy({} as ReturnType<typeof createBackendAdminClient>, {
  get(_, prop, receiver) {
    if (!_admin) _admin = createBackendAdminClient();
    return Reflect.get(_admin, prop, receiver);
  },
});
