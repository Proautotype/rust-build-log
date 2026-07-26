import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ArrowRight, Sparkles, GitBranch, BookOpen, Loader2, Search, X } from "lucide-react";
import { StoryCard } from "@/components/story/StoryCard";
import { Spotlight, StoryRow } from "@/components/story/StoryShowcase";
import { heroImage, rowToJourney, rowToStory, technologies } from "@/data/stories";
import { formatDate } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Right2Read — Stories worth your time" },
      {
        name: "description",
        content:
          "Right2Read is a home for developer stories, tutorials and learning journeys. Read, follow writers, and support creators with tips.",
      },
      { property: "og:title", content: "Right2Read — Stories worth your time" },
      {
        property: "og:description",
        content:
          "A home for developer stories, tutorials and learning journeys. Read, follow writers, and support creators.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://right2read.lovable.app/" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Right2Read — Stories worth your time" },
    ],
    links: [{ rel: "canonical", href: "https://right2read.lovable.app/" }],
  }),
  component: HomePage,
});

function HomePage() {
  const { data, isLoading } = useQuery({
    queryKey: ["home-data"],
    queryFn: async () => {
      const [s, j] = await Promise.all([
        supabase
          .from("stories")
          .select("*")
          .eq("published", true)
          .order("created_at", { ascending: false }),
        supabase.from("journeys").select("*").order("started_at", { ascending: false }),
      ]);
      return {
        stories: (s.data ?? []).map(rowToStory),
        journeys: (j.data ?? []).map(rowToJourney),
      };
    },
  });

  const stories = data?.stories ?? [];
  const journeys = data?.journeys ?? [];
  const featured = journeys[0];
  const featuredStories = useMemo(
    () => (featured ? stories.filter((s) => s.journeyId === featured.id) : []),
    [featured, stories],
  );
  const latest = stories.slice(0, 6);
  const promotedStories = useMemo(() => stories.filter((s) => s.promoted), [stories]);
  const paidStories = useMemo(() => stories.filter((s) => s.monetization === "locked"), [stories]);
  const topStories = useMemo(() => {
    const scored = stories.map((s) => ({
      s,
      score:
        (s.promoted ? 5 : 0) +
        (s.monetization === "locked" ? 3 : s.tipEnabled ? 2 : 1) * 10 +
        s.readingMinutes,
    }));
    return scored
      .sort((a, b) => b.score - a.score)
      .map((x) => x.s)
      .slice(0, 12);
  }, [stories]);
  const spotlight = useMemo(() => {
    const promoted = promotedStories.slice(0, 3);
    const paid = paidStories.filter((s) => !promoted.includes(s)).slice(0, 2);
    const rest = stories
      .filter((s) => !promoted.includes(s) && !paid.includes(s))
      .slice(0, 5 - promoted.length - paid.length);
    return [...promoted, ...paid, ...rest];
  }, [promotedStories, paidStories, stories]);
  const allTags = useMemo(
    () => Array.from(new Set(stories.flatMap((s) => s.tags))).sort(),
    [stories],
  );
  const popularTags = allTags.slice(0, 12);

  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const searchResults = useMemo(() => {
    if (!q) return [];
    return stories.filter((s) => {
      const hay = [s.title, s.shortDescription, s.category, s.difficulty, ...s.tags]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [q, stories]);

  return (
    <div>
      <Spotlight stories={spotlight} />

      <section className="container-page pt-6 pb-2">
        <div className="relative mx-auto max-w-2xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search stories, tags, categories…"
            aria-label="Search stories"
            className="w-full rounded-full border border-border bg-surface pl-10 pr-10 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
          {query ? (
            <button
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </section>

      {q ? (
        <section className="container-page pb-8 pt-4">
          <div className="mb-4 text-mono text-xs text-muted-foreground">
            {searchResults.length === 0
              ? `No results for "${query}"`
              : `${searchResults.length} result${searchResults.length === 1 ? "" : "s"} for "${query}"`}
          </div>
          {searchResults.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {searchResults.map((s) => (
                <StoryCard key={s.id} story={s} />
              ))}
            </div>
          ) : null}
        </section>
      ) : (
        <>
          {promotedStories.length > 0 ? (
            <StoryRow eyebrow="Promoted" title="Featured by writers" stories={promotedStories} />
          ) : null}
          <StoryRow eyebrow="Premium" title="Paid stories" stories={paidStories} />
          <StoryRow eyebrow="Trending" title="Top stories" stories={topStories} />
          <StoryRow eyebrow="Fresh" title="New releases" stories={stories.slice(0, 12)} />
        </>
      )}

      <section className="container-page pt-4 pb-8">
        <div className="flex flex-wrap gap-x-8 gap-y-2 text-mono text-xs text-muted-foreground">
          <div>
            <span className="text-foreground">{stories.length}</span> stories
          </div>
          <div>
            <span className="text-foreground">{journeys.length}</span> journey
            {journeys.length === 1 ? "" : "s"}
          </div>
          <div>
            <span className="text-foreground">{allTags.length}</span> topics
          </div>
          {featured ? (
            <div>
              Started <span className="text-foreground">{formatDate(featured.startedAt)}</span>
            </div>
          ) : null}
        </div>
      </section>

      {featured && (
        <section className="container-page py-16 md:py-20">
          <SectionHeader
            eyebrow="Featured journey"
            title={featured.title}
            description={featured.description}
          />

          <div className="mt-8 overflow-hidden rounded-2xl border border-border bg-card">
            <div className="grid md:grid-cols-[1.1fr_1fr]">
              <div className="relative aspect-[16/10] md:aspect-auto md:min-h-[380px]">
                <img
                  src={featured.cover || heroImage}
                  alt={featured.title}
                  loading="eager"
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-card via-card/40 to-transparent" />
              </div>
              <div className="p-8 md:p-10 flex flex-col justify-center">
                <div className="text-mono text-[11px] uppercase tracking-widest text-primary">
                  Journey · started {formatDate(featured.startedAt)}
                </div>
                <h3 className="mt-3 text-3xl md:text-4xl font-display tracking-tight">
                  {featured.title}
                </h3>
                <p className="mt-3 text-muted-foreground leading-relaxed">{featured.description}</p>

                <div className="mt-6 space-y-2">
                  {featuredStories.slice(0, 5).map((s, i) => (
                    <Link
                      key={s.id}
                      to="/stories/$slug"
                      params={{ slug: s.slug }}
                      className="flex items-center gap-3 rounded-md border border-border bg-surface-2 px-3 py-2 text-sm text-foreground hover:border-primary/40 transition"
                    >
                      <span className="text-mono text-[11px] text-muted-foreground w-6">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="flex-1 truncate">{s.title}</span>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                    </Link>
                  ))}
                  {featuredStories.length === 0 && (
                    <div className="text-mono text-[11px] text-muted-foreground">
                      No stories in this journey yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="container-page py-16">
        <div className="flex items-end justify-between gap-4">
          <SectionHeader
            eyebrow="Latest"
            title="Recent stories"
            description="Fresh from the compiler."
          />
          <Link
            to="/stories"
            className="text-mono text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1"
          >
            All stories <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {isLoading ? (
          <div className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : latest.length === 0 ? (
          <div className="mt-8 rounded-xl border border-dashed border-border bg-surface p-10 text-center text-muted-foreground">
            <div className="text-mono text-sm">
              // no stories yet — sign in and become a writer to publish.
            </div>
          </div>
        ) : (
          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {latest.map((s) => (
              <StoryCard key={s.id} story={s} />
            ))}
          </div>
        )}
      </section>

      <section className="container-page py-16">
        <div className="grid gap-10 md:grid-cols-2">
          <div>
            <SectionHeader
              eyebrow="Topics"
              title="Popular tags"
              icon={<Sparkles className="h-4 w-4" />}
            />
            <div className="mt-6 flex flex-wrap gap-2">
              {popularTags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 rounded-md border border-border bg-surface-2 px-2.5 py-1 text-mono text-xs text-muted-foreground"
                >
                  <span className="text-primary">#</span>
                  {t}
                </span>
              ))}
              {popularTags.length === 0 && (
                <span className="text-mono text-xs text-muted-foreground">No tags yet.</span>
              )}
            </div>
          </div>

          <div>
            <SectionHeader
              eyebrow="Stack"
              title="Technologies explored"
              icon={<BookOpen className="h-4 w-4" />}
            />
            <div className="mt-6 grid grid-cols-2 gap-3">
              {technologies.map((t) => (
                <div
                  key={t.name}
                  className="rounded-lg border border-border bg-surface p-3 hover:border-primary/40 transition"
                >
                  <div className="text-mono text-sm font-semibold text-foreground">{t.name}</div>
                  <div className="text-mono text-[11px] text-muted-foreground mt-0.5">{t.note}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="container-page pb-20">
        <div className="rounded-2xl border border-border bg-gradient-to-br from-surface to-surface-2 p-8 md:p-10 relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-40"
            style={{
              background:
                "radial-gradient(500px 200px at 100% 0%, color-mix(in oklab, var(--rust) 25%, transparent), transparent 60%)",
            }}
            aria-hidden
          />
          <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="max-w-xl">
              <div className="text-mono text-[11px] uppercase tracking-widest text-primary">
                Progress
              </div>
              <h3 className="mt-2 text-2xl md:text-3xl font-display tracking-tight">
                Follow the timeline of every milestone.
              </h3>
              <p className="mt-2 text-muted-foreground">
                From the first `cargo new` to shipping real tools — see how the journey unfolds.
              </p>
            </div>
            <Link
              to="/timeline"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition"
            >
              Open timeline
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
  icon,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <div className="inline-flex items-center gap-2 text-mono text-[11px] uppercase tracking-widest text-primary">
        {icon}
        {eyebrow}
      </div>
      <h2 className="mt-2 text-3xl md:text-4xl font-display tracking-tight">{title}</h2>
      {description ? <p className="mt-2 max-w-2xl text-muted-foreground">{description}</p> : null}
    </div>
  );
}
