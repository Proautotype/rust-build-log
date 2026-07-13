export function Tag({ label, active }: { label: string; active?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] text-mono transition-colors ${
        active
          ? "border-primary/50 bg-primary/10 text-primary"
          : "border-border bg-surface-2 text-muted-foreground"
      }`}
    >
      <span className="opacity-60">#</span>
      {label}
    </span>
  );
}
