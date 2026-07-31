import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Terminal, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/backend/client";
import { lovable } from "@/integrations/lovable/index";
import { TopicPicker } from "@/components/feed/TopicPicker";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign in — Rust Journey" },
      { name: "description", content: "Sign in to Rust Journey to publish stories and comment." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function isSafePath(p: string | undefined): p is string {
  return !!p && p.startsWith("/") && !p.startsWith("//");
}

function AuthPage() {
  const navigate = useNavigate();
  const { redirect: redirectParam } = Route.useSearch();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  /** Signup is two steps: pick topics, then create the account. */
  const [step, setStep] = useState<"topics" | "form">("form");
  const [picked, setPicked] = useState<string[]>([]);

  // If already signed in, bounce to destination
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        navigate({ to: isSafePath(redirectParam) ? redirectParam : "/", replace: true });
      }
    });
  }, [navigate, redirectParam]);

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: import.meta.env.VITE_EMAIL_REDIRECT || window.location.origin,
            data: { display_name: displayName || email.split("@")[0] },
          },
        });
        if (error) throw error;
        // Keep the picks locally; they sync to the profile on first sign-in.
        if (picked.length) {
          try {
            localStorage.setItem("r2r.interests", JSON.stringify(picked));
          } catch {
            /* ignore */
          }
        }
        setInfo("Account created. You can now sign in.");
        setMode("signin");
        setStep("form");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: isSafePath(redirectParam) ? redirectParam : "/", replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) throw result.error;
      if (result.redirected) return;
      navigate({ to: isSafePath(redirectParam) ? redirectParam : "/", replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed");
      setLoading(false);
    }
  }

  const showTopics = mode === "signup" && step === "topics";

  return (
    <div className="container-page py-16 md:py-24">
      <div className={`mx-auto ${showTopics ? "max-w-2xl" : "max-w-md"}`}>
        <Link to="/" className="inline-flex items-center gap-2 group">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/15 text-primary ring-1 ring-primary/30">
            <Terminal className="h-3.5 w-3.5" />
          </span>
          <span className="text-mono text-sm font-semibold tracking-tight">
            right2<span className="text-primary">read</span>
          </span>
        </Link>

        <h1 className="mt-8 text-3xl md:text-4xl font-display tracking-tight">
          {showTopics
            ? "What do you want to read?"
            : mode === "signin"
              ? "Welcome back"
              : "Create your account"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {showTopics
            ? "Pick a few topics so your feed feels like yours. You can change these any time."
            : mode === "signin"
              ? "Sign in to comment, unlock stories and open the Creator Studio."
              : "Set up your profile to comment, follow topics and publish stories."}
        </p>

        {showTopics ? (
          <div className="mt-8">
            <TopicPicker
              selected={picked}
              size="lg"
              onToggle={(id) =>
                setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
              }
            />
            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setStep("form")}
                className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                {picked.length
                  ? `Continue with ${picked.length} topic${picked.length === 1 ? "" : "s"}`
                  : "Continue"}
              </button>
              <button
                type="button"
                onClick={() => setStep("form")}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Skip for now
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-8 space-y-3">
              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border/70" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-background px-2 text-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    with email
                  </span>
                </div>
              </div>
            </div>

            <form onSubmit={handleEmail} className="mt-2 space-y-3">
              {mode === "signup" && (
                <div>
                  <label className="text-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                    Display name
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Ada Lovelace"
                    className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              )}
              <div>
                <label className="text-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                  Password
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {error && (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {error}
                </div>
              )}
              {info && (
                <div className="rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-xs text-primary">
                  {info}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {mode === "signin" ? "Sign in" : "Create account"}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              {mode === "signin" ? "Don't have an account?" : "Already have an account?"}{" "}
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setInfo(null);
                  const next = mode === "signin" ? "signup" : "signin";
                  setMode(next);
                  setStep(next === "signup" ? "topics" : "form");
                }}
                className="text-primary hover:underline"
              >
                {mode === "signin" ? "Create one" : "Sign in"}
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
