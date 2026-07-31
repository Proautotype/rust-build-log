import { createMiddleware } from "@tanstack/react-start";
import { supabase } from "./client";

// Registered as a global `functionMiddleware` in `src/start.ts` so serverFn RPCs
// carry the caller's bearer token.
export const attachSupabaseAuth = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    return next({ headers: token ? { Authorization: `Bearer ${token}` } : {} });
  },
);
