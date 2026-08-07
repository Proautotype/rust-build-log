import { Link } from "@tanstack/react-router";
import { NewsletterSignup } from "./NewsletterSignup";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/70 mt-24">
      <div className="container-page py-10 grid gap-8 md:grid-cols-[1fr_auto]">
        <NewsletterSignup />
        <div className="flex flex-col items-start gap-3 md:items-end">
          <div className="text-mono text-xs text-muted-foreground">
            <span className="text-foreground/80">right2read</span>{" "}
            <span className="opacity-60">// every reader has the right to a good story.</span>
          </div>
          <nav className="flex items-center gap-4 text-mono text-xs text-muted-foreground">
            <Link to="/support" className="hover:text-foreground transition-colors">
              Support
            </Link>
            <Link to="/privacy" className="hover:text-foreground transition-colors">
              Privacy
            </Link>
            <Link to="/terms" className="hover:text-foreground transition-colors">
              Terms
            </Link>
          </nav>
          <a
            href="mailto:right2read.net@gmail.com"
            className="text-mono text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            right2read.net@gmail.com
          </a>
          <div className="text-mono text-xs text-muted-foreground">
            © {new Date().getFullYear()} Right2Read — Built in public.
          </div>
        </div>
      </div>
    </footer>
  );
}
