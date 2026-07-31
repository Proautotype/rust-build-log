import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/backend/client";
import { useAuth } from "./useAuth";

const LS_KEY = "r2r.interests";
const LS_DISMISS_KEY = "r2r.interests.dismissed";

function readLocal(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

/**
 * Reader interests with a guest-friendly fallback.
 *
 * Guests: stored in localStorage so a first-time visitor arriving from a
 * shared link can start reading immediately and tune the feed whenever they
 * feel like it. Signed-in users: stored on their profile and merged with
 * anything they picked while browsing as a guest.
 */
export function useInterests() {
  const { user, loading: authLoading } = useAuth();
  const [interests, setInterests] = useState<string[]>([]);
  const [onboarded, setOnboarded] = useState(false);
  const [dismissed, setDismissed] = useState(true);
  const [ready, setReady] = useState(false);

  // Hydrate from localStorage on the client only (avoids SSR mismatch).
  useEffect(() => {
    setInterests(readLocal());
    try {
      setDismissed(localStorage.getItem(LS_DISMISS_KEY) === "1");
    } catch {
      /* ignore */
    }
    if (!user) setReady(true);
  }, [user]);

  // Merge the profile's saved interests once signed in.
  useEffect(() => {
    if (authLoading || !user) return;
    let mounted = true;
    supabase
      .from("profiles")
      .select("interests, onboarded")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!mounted) return;
        const remote = (data?.interests ?? []) as string[];
        const local = readLocal();
        const merged = Array.from(new Set([...remote, ...local]));
        setInterests(merged);
        setOnboarded(Boolean(data?.onboarded));
        setReady(true);
        if (merged.length > remote.length) {
          void supabase.from("profiles").update({ interests: merged }).eq("id", user.id);
        }
      });
    return () => {
      mounted = false;
    };
  }, [user, authLoading]);

  const save = useCallback(
    async (next: string[]) => {
      const unique = Array.from(new Set(next));
      setInterests(unique);
      try {
        localStorage.setItem(LS_KEY, JSON.stringify(unique));
      } catch {
        /* ignore */
      }
      if (user) {
        setOnboarded(true);
        await supabase
          .from("profiles")
          .update({ interests: unique, onboarded: true })
          .eq("id", user.id);
      }
    },
    [user],
  );

  const toggle = useCallback(
    (id: string) => {
      const next = interests.includes(id)
        ? interests.filter((x) => x !== id)
        : [...interests, id];
      void save(next);
    },
    [interests, save],
  );

  const dismissPrompt = useCallback(() => {
    setDismissed(true);
    try {
      localStorage.setItem(LS_DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  }, []);

  return {
    interests,
    hasInterests: interests.length > 0,
    onboarded,
    /** Show the soft "pick your topics" nudge? */
    showPrompt: ready && interests.length === 0 && !dismissed,
    ready,
    save,
    toggle,
    dismissPrompt,
  };
}
