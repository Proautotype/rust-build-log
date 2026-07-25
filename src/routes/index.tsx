import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { ArrowRight, Sparkles, GitBranch, BookOpen, Loader2 } from "lucide-react";
import { StoryCard } from "@/components/story/StoryCard";
import { heroImage, rowToJourney, rowToStory, technologies } from "@/data/stories";
import { formatDate } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Rust Journey — Learning Rust in Public" },
      {
        name: "description",
        content:
          "A developer's public journal documenting the journey of learning Rust — one experiment at a time.",
      },
    ],
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
  const allTags = useMemo(
    () => Array.from(new Set(stories.flatMap((s) => s.tags))).sort(),
    [stories],
  );
  const popularTags = allTags.slice(0, 12);

  return (
    <div>
      <section className="relative overflow-hidden border-b border-border/60">
        <div className="absolute inset-0 grid-bg opacity-40" aria-hidden />
        <div
          className="absolute inset-0 opacity-70"
          style={{
            background:
              "radial-gradient(1200px 500px at 15% 0%, color-mix(in oklab, var(--rust) 20%, transparent), transparent 60%), radial-gradient(900px 400px at 90% 20%, color-mix(in oklab, var(--info) 12%, transparent), transparent 60%)",
          }}
          aria-hidden
        />

        <div className="container-page relative py-20 md:py-28">
          <div className="mx-auto max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/70 px-3 py-1 backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                Currently learning · Rust
              </span>
            </div>

            <h1 className="mt-6 text-4xl md:text-6xl font-display tracking-tight text-foreground leading-[1.05]">
              Documenting my journey learning <span className="italic text-primary">Rust</span>, one
              experiment at a time.
            </h1>

            <p className="mt-6 max-w-2xl text-base md:text-lg text-muted-foreground leading-relaxed">
              This isn't a blog. It's a learning journal — every story is a milestone, every
              experiment a compile error I finally understood.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to="/stories"
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90"
              >
                Browse stories
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/timeline"
                className="inline-flex items-center gap-2 rounded-md border border-border bg-surface/70 px-4 py-2 text-sm text-foreground transition hover:border-primary/40"
              >
                <GitBranch className="h-4 w-4" />
                See the timeline
              </Link>
            </div>

            <div className="mt-10 flex flex-wrap gap-x-8 gap-y-2 text-mono text-xs text-muted-foreground">
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
          </div>
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
