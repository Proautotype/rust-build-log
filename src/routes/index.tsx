import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ArrowRight, Loader2, Search, Sparkles, X, Flame, Compass } from "lucide-react";
import { StoryCard } from "@/components/story/StoryCard";
import { Spotlight } from "@/components/story/StoryShowcase";
import { StoryCollection } from "@/components/story/StoryCollection";
import { TopicPicker } from "@/components/feed/TopicPicker";
import { XTrendsRow } from "@/components/feed/XTrendsRow";


import { heroImage, rowToJourney, rowToStory, type Story } from "@/data/stories";
import { TOPIC_BY_ID, topicScore } from "@/data/topics";
import { formatDate } from "@/lib/format";
import { useInterests } from "@/hooks/useInterests";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Right2Read — Your topics, your stories" },
      {
        name: "description",
        content:
          "Right2Read is a reader-first story platform. Pick the topics you care about — sports, politics, culture, tech and more — and get a feed made for you.",
      },
      { property: "og:title", content: "Right2Read — Your topics, your stories" },
      {
        property: "og:description",
        content:
          "Pick the topics you care about — sports, politics, culture, tech and more — and get a story feed made for you.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://right2read.lovable.app/" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Right2Read — Your topics, your stories" },
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

  const { interests, hasInterests, showPrompt, toggle, dismissPrompt } = useInterests();

  const stories = data?.stories ?? [];
  const journeys = data?.journeys ?? [];
  const featured = journeys[0];
  const featuredStories = useMemo(
    () => (featured ? stories.filter((s) => s.journeyId === featured.id) : []),
    [featured, stories],
  );
  const promotedStories = useMemo(() => stories.filter((s) => s.promoted), [stories]);
  const paidStories = useMemo(() => stories.filter((s) => s.monetization === "locked"), [stories]);

  const topStories = useMemo(() => {
    const scored = stories.map((s) => ({
      s,
      score: (s.promoted ? 5 : 0) + s.viewCount * 2 + (s.monetization === "locked" ? 3 : 1),
    }));
    return scored
      .sort((a, b) => b.score - a.score)
      .map((x) => x.s)
      .slice(0, 12);
  }, [stories]);

  /** "For you" — stories ranked against the reader's chosen topics. */
  const forYou = useMemo(() => {
    if (!hasInterests) return [];
    return stories
      .map((s) => ({ s, score: topicScore(s, interests) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score || b.s.viewCount - a.s.viewCount)
      .map((x) => x.s)
      .slice(0, 12);
  }, [stories, interests, hasInterests]);

  /** One row per chosen topic, so a multi-interest reader sees each of them. */
  const topicRows = useMemo(() => {
    if (!hasInterests) return [];
    return interests
      .map((id) => {
        const topic = TOPIC_BY_ID[id];
        if (!topic) return null;
        const matched = stories
          .filter((s) => topicScore(s, [id]) > 0)
          .sort((a, b) => b.viewCount - a.viewCount);
        return matched.length >= 2 ? { topic, stories: matched.slice(0, 12) } : null;
      })
      .filter(Boolean)
      .slice(0, 4) as { topic: (typeof TOPIC_BY_ID)[string]; stories: Story[] }[];
  }, [interests, stories, hasInterests]);

  const spotlight = useMemo(() => {
    const preferred = hasInterests ? forYou.slice(0, 3) : [];
    const promoted = promotedStories.filter((s) => !preferred.includes(s)).slice(0, 2);
    const rest = stories
      .filter((s) => !preferred.includes(s) && !promoted.includes(s))
      .slice(0, 5 - preferred.length - promoted.length);
    return [...preferred, ...promoted, ...rest];
  }, [forYou, hasInterests, promotedStories, stories]);

  const allTags = useMemo(
    () => Array.from(new Set(stories.flatMap((s) => s.tags))).sort(),
    [stories],
  );

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

      {/* Search — always one tap away, no gate for first-time visitors */}
      <section className="container-page pt-6 pb-2">
        <div className="relative mx-auto max-w-2xl">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search stories, tags, topics…"
            aria-label="Search stories"
            className="w-full rounded-full border border-border bg-surface py-3 pl-11 pr-11 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
          {query ? (
            <button
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:text-foreground"
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
          {/* Soft, dismissible personalization nudge — never blocks reading */}
          {showPrompt ? (
            <section className="container-page py-4">
              <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-surface to-surface-2 p-5 md:p-6">
                <button
                  onClick={dismissPrompt}
                  aria-label="Dismiss"
                  className="absolute right-3 top-3 rounded-full p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
                <div className="inline-flex items-center gap-2 text-mono text-[11px] uppercase tracking-widest text-primary">
                  <Sparkles className="h-3.5 w-3.5" /> Make it yours
                </div>
                <h2 className="mt-2 text-2xl font-display md:text-3xl">
                  What are you into?
                </h2>
                <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                  Tap a few topics and your feed rearranges instantly. No account needed — we'll
                  remember on this device and sync it if you sign up later.
                </p>
                <TopicPicker selected={interests} onToggle={toggle} className="mt-4" />
              </div>
            </section>
          ) : null}

          {hasInterests ? (
            <section className="container-page pt-4">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:justify-between">
                <div className="min-w-0">
                  <div className="inline-flex items-center gap-2 text-mono text-[11px] uppercase tracking-widest text-primary">
                    <Compass className="h-3.5 w-3.5" /> Your topics
                  </div>
                </div>
                <Link
                  to="/profile"
                  className="shrink-0 text-mono text-[11px] text-muted-foreground hover:text-primary"
                >
                  Edit
                </Link>
              </div>
              <TopicPicker selected={interests} onToggle={toggle} className="mt-3" />
            </section>
          ) : null}

          {forYou.length > 0 ? (
            <StoryCollection
              eyebrow="For you"
              title="Picked from your topics"
              stories={forYou}
              horizontalVariant="feature"
            />
          ) : null}

          {topicRows.map((row) => (
            <StoryCollection
              key={row.topic.id}
              eyebrow={`${row.topic.emoji} ${row.topic.label}`}
              title={`More in ${row.topic.label}`}
              stories={row.stories}
            />
          ))}

          {promotedStories.length > 0 ? (
            <StoryCollection
              eyebrow="Promoted"
              title="Featured by writers"
              stories={promotedStories}
              horizontalVariant="feature"
            />
          ) : null}
          <StoryCollection eyebrow="Premium" title="Paid stories" stories={paidStories} />
          <StoryCollection
            eyebrow="Trending"
            title="Most read right now"
            stories={topStories}
            allowVariantChange
          />
          <StoryCollection
            eyebrow="Fresh"
            title="New releases"
            stories={stories.slice(0, 12)}
            allowVariantChange
          />
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
            <span className="text-foreground">{allTags.length}</span> tags
          </div>
        </div>
      </section>

      {featured && (
        <section className="container-page py-14 md:py-16">
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
                <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent md:bg-gradient-to-r" />
              </div>
              <div className="flex flex-col justify-center p-8 md:p-10">
                <div className="text-mono text-[11px] uppercase tracking-widest text-primary">
                  Journey · started {formatDate(featured.startedAt)}
                </div>
                <h3 className="mt-3 text-2xl font-display md:text-3xl">{featured.title}</h3>
                <p className="mt-3 leading-relaxed text-muted-foreground">{featured.description}</p>

                <div className="mt-6 space-y-2">
                  {featuredStories.slice(0, 5).map((s, i) => (
                    <Link
                      key={s.id}
                      to="/stories/$slug"
                      params={{ slug: s.slug }}
                      className="flex items-center gap-3 rounded-md border border-border bg-surface-2 px-3 py-2 text-sm text-foreground transition hover:border-primary/40"
                    >
                      <span className="w-6 text-mono text-[11px] text-muted-foreground">
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

      <section className="container-page py-14">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4 sm:flex sm:justify-between">
          <SectionHeader eyebrow="Latest" title="Recent stories" icon={<Flame className="h-4 w-4" />} />
          <Link
            to="/stories"
            className="inline-flex shrink-0 items-center gap-1 text-mono text-xs text-muted-foreground hover:text-primary"
          >
            All stories <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {isLoading ? (
          <div className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : stories.length === 0 ? (
          <div className="mt-8 rounded-xl border border-dashed border-border bg-surface p-10 text-center text-muted-foreground">
            <div className="text-mono text-sm">
              No stories yet — sign in and become a writer to publish.
            </div>
          </div>
        ) : (
          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {stories.slice(0, 6).map((s) => (
              <StoryCard key={s.id} story={s} />
            ))}
          </div>
        )}
      </section>

      <section className="container-page pb-20">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-surface to-surface-2 p-8 md:p-10">
          <div
            className="absolute inset-0 opacity-40"
            style={{
              background:
                "radial-gradient(500px 200px at 100% 0%, color-mix(in oklab, var(--rust) 25%, transparent), transparent 60%)",
            }}
            aria-hidden
          />
          <div className="relative flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div className="max-w-xl">
              <div className="text-mono text-[11px] uppercase tracking-widest text-primary">
                Write with us
              </div>
              <h3 className="mt-2 text-2xl font-display md:text-3xl">
                Your readers are already here.
              </h3>
              <p className="mt-2 text-muted-foreground">
                Publish stories, build journeys and earn coins from readers who care about your
                topic.
              </p>
            </div>
            <Link
              to="/profile"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
            >
              Become a writer
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
    <div className="min-w-0">
      <div className="inline-flex items-center gap-2 text-mono text-[11px] uppercase tracking-widest text-primary">
        {icon}
        {eyebrow}
      </div>
      <h2 className="mt-2 text-3xl font-display md:text-4xl">{title}</h2>
      {description ? <p className="mt-2 max-w-2xl text-muted-foreground">{description}</p> : null}
    </div>
  );
}
