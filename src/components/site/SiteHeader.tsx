import { Link, useNavigate } from "@tanstack/react-router";
import {
  Github,
  LogOut,
  User as UserIcon,
  PenSquare,
  ShieldCheck,
  Sparkles,
  Settings,
  Coins,
  LayoutDashboard,
  BarChart3,
  Bot,
  LayoutTemplate,

} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { supabase } from "@/integrations/supabase/client";
import { R2RLogo } from "./R2RLogo";

type NavItem = {
  to: "/" | "/stories" | "/journeys" | "/timeline";
  label: string;
  exact?: boolean;
};
const nav: NavItem[] = [
  { to: "/", label: "Home", exact: true },
  { to: "/stories", label: "Stories" },
  { to: "/journeys", label: "Journeys" },
  { to: "/timeline", label: "Timeline" },
];

export function SiteHeader() {
  const { user, profile, loading } = useAuth();
  const { isWriter, isAdmin, isStaff } = useRole();
  const navigate = useNavigate();

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-xl">
      <div className="container-page flex h-14 items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2 group">
          <R2RLogo className="h-7 w-7" />
          <span className="text-mono text-sm font-semibold tracking-tight">
            Right<span className="text-primary">2</span>Read
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

          {!loading && user && isWriter && (
            <>
              <Link
                to="/studio"
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 px-2.5 text-xs font-medium text-primary hover:bg-primary/20"
              >
                <PenSquare className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Studio</span>
              </Link>
              <Link
                to="/analytics"
                title="Story analytics"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:text-foreground"
              >
                <BarChart3 className="h-3.5 w-3.5" />
              </Link>
              <Link
                to="/agents"
                title="AI agents"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:text-foreground"
              >
                <Bot className="h-3.5 w-3.5" />
              </Link>
              <Link
                to="/templates"
                title="Story & card templates"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:text-foreground"
              >
                <LayoutTemplate className="h-3.5 w-3.5" />
              </Link>

            </>
          )}

          {!loading && user && isStaff && (
            <>
              <Link
                to="/admin/dashboard"
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-xs text-muted-foreground hover:text-foreground"
                title="Dashboard"
              >
                <LayoutDashboard className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{isAdmin ? "Admin" : "Manage"}</span>
              </Link>
              <Link
                to="/admin/requests"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:text-foreground"
                title="Writer requests"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
              </Link>
              {isAdmin && (
                <Link
                  to="/admin/settings"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:text-foreground"
                  title="Site settings"
                >
                  <Settings className="h-3.5 w-3.5" />
                </Link>
              )}
            </>
          )}

          {!loading && user && (
            <Link
              to="/coins"
              title="Coins"
              className="inline-flex h-8 items-center gap-1 rounded-md border border-primary/40 bg-primary/5 px-2 text-mono text-xs font-medium text-primary hover:bg-primary/10"
            >
              <Coins className="h-3.5 w-3.5" />
              {profile?.coin_balance ?? 0}
            </Link>
          )}

          {!loading && user && !profile?.is_pro && (
            <Link
              to="/upgrade"
              className="hidden sm:inline-flex h-8 items-center gap-1.5 rounded-md border border-primary/40 bg-primary/5 px-2.5 text-xs font-medium text-primary hover:bg-primary/10"
              title="Upgrade to Pro"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Upgrade
            </Link>
          )}

          {!loading &&
            (user ? (
              <div className="flex items-center gap-2">
                <Link
                  to="/profile"
                  className="hidden sm:flex items-center gap-2 rounded-md border border-border/70 bg-card/40 px-2 py-1 hover:border-primary/40 transition"
                >
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
                  {profile?.is_pro && (
                    <span className="inline-flex items-center gap-0.5 rounded bg-primary/15 text-primary text-mono text-[9px] uppercase tracking-wider px-1 py-0.5">
                      <Sparkles className="h-2.5 w-2.5" /> Pro
                    </span>
                  )}
                </Link>
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
                search={{ redirect: undefined }}
                className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90"
              >
                Sign in
              </Link>
            ))}
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
          {user && isWriter && (
            <>
              <Link
                to="/studio"
                className="px-3 py-1.5 rounded-md text-sm text-primary whitespace-nowrap"
              >
                Studio
              </Link>
              <Link
                to="/analytics"
                className="px-3 py-1.5 rounded-md text-sm text-primary whitespace-nowrap"
              >
                Analytics
              </Link>
              <Link
                to="/agents"
                className="px-3 py-1.5 rounded-md text-sm text-primary whitespace-nowrap"
              >
                AI agents
              </Link>
              <Link
                to="/templates"
                className="px-3 py-1.5 rounded-md text-sm text-primary whitespace-nowrap"
              >
                Templates
              </Link>

            </>
          )}
          {user && (
            <Link
              to="/profile"
              className="px-3 py-1.5 rounded-md text-sm text-muted-foreground whitespace-nowrap"
            >
              Profile
            </Link>
          )}
          {user && !profile?.is_pro && (
            <Link
              to="/upgrade"
              className="px-3 py-1.5 rounded-md text-sm text-primary whitespace-nowrap"
            >
              Upgrade
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
