import type { CSSProperties, ReactNode } from "react";
import type { StoryTheme } from "@/data/stories";

const FONT_STACK: Record<NonNullable<StoryTheme["font"]>, string> = {
  sans: "var(--font-sans, ui-sans-serif, system-ui, sans-serif)",
  serif: "ui-serif, Georgia, 'Times New Roman', serif",
  mono: "var(--font-mono, ui-monospace, SFMono-Regular, monospace)",
  display: "var(--font-display, var(--font-sans, ui-sans-serif, system-ui, sans-serif))",
};

const WIDTH: Record<NonNullable<StoryTheme["width"]>, string> = {
  narrow: "max-w-xl",
  regular: "max-w-2xl",
  wide: "max-w-4xl",
};

const RADIUS: Record<NonNullable<StoryTheme["radius"]>, string> = {
  none: "0px",
  sm: "0.25rem",
  md: "0.5rem",
  lg: "1rem",
};

export function themeWidthClass(theme?: StoryTheme | null) {
  return WIDTH[theme?.width ?? "regular"];
}

/**
 * Scopes a story's custom theme (accent, background, text, font, radius) to its
 * subtree by overriding the semantic design tokens locally — no global leakage.
 */
export function StoryThemeScope({
  theme,
  children,
  className,
}: {
  theme?: StoryTheme | null;
  children: ReactNode;
  className?: string;
}) {
  const t = theme ?? {};
  const style: CSSProperties & Record<string, string> = {} as never;

  if (t.accent) {
    style["--primary"] = t.accent;
    style["--color-primary"] = t.accent;
    style["--ring"] = t.accent;
  }
  if (t.background) {
    style["--background"] = t.background;
    style["--color-background"] = t.background;
  }
  if (t.text) {
    style["--foreground"] = t.text;
    style["--color-foreground"] = t.text;
  }
  if (t.radius) style["--radius"] = RADIUS[t.radius];
  if (t.font) style.fontFamily = FONT_STACK[t.font];

  const themed = Boolean(t.accent || t.background || t.text || t.radius || t.font);

  return (
    <div
      style={style}
      className={[
        themed && t.background ? "bg-background text-foreground" : "",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
}
