import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Batch-fetch writer display names for a list of creator ids.
 * Returns a map { [creatorId]: displayName | null }.
 */
export function useWriterNames(ids: (string | null | undefined)[]) {
  const [map, setMap] = useState<Record<string, string | null>>({});

  useEffect(() => {
    const unique = Array.from(new Set(ids.filter((x): x is string => !!x)));
    if (unique.length === 0) {
      setMap({});
      return;
    }
    let cancelled = false;
    supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", unique)
      .then(({ data }) => {
        if (cancelled) return;
        setMap(
          Object.fromEntries((data ?? []).map((p) => [p.id, p.display_name ?? null])),
        );
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids.join(",")]);

  return map;
}
