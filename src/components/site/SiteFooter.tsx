import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/70 mt-24">
      <div className="container-page py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="text-mono text-xs text-muted-foreground">
          <span className="text-foreground/80">right2read</span>{" "}
          <span className="opacity-60">
            // every reader has the right to a good story.
          </span>
        </div>
        <nav className="flex items-center gap-4 text-mono text-xs text-muted-foreground">
          <Link to="/privacy" className="hover:text-foreground transition-colors">
            Privacy
          </Link>
          <Link to="/terms" className="hover:text-foreground transition-colors">
            Terms
          </Link>
        </nav>
        <div className="text-mono text-xs text-muted-foreground">
          © {new Date().getFullYear()} Right2Read — Built in public.
        </div>
      </div>
    </footer>
  );
}
