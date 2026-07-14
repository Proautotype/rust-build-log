import { Link, useNavigate } from "@tanstack/react-router";
import { Terminal, Github, LogOut, User as UserIcon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

type NavItem = {
  to: "/" | "/stories" | "/journeys" | "/timeline" | "/studio";
  label: string;
  exact?: boolean;
};
const nav: NavItem[] = [
  { to: "/", label: "Home", exact: true },
  { to: "/stories", label: "Stories" },
  { to: "/journeys", label: "Journeys" },
  { to: "/timeline", label: "Timeline" },
  { to: "/studio", label: "Studio" },
];

export function SiteHeader() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-xl">
      <div className="container-page flex h-14 items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2 group">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/15 text-primary ring-1 ring-primary/30">
            <Terminal className="h-3.5 w-3.5" />
          </span>
          <span className="text-mono text-sm font-semibold tracking-tight">
            rust<span className="text-primary">.</span>journey
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.exact }}
              className="px-3 py-1.5 rounded-md text-sm text-muted-foreground transition-colors hover:text-foreground hover:bg-accent/60"
              activeProps={{ className: "text-foreground bg-accent/70" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/60 transition"
          >
            <Github className="h-4 w-4" />
          </a>

          {!loading && (
            user ? (
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-2 rounded-md border border-border/70 bg-card/40 px-2 py-1">
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt=""
                      className="h-5 w-5 rounded-full object-cover"
                    />
                  ) : (
                    <UserIcon className="h-3.5 w-3.5 text-primary" />
                  )}
                  <span className="text-xs font-medium">
                    {profile?.display_name ?? user.email?.split("@")[0]}
                  </span>
                </div>
                <button
                  onClick={signOut}
                  aria-label="Sign out"
                  className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/60"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Sign out</span>
                </button>
              </div>
            ) : (
              <Link
                to="/auth"
                className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90"
              >
                Sign in
              </Link>
            )
          )}
        </div>
      </div>

      {/* Mobile nav */}
      <div className="md:hidden border-t border-border/60">
        <div className="container-page flex overflow-x-auto no-scrollbar gap-1 py-2">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.exact }}
              className="px-3 py-1.5 rounded-md text-sm text-muted-foreground whitespace-nowrap"
              activeProps={{ className: "text-foreground bg-accent/70" }}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
}
