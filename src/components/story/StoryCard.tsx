import { Link } from "@tanstack/react-router";
import { Clock, Calendar, Lock, Coins, HandHeart } from "lucide-react";
import type { Story } from "@/data/stories";
import { DifficultyBadge } from "./DifficultyBadge";
import { Tag } from "./Tag";
import { formatDate } from "@/lib/format";

interface Props {
  story: Story;
  featured?: boolean;
}

export function StoryCard({ story, featured }: Props) {
  return (
    <Link
      to="/stories/$slug"
      params={{ slug: story.slug }}
      className={`group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-all hover:border-primary/40 hover:-translate-y-0.5 ${
        featured ? "md:flex-row" : ""
      }`}
    >
      <div
        className={`relative overflow-hidden bg-surface-2 ${
          featured ? "md:w-1/2 aspect-[16/10] md:aspect-auto" : "aspect-[16/9]"
        }`}
      >
        <img
          src={story.cover}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/70 via-background/0 to-transparent" />
        <div className="absolute left-3 top-3 flex gap-2">
          <DifficultyBadge level={story.difficulty} />
        </div>
        {story.monetization === "locked" ? (
          <div className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-md border border-primary/40 bg-background/80 backdrop-blur px-2 py-0.5 text-mono text-[10px] text-primary">
            <Lock className="h-3 w-3" /> {story.unlockPrice} <Coins className="h-3 w-3" />
          </div>
        ) : story.monetization === "tips" || story.tipEnabled ? (
          <div className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-md border border-border bg-background/80 backdrop-blur px-2 py-0.5 text-mono text-[10px] text-muted-foreground">
            <HandHeart className="h-3 w-3 text-primary" /> Tips
          </div>
        ) : null}
      </div>

      <div className={`flex flex-col p-5 ${featured ? "md:w-1/2 md:p-8" : ""}`}>
        <div className="text-mono text-[11px] uppercase tracking-wider text-primary/80 mb-2">
          {story.category}
        </div>
        <h3
          className={`font-semibold leading-tight tracking-tight text-foreground group-hover:text-primary transition-colors ${
            featured ? "text-2xl md:text-3xl" : "text-lg"
          }`}
        >
          {story.title}
        </h3>
        <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
          {story.shortDescription}
        </p>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {story.tags.slice(0, 4).map((t) => (
            <Tag key={t} label={t} />
          ))}
        </div>

        <div className="mt-auto pt-4 flex items-center gap-4 text-[11px] text-mono text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {formatDate(story.createdAt)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {story.readingMinutes} min
          </span>
        </div>
      </div>
    </Link>
  );
}
