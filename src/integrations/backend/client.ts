import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, createSupabaseFetch } from "./config";

function createBackendClient() {
  return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: { fetch: createSupabaseFetch(SUPABASE_PUBLISHABLE_KEY) },
    auth: {
      storage: typeof window !== "undefined" ? localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

let _supabase: ReturnType<typeof createBackendClient> | undefined;

// import { supabase } from "@/integrations/backend/client";
export const supabase = new Proxy({} as ReturnType<typeof createBackendClient>, {
  get(_, prop, receiver) {
    if (!_supabase) _supabase = createBackendClient();
    return Reflect.get(_supabase, prop, receiver);
  },
});
