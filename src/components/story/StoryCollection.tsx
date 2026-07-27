import { useState } from "react";
import { ChevronLeft, ChevronRight, Rows3, Columns3 } from "lucide-react";
import type { Story, CardVariant } from "@/data/stories";
import { StoryCardView, cardVariantLabels } from "./StoryCards";
import { useRef } from "react";

export type CollectionView = "horizontal" | "vertical";

interface Props {
  title: string;
  eyebrow?: string;
  stories: Story[];
  writerNames?: Record<string, string | null | undefined>;
  /** Initial orientation. */
  defaultView?: CollectionView;
  /** Card style used in the horizontal rail. */
  horizontalVariant?: CardVariant;
  /** Card style used in the vertical stack. */
  verticalVariant?: CardVariant;
  /** Show the card-style picker next to the view toggle. */
  allowVariantChange?: boolean;
}

/**
 * A story collection that can be viewed horizontally (scrolling rail) or
 * vertically (stacked compact rows). Used across landing, stories and journeys.
 */
export function StoryCollection({
  title,
  eyebrow,
  stories,
  writerNames,
  defaultView = "horizontal",
  horizontalVariant = "poster",
  verticalVariant = "row",
  allowVariantChange = false,
}: Props) {
  const [view, setView] = useState<CollectionView>(defaultView);
  const [variant, setVariant] = useState<CardVariant | null>(null);
  const scroller = useRef<HTMLDivElement | null>(null);

  if (stories.length === 0) return null;

  const activeVariant =
    variant ?? (view === "horizontal" ? horizontalVariant : verticalVariant);

  const scroll = (dir: 1 | -1) => {
    const el = scroller.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
  };

  const toggleBtn = (active: boolean) =>
    `inline-flex items-center gap-1.5 rounded px-2.5 py-1.5 text-mono text-[11px] transition ${
      active ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"
    }`;

  return (
    <section className="container-page py-8 md:py-10">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4 mb-4 sm:flex sm:justify-between">
        <div className="min-w-0">
          {eyebrow ? (
            <div className="text-mono text-[11px] uppercase tracking-widest text-primary">
              {eyebrow}
            </div>
          ) : null}
          <h2 className="mt-1 truncate text-2xl font-display tracking-tight md:text-3xl">
            {title}
          </h2>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {allowVariantChange ? (
            <select
              value={activeVariant}
              onChange={(e) => setVariant(e.target.value as CardVariant)}
              aria-label="Card style"
              className="rounded-md border border-border bg-background px-2 py-1.5 text-mono text-[11px] text-muted-foreground outline-none focus:border-primary/60"
            >
              {(Object.keys(cardVariantLabels) as CardVariant[]).map((v) => (
                <option key={v} value={v}>
                  {cardVariantLabels[v]} card
                </option>
              ))}
            </select>
          ) : null}
          <div className="inline-flex rounded-md border border-border bg-background p-0.5">
            <button
              onClick={() => {
                setView("horizontal");
                setVariant(null);
              }}
              className={toggleBtn(view === "horizontal")}
              aria-pressed={view === "horizontal"}
            >
              <Columns3 className="h-3.5 w-3.5" /> Horizontal
            </button>
            <button
              onClick={() => {
                setView("vertical");
                setVariant(null);
              }}
              className={toggleBtn(view === "vertical")}
              aria-pressed={view === "vertical"}
            >
              <Rows3 className="h-3.5 w-3.5" /> Vertical
            </button>
          </div>
          {view === "horizontal" ? (
            <div className="hidden items-center gap-2 md:flex">
              <button
                onClick={() => scroll(-1)}
                aria-label="Scroll left"
                className="grid h-9 w-9 place-items-center rounded-full border border-border bg-surface/70 transition hover:border-primary/40 hover:text-primary"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => scroll(1)}
                aria-label="Scroll right"
                className="grid h-9 w-9 place-items-center rounded-full border border-border bg-surface/70 transition hover:border-primary/40 hover:text-primary"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {view === "horizontal" ? (
        <div
          ref={scroller}
          className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-4 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {stories.map((s) => (
            <div
              key={s.id}
              className={`shrink-0 snap-start ${
                activeVariant === "poster"
                  ? "w-[260px] md:w-[300px]"
                  : activeVariant === "feature"
                    ? "w-[560px] max-w-[85vw]"
                    : "w-[340px] max-w-[85vw]"
              }`}
            >
              <StoryCardView
                variant={activeVariant}
                story={s}
                writerName={s.creatorId ? writerNames?.[s.creatorId] : null}
              />
            </div>
          ))}
        </div>
      ) : (
        <div
          className={
            activeVariant === "poster"
              ? "grid gap-4 sm:grid-cols-3 lg:grid-cols-5"
              : activeVariant === "minimal"
                ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
                : "flex flex-col gap-3"
          }
        >
          {stories.map((s) => (
            <StoryCardView
              key={s.id}
              variant={activeVariant}
              story={s}
              writerName={s.creatorId ? writerNames?.[s.creatorId] : null}
            />
          ))}
        </div>
      )}
    </section>
  );
}
