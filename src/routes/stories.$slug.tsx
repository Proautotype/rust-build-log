import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Calendar, Clock, GitCommit } from "lucide-react";
import {
  getStoryBySlug,
  getRelatedStories,
  getAdjacentStories,
  getJourneyForStory,
  getStoriesForJourney,
} from "@/data/stories";
import { ContentRenderer } from "@/components/story/ContentRenderer";
import { TableOfContents } from "@/components/story/TableOfContents";
import { DifficultyBadge } from "@/components/story/DifficultyBadge";
import { StoryCard } from "@/components/story/StoryCard";
import { Tag } from "@/components/story/Tag";
import { formatDateLong } from "@/lib/format";

export const Route = createFileRoute("/stories/$slug")({
  loader: ({ params }) => {
    const story = getStoryBySlug(params.slug);
    if (!story) throw notFound();
    return { story };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Story not found — Rust Journey" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const { story } = loaderData;
    return {
      meta: [
        { title: `${story.title} — Rust Journey` },
        { name: "description", content: story.shortDescription },
        { property: "og:title", content: story.title },
        { property: "og:description", content: story.shortDescription },
        { property: "og:type", content: "article" },
        { property: "og:image", content: story.cover },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:image", content: story.cover },
      ],
    };
  },
  component: StoryDetail,
});

function StoryDetail() {
  const { story } = Route.useLoaderData();
  const related = getRelatedStories(story);
  const { prev, next } = getAdjacentStories(story);
  const journey = getJourneyForStory(story);
  const journeyStories = journey ? getStoriesForJourney(journey) : [];
  const journeyIndex = journey ? journey.storyIds.indexOf(story.id) : -1;

  return (
    <article>
      {/* Header / hero */}
      <header className="relative overflow-hidden border-b border-border/60">
        <div className="absolute inset-0">
          <img
            src={story.cover}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-25"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background" />
        </div>

        <div className="container-page relative py-14 md:py-20">
          <Link
            to="/stories"
            className="inline-flex items-center gap-1.5 text-mono text-[11px] uppercase tracking-widest text-muted-foreground hover:text-primary"
          >
            <ArrowLeft className="h-3 w-3" />
            Back to stories
          </Link>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <span className="text-mono text-[11px] uppercase tracking-widest text-primary">
              {story.category}
            </span>
            <span className="text-muted-foreground/50">·</span>
            <DifficultyBadge level={story.difficulty} />
          </div>

          <h1 className="mt-4 max-w-3xl text-4xl md:text-5xl lg:text-6xl font-display tracking-tight leading-[1.05]">
            {story.title}
          </h1>

          <p className="mt-5 max-w-2xl text-lg text-muted-foreground leading-relaxed">
            {story.shortDescription}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-mono text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              {formatDateLong(story.createdAt)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              {story.readingMinutes} min read
            </span>
            {story.updatedAt !== story.createdAt ? (
              <span className="inline-flex items-center gap-1.5">
                <GitCommit className="h-3.5 w-3.5" />
                Updated {formatDateLong(story.updatedAt)}
              </span>
            ) : null}
          </div>

          <div className="mt-4 flex flex-wrap gap-1.5">
            {story.tags.map((t) => (
              <Tag key={t} label={t} />
            ))}
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="container-page py-12">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_240px]">
          <div className="min-w-0 max-w-2xl">
            <ContentRenderer blocks={story.content} />

            {/* Prev / next */}
            <div className="mt-16 grid gap-3 md:grid-cols-2 border-t border-border pt-8">
              {prev ? (
                <Link
                  to="/stories/$slug"
                  params={{ slug: prev.slug }}
                  className="group rounded-lg border border-border bg-surface p-4 hover:border-primary/40 transition"
                >
                  <div className="text-mono text-[11px] uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1">
                    <ArrowLeft className="h-3 w-3" /> Previous
                  </div>
                  <div className="mt-1 font-medium text-foreground group-hover:text-primary transition-colors">
                    {prev.title}
                  </div>
                </Link>
              ) : (
                <div />
              )}
              {next ? (
                <Link
                  to="/stories/$slug"
                  params={{ slug: next.slug }}
                  className="group rounded-lg border border-border bg-surface p-4 hover:border-primary/40 transition md:text-right"
                >
                  <div className="text-mono text-[11px] uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1 md:justify-end w-full">
                    Next <ArrowRight className="h-3 w-3" />
                  </div>
                  <div className="mt-1 font-medium text-foreground group-hover:text-primary transition-colors">
                    {next.title}
                  </div>
                </Link>
              ) : null}
            </div>
          </div>

          {/* Sidebar */}
          <aside className="hidden lg:block">
            <div className="sticky top-20 space-y-8">
              <TableOfContents blocks={story.content} />

              {journey && journeyStories.length > 0 ? (
                <div>
                  <div className="text-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-3">
                    Journey progress
                  </div>
                  <div className="text-sm mb-3">
                    <div className="font-medium text-foreground">{journey.title}</div>
                    <div className="text-mono text-[11px] text-muted-foreground">
                      Step {journeyIndex + 1} of {journeyStories.length}
                    </div>
                  </div>
                  <div className="h-1 rounded-full bg-surface-2 overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{
                        width: `${((journeyIndex + 1) / journeyStories.length) * 100}%`,
                      }}
                    />
                  </div>
                  <ul className="mt-4 space-y-1.5 border-l border-border">
                    {journeyStories.map((s, i) => (
                      <li key={s.id}>
                        <Link
                          to="/stories/$slug"
                          params={{ slug: s.slug }}
                          className={`block border-l-2 -ml-px pl-3 py-0.5 text-sm transition-colors border-transparent hover:border-primary hover:text-primary ${
                            s.id === story.id
                              ? "text-primary border-primary"
                              : "text-muted-foreground"
                          }`}
                        >
                          <span className="text-mono text-[10px] mr-1.5 opacity-60">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          {s.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </aside>
        </div>

        {/* Related */}
        {related.length > 0 ? (
          <section className="mt-16 border-t border-border pt-12">
            <div className="text-mono text-[11px] uppercase tracking-widest text-primary">
              Keep reading
            </div>
            <h2 className="mt-2 text-2xl md:text-3xl font-display tracking-tight">
              Related stories
            </h2>
            <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {related.map((s) => (
                <StoryCard key={s.id} story={s} />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </article>
  );
}
