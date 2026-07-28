import { Check } from "lucide-react";
import { TOPICS } from "@/data/topics";

interface Props {
  selected: string[];
  onToggle: (id: string) => void;
  /** Compact chips for inline strips; large tiles for onboarding. */
  size?: "sm" | "lg";
  className?: string;
}

/** Topic picker used on signup, the profile page and the home feed strip. */
export function TopicPicker({ selected, onToggle, size = "sm", className = "" }: Props) {
  if (size === "lg") {
    return (
      <div className={`grid grid-cols-2 gap-2 sm:grid-cols-3 ${className}`}>
        {TOPICS.map((t) => {
          const on = selected.includes(t.id);
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onToggle(t.id)}
              aria-pressed={on}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                on
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border bg-surface text-muted-foreground hover:border-border-strong hover:text-foreground"
              }`}
            >
              <span aria-hidden className="text-base">
                {t.emoji}
              </span>
              <span className="min-w-0 flex-1 truncate font-medium">{t.label}</span>
              {on ? <Check className="h-3.5 w-3.5 shrink-0 text-primary" /> : null}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {TOPICS.map((t) => {
        const on = selected.includes(t.id);
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onToggle(t.id)}
            aria-pressed={on}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
              on
                ? "border-primary bg-primary/15 text-primary"
                : "border-border bg-surface text-muted-foreground hover:border-border-strong hover:text-foreground"
            }`}
          >
            <span aria-hidden>{t.emoji}</span>
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
