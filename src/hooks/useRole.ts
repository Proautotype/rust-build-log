import { useEffect, useState } from "react";
import { supabase } from "@/integrations/backend/client";
import { useAuth } from "./useAuth";

export type AppRole = "reader" | "writer" | "manager" | "admin" | "support";

export function useRole() {
  const { user, loading: authLoading } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    if (authLoading) return;
    if (!user) {
      setRoles([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .then(({ data }) => {
        if (!mounted) return;
        setRoles(((data ?? []).map((r) => r.role) as AppRole[]) ?? []);
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [user, authLoading]);

  const isAdmin = roles.includes("admin");
  const isManager = roles.includes("manager");
  const isWriter = roles.includes("writer") || isAdmin;
  return {
    roles,
    loading: authLoading || loading,
    isReader: roles.includes("reader"),
    isWriter,
    isManager,
    isAdmin,
    /** Staff = admin or manager. Can view dashboard & approve requests. */
    isStaff: isAdmin || isManager,
  };
}
