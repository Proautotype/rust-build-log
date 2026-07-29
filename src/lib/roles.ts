/**
 * Role checks for server functions.
 *
 * The `has_role` SQL helper now lives in a non-exposed schema (it is only used
 * by RLS policies), so application code reads the caller's own roles directly.
 * The `user_roles` RLS policy only lets a user see their own rows, so this can
 * only ever confirm the *caller's* roles — which is exactly what we want.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseLike = any;

export type AppRole = "reader" | "writer" | "manager" | "admin";

export async function getMyRoles(supabase: SupabaseLike, userId: string): Promise<AppRole[]> {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  return ((data ?? []) as { role: AppRole }[]).map((r) => r.role);
}

export async function hasRole(
  supabase: SupabaseLike,
  userId: string,
  role: AppRole,
): Promise<boolean> {
  const roles = await getMyRoles(supabase, userId);
  return roles.includes(role);
}

export async function assertRole(
  supabase: SupabaseLike,
  userId: string,
  roles: AppRole[],
): Promise<void> {
  const mine = await getMyRoles(supabase, userId);
  if (!roles.some((r) => mine.includes(r))) throw new Error("Forbidden");
}
