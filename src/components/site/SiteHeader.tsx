import { Link } from "@tanstack/react-router";
import { Terminal, Github } from "lucide-react";

const nav = [
  { to: "/", label: "Home", exact: true },
  { to: "/stories", label: "Stories" },
  { to: "/journeys", label: "Journeys" },
  { to: "/timeline", label: "Timeline" },
] as const;

export function SiteHeader() {
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
