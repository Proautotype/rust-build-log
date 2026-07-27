import { Link } from "@tanstack/react-router";
import { Clock, Calendar, Lock, Coins, HandHeart, Eye, UserRound, ArrowRight } from "lucide-react";
import type { Story, CardVariant } from "@/data/stories";
import { DifficultyBadge } from "./DifficultyBadge";
import { Tag } from "./Tag";
import { formatDate } from "@/lib/format";

export interface StoryCardProps {
  story: Story;
  writerName?: string | null;
  className?: string;
}

function MonetizationBadge({ story, dark }: { story: Story; dark?: boolean }) {
  const base = dark
    ? "bg-background/80 backdrop-blur"
    : "bg-surface-2";
  if (story.monetization === "locked") {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-md border border-primary/40 ${base} px-2 py-0.5 text-mono text-[10px] text-primary`}
      >
        <Lock className="h-3 w-3" /> {story.unlockPrice} <Coins className="h-3 w-3" />
      </span>
    );
  }
  if (story.monetization === "tips" || story.tipEnabled) {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-md border border-border ${base} px-2 py-0.5 text-mono text-[10px] text-muted-foreground`}
      >
        <HandHeart className="h-3 w-3 text-primary" /> Tips
      </span>
    );
  }
  return null;
}

function Meta({ story }: { story: Story }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-mono text-[11px] text-muted-foreground">
      <span className="inline-flex items-center gap-1">
        <Calendar className="h-3 w-3" />
        {formatDate(story.createdAt)}
      </span>
      <span className="inline-flex items-center gap-1">
        <Clock className="h-3 w-3" />
        {story.readingMinutes} min
      </span>
      <span className="inline-flex items-center gap-1" title="Views">
        <Eye className="h-3 w-3" />
        {story.viewCount.toLocaleString()}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Poster card — tall, cover-dominant (Netflix style)                 */
/* ------------------------------------------------------------------ */

export function PosterStoryCard({ story, writerName, className }: StoryCardProps) {
  return (
    <Link
      to="/stories/$slug"
      params={{ slug: story.slug }}
      className={`group/card relative block aspect-[2/3] overflow-hidden rounded-xl border border-border bg-card transition-all hover:border-primary/50 hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary/10 ${className ?? ""}`}
    >
      <img
        src={story.cover}
        alt=""
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover/card:scale-110"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
      <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
        {story.difficulty ? <DifficultyBadge level={story.difficulty} /> : <span />}
        <MonetizationBadge story={story} dark />
      </div>
      <div className="absolute inset-x-0 bottom-0 p-4">
        <div className="text-mono text-[10px] uppercase tracking-widest text-primary/80 mb-1">
          {story.category}
        </div>
        <h3 className="text-base md:text-lg font-semibold leading-tight text-foreground line-clamp-2 group-hover/card:text-primary transition-colors">
          {story.title}
        </h3>
        {writerName ? (
          <div className="mt-1 inline-flex items-center gap-1 text-mono text-[10px] text-muted-foreground">
            <UserRound className="h-3 w-3" /> {writerName}
          </div>
        ) : null}
        <div className="mt-2 flex items-center gap-3 text-mono text-[10px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" /> {story.readingMinutes}m
          </span>
          <span className="inline-flex items-center gap-1">
            <Eye className="h-3 w-3" /> {story.viewCount.toLocaleString()}
          </span>
        </div>
      </div>
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/*  Compact row card — thumbnail left, meta right                      */
/* ------------------------------------------------------------------ */

export function RowStoryCard({ story, writerName, className }: StoryCardProps) {
  return (
    <Link
      to="/stories/$slug"
      params={{ slug: story.slug }}
      className={`group grid grid-cols-[88px_minmax(0,1fr)] items-center gap-4 rounded-lg border border-border bg-card p-3 transition-all hover:border-primary/40 sm:grid-cols-[140px_minmax(0,1fr)] ${className ?? ""}`}
    >
      <div className="aspect-[16/10] shrink-0 overflow-hidden rounded-md bg-surface-2">
        <img
          src={story.cover}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-mono text-[10px] uppercase tracking-widest text-primary/80">
            {story.category}
          </span>
          <span className="shrink-0">
            <MonetizationBadge story={story} />
          </span>
        </div>
        <h3 className="mt-0.5 truncate text-base font-semibold text-foreground transition-colors group-hover:text-primary">
          {story.title}
        </h3>
        <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">
          {story.shortDescription}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-mono text-[10px] text-muted-foreground">
          {writerName ? (
            <span className="inline-flex items-center gap-1">
              <UserRound className="h-3 w-3" /> {writerName}
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" /> {story.readingMinutes}m
          </span>
          <span className="inline-flex items-center gap-1">
            <Eye className="h-3 w-3" /> {story.viewCount.toLocaleString()}
          </span>
          {story.difficulty ? <DifficultyBadge level={story.difficulty} /> : null}
        </div>
      </div>
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/*  Wide feature card — landscape, description + writer                */
/* ------------------------------------------------------------------ */

export function FeatureStoryCard({ story, writerName, className }: StoryCardProps) {
  return (
    <Link
      to="/stories/$slug"
      params={{ slug: story.slug }}
      className={`group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-all hover:border-primary/40 hover:-translate-y-0.5 md:flex-row ${className ?? ""}`}
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-surface-2 md:aspect-auto md:w-1/2">
        <img
          src={story.cover}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/70 to-transparent" />
        <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
          {story.difficulty ? <DifficultyBadge level={story.difficulty} /> : <span />}
          <MonetizationBadge story={story} dark />
        </div>
      </div>
      <div className="flex flex-col p-5 md:w-1/2 md:p-8">
        <div className="text-mono text-[11px] uppercase tracking-wider text-primary/80">
          {story.category}
        </div>
        <h3 className="mt-2 text-2xl font-semibold leading-tight tracking-tight text-foreground transition-colors group-hover:text-primary md:text-3xl">
          {story.title}
        </h3>
        {writerName ? (
          <div className="mt-1 inline-flex items-center gap-1 text-mono text-[11px] text-muted-foreground">
            <UserRound className="h-3 w-3" /> by{" "}
            <span className="text-foreground/90">{writerName}</span>
          </div>
        ) : null}
        <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{story.shortDescription}</p>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {story.tags.slice(0, 4).map((t) => (
            <Tag key={t} label={t} />
          ))}
        </div>
        <div className="mt-auto pt-5">
          <Meta story={story} />
          <span className="mt-3 inline-flex items-center gap-1.5 text-mono text-[11px] text-primary">
            Read story <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/*  Minimal text card — no imagery                                     */
/* ------------------------------------------------------------------ */

export function MinimalStoryCard({ story, writerName, className }: StoryCardProps) {
  return (
    <Link
      to="/stories/$slug"
      params={{ slug: story.slug }}
      className={`group flex flex-col rounded-lg border border-border bg-card p-5 transition-all hover:border-primary/40 hover:bg-surface-2/40 ${className ?? ""}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-mono text-[10px] uppercase tracking-widest text-primary/80">
          {story.category}
        </span>
        <MonetizationBadge story={story} />
      </div>
      <h3 className="mt-2 text-lg font-semibold leading-snug text-foreground transition-colors group-hover:text-primary">
        {story.title}
      </h3>
      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{story.shortDescription}</p>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {story.tags.slice(0, 3).map((t) => (
          <Tag key={t} label={t} />
        ))}
      </div>
      <div className="mt-4 border-t border-border/60 pt-3">
        {writerName ? (
          <div className="mb-1 inline-flex items-center gap-1 text-mono text-[11px] text-muted-foreground">
            <UserRound className="h-3 w-3" /> {writerName}
          </div>
        ) : null}
        <Meta story={story} />
      </div>
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/*  Variant dispatcher                                                 */
/* ------------------------------------------------------------------ */

export const cardVariantLabels: Record<CardVariant, string> = {
  poster: "Poster",
  row: "Compact row",
  feature: "Wide feature",
  minimal: "Minimal text",
};

export function StoryCardView({
  variant,
  ...props
}: StoryCardProps & { variant: CardVariant }) {
  switch (variant) {
    case "row":
      return <RowStoryCard {...props} />;
    case "feature":
      return <FeatureStoryCard {...props} />;
    case "minimal":
      return <MinimalStoryCard {...props} />;
    case "poster":
    default:
      return <PosterStoryCard {...props} />;
  }
}
