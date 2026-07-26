import type { Difficulty } from "@/data/stories";

const styles: Record<Difficulty, string> = {
  Beginner: "bg-success/10 text-success ring-success/25",
  Intermediate: "bg-warning/10 text-warning ring-warning/25",
  Advanced: "bg-destructive/10 text-destructive ring-destructive/25",
};

export function DifficultyBadge({ level }: { level: Difficulty | null | undefined }) {
  if (!level) return null;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider text-mono ring-1 ring-inset ${styles[level]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {level}
    </span>
  );
}
