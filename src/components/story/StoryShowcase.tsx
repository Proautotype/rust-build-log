import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Play, Lock, Coins, HandHeart, Flame, Clock } from "lucide-react";
import type { Story } from "@/data/stories";
import { DifficultyBadge } from "./DifficultyBadge";

interface SpotlightProps {
  stories: Story[];
}

export function Spotlight({ stories }: SpotlightProps) {
  const [idx, setIdx] = useState(0);
  const items = stories.slice(0, 5);

  useEffect(() => {
    if (items.length <= 1) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % items.length), 6000);
    return () => clearInterval(t);
  }, [items.length]);

  if (items.length === 0) return null;
  const s = items[idx];
  const locked = s.monetization === "locked";
  const tips = s.monetization === "tips" || s.tipEnabled;

  return (
    <section className="relative h-[78vh] min-h-[520px] max-h-[780px] overflow-hidden border-b border-border/60">
      {items.map((it, i) => (
        <div
          key={it.id}
          className={`absolute inset-0 transition-opacity duration-1000 ${
            i === idx ? "opacity-100" : "opacity-0"
          }`}
          aria-hidden={i !== idx}
        >
          <img src={it.cover} alt="" className="h-full w-full object-cover scale-105" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-background/20" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        </div>
      ))}

      <div className="relative container-page h-full flex items-end pb-24 md:pb-28">
        <div className="max-w-2xl animate-fade-in" key={s.id}>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="inline-flex items-center gap-1 rounded-md bg-primary/15 border border-primary/40 px-2 py-0.5 text-mono text-[10px] uppercase tracking-widest text-primary">
              <Flame className="h-3 w-3" /> Featured
            </span>
            <DifficultyBadge level={s.difficulty} />
            <span className="text-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              {s.category}
            </span>
            {locked && (
              <span className="inline-flex items-center gap-1 rounded-md border border-primary/40 bg-background/70 px-2 py-0.5 text-mono text-[10px] text-primary">
                <Lock className="h-3 w-3" /> {s.unlockPrice} <Coins className="h-3 w-3" />
              </span>
            )}
            {tips && !locked && (
              <span className="inline-flex items-center gap-1 rounded-md border border-border bg-background/70 px-2 py-0.5 text-mono text-[10px] text-muted-foreground">
                <HandHeart className="h-3 w-3 text-primary" /> Tips
              </span>
            )}
          </div>

          <h1 className="text-4xl md:text-6xl font-display tracking-tight leading-[1.02] text-foreground">
            {s.title}
          </h1>
          <p className="mt-4 text-base md:text-lg text-muted-foreground leading-relaxed line-clamp-3">
            {s.shortDescription}
          </p>

          <div className="mt-6 flex items-center gap-3 text-mono text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" /> {s.readingMinutes} min read
            </span>
            {s.tags.slice(0, 3).map((t) => (
              <span key={t} className="text-primary/80">#{t}</span>
            ))}
          </div>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              to="/stories/$slug"
              params={{ slug: s.slug }}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 transition"
            >
              <Play className="h-4 w-4 fill-current" />
              {locked ? `Unlock (${s.unlockPrice} coins)` : "Read now"}
            </Link>
            <Link
              to="/stories"
              className="inline-flex items-center gap-2 rounded-md border border-border bg-surface/70 backdrop-blur px-5 py-2.5 text-sm text-foreground hover:border-primary/40 transition"
            >
              More stories
            </Link>
          </div>

          {items.length > 1 && (
            <div className="mt-8 flex items-center gap-2">
              {items.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIdx(i)}
                  aria-label={`Show story ${i + 1}`}
                  className={`h-1 rounded-full transition-all ${
                    i === idx ? "w-8 bg-primary" : "w-4 bg-muted-foreground/30 hover:bg-muted-foreground/60"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

interface RowProps {
  title: string;
  eyebrow?: string;
  stories: Story[];
}

export function StoryRow({ title, eyebrow, stories }: RowProps) {
  const scroller = useRef<HTMLDivElement | null>(null);

  const scroll = (dir: 1 | -1) => {
    const el = scroller.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
  };

  if (stories.length === 0) return null;

  return (
    <section className="container-page py-8 md:py-10 group/row">
      <div className="flex items-end justify-between gap-4 mb-4">
        <div>
          {eyebrow && (
            <div className="text-mono text-[11px] uppercase tracking-widest text-primary">
              {eyebrow}
            </div>
          )}
          <h2 className="mt-1 text-2xl md:text-3xl font-display tracking-tight">{title}</h2>
        </div>
        <div className="hidden md:flex items-center gap-2">
          <button
            onClick={() => scroll(-1)}
            className="h-9 w-9 grid place-items-center rounded-full border border-border bg-surface/70 hover:border-primary/40 hover:text-primary transition"
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => scroll(1)}
            className="h-9 w-9 grid place-items-center rounded-full border border-border bg-surface/70 hover:border-primary/40 hover:text-primary transition"
            aria-label="Scroll right"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div
        ref={scroller}
        className="flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-4 -mx-4 px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {stories.map((s) => (
          <PosterCard key={s.id} story={s} />
        ))}
      </div>
    </section>
  );
}

function PosterCard({ story }: { story: Story }) {
  const locked = story.monetization === "locked";
  const tips = story.monetization === "tips" || story.tipEnabled;
  return (
    <Link
      to="/stories/$slug"
      params={{ slug: story.slug }}
      className="group/card relative shrink-0 snap-start w-[260px] md:w-[300px] aspect-[2/3] overflow-hidden rounded-xl border border-border bg-card transition-all hover:border-primary/50 hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary/10"
    >
      <img
        src={story.cover}
        alt=""
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover/card:scale-110"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />

      <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2">
        <DifficultyBadge level={story.difficulty} />
        {locked ? (
          <span className="inline-flex items-center gap-1 rounded-md border border-primary/40 bg-background/80 backdrop-blur px-2 py-0.5 text-mono text-[10px] text-primary">
            <Lock className="h-3 w-3" /> {story.unlockPrice} <Coins className="h-3 w-3" />
          </span>
        ) : tips ? (
          <span className="inline-flex items-center gap-1 rounded-md border border-border bg-background/80 backdrop-blur px-2 py-0.5 text-mono text-[10px] text-muted-foreground">
            <HandHeart className="h-3 w-3 text-primary" />
          </span>
        ) : null}
      </div>

      <div className="absolute inset-x-0 bottom-0 p-4">
        <div className="text-mono text-[10px] uppercase tracking-widest text-primary/80 mb-1">
          {story.category}
        </div>
        <h3 className="text-base md:text-lg font-semibold leading-tight text-foreground line-clamp-2 group-hover/card:text-primary transition-colors">
          {story.title}
        </h3>
        <div className="mt-2 flex items-center gap-3 text-mono text-[10px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" /> {story.readingMinutes}m
          </span>
          {story.tags.slice(0, 2).map((t) => (
            <span key={t}>#{t}</span>
          ))}
        </div>
      </div>
    </Link>
  );
}
