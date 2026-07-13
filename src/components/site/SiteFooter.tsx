export function SiteFooter() {
  return (
    <footer className="border-t border-border/70 mt-24">
      <div className="container-page py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="text-mono text-xs text-muted-foreground">
          <span className="text-foreground/80">rust.journey</span>{" "}
          <span className="opacity-60">
            // documenting the compile errors so you don't have to.
          </span>
        </div>
        <div className="text-mono text-xs text-muted-foreground">
          © {new Date().getFullYear()} — Built in public.
        </div>
      </div>
    </footer>
  );
}
