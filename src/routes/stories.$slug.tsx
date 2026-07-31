import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Clock,
  GitCommit,
  User as UserIcon,
  Lock,
  Coins,
  HandHeart,
  Loader2,
  Eye,
} from "lucide-react";
import { rowToStory, rowToJourney, type Story, type Journey } from "@/data/stories";
import { ContentRenderer } from "@/components/story/ContentRenderer";
import { StoryThemeScope, themeWidthClass } from "@/components/story/StoryThemeScope";
import { TableOfContents } from "@/components/story/TableOfContents";
import { DifficultyBadge } from "@/components/story/DifficultyBadge";
import { StoryCard } from "@/components/story/StoryCard";
import { Tag } from "@/components/story/Tag";
import { Comments } from "@/components/story/Comments";
import { ShareButton } from "@/components/story/ShareButton";
import { WriterCard, type WriterInfo } from "@/components/story/WriterCard";
import { AdSlot } from "@/components/ads/AdSlot";
import { formatDateLong } from "@/lib/format";
import { supabase } from "@/integrations/backend/client";
import { useAuth } from "@/hooks/useAuth";
import { getMyCoinState, unlockStory, tipStory } from "@/lib/coins.functions";

interface LoaderData {
  story: Story;
  journey: Journey | null;
  journeyStories: Story[];
  related: Story[];
  writer: WriterInfo | null;
}

export const Route = createFileRoute("/stories/$slug")({
  loader: async ({ params }): Promise<LoaderData> => {
    const { data: storyRow, error } = await supabase
      .from("stories")
      .select("*")
      .eq("slug", params.slug)
      .eq("published", true)
      .maybeSingle();
    if (error || !storyRow) throw notFound();
    const story = rowToStory(storyRow);

    let journey: Journey | null = null;
    let journeyStories: Story[] = [];
    if (story.journeyId) {
      const [{ data: j }, { data: js }] = await Promise.all([
        supabase.from("journeys").select("*").eq("id", story.journeyId).maybeSingle(),
        supabase
          .from("stories")
          .select("*")
          .eq("journey_id", story.journeyId)
          .eq("published", true)
          .order("created_at", { ascending: true }),
      ]);
      if (j) journey = rowToJourney(j);
      if (js) journeyStories = js.map(rowToStory);
    }

    const { data: rel } = await supabase
      .from("stories")
      .select("*")
      .eq("published", true)
      .eq("category", story.category)
      .neq("id", story.id)
      .limit(3);
    const related = (rel ?? []).map(rowToStory);

    let writer: WriterInfo | null = null;
    if (story.creatorId) {
      const { data: p } = await supabase
        .from("profiles")
        .select("display_name, avatar_url, bio")
        .eq("id", story.creatorId)
        .maybeSingle();
      if (p) writer = p as WriterInfo;
    }

    return { story, journey, journeyStories, related, writer };
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Story not found — Right2Read" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const { story, writer } = loaderData;
    const url = `https://right2read.lovable.app/stories/${params.slug}`;
    const keywords = [story.category, story.difficulty, ...story.tags].filter(Boolean).join(", ");
    const authorName = writer?.display_name ?? "Right2Read";
    return {
      meta: [
        { title: `${story.title} — Right2Read` },
        { name: "description", content: story.shortDescription },
        { name: "keywords", content: keywords },
        { name: "author", content: authorName },
        { name: "robots", content: "index, follow, max-image-preview:large" },
        { property: "og:title", content: story.title },
        { property: "og:description", content: story.shortDescription },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { property: "og:image", content: story.cover },
        { property: "og:site_name", content: "Right2Read" },
        { property: "article:published_time", content: story.createdAt },
        { property: "article:modified_time", content: story.updatedAt },
        { property: "article:section", content: story.category },
        { property: "article:author", content: authorName },
        ...story.tags.map((t) => ({ property: "article:tag", content: t })),
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: story.title },
        { name: "twitter:description", content: story.shortDescription },
        { name: "twitter:image", content: story.cover },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: story.title,
            description: story.shortDescription,
            image: [story.cover],
            datePublished: story.createdAt,
            dateModified: story.updatedAt,
            author: { "@type": "Person", name: authorName },
            publisher: {
              "@type": "Organization",
              name: "Right2Read",
              url: "https://right2read.lovable.app",
            },
            mainEntityOfPage: { "@type": "WebPage", "@id": url },
            keywords,
            articleSection: story.category,
            wordCount: Math.max(1, story.readingMinutes * 200),
          }),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: "https://right2read.lovable.app/" },
              { "@type": "ListItem", position: 2, name: "Stories", item: "https://right2read.lovable.app/stories" },
              { "@type": "ListItem", position: 3, name: story.title, item: url },
            ],
          }),
        },
      ],
    };
  },
  component: StoryDetail,
});

function StoryDetail() {
  const { story, journey, journeyStories, related, writer } = Route.useLoaderData();
  const { user } = useAuth();

  const coinStateFn = useServerFn(getMyCoinState);
  const unlockFn = useServerFn(unlockStory);
  const tipFn = useServerFn(tipStory);
  const qc = useQueryClient();

  const coinState = useQuery({
    queryKey: ["coin-state"],
    queryFn: () => coinStateFn(),
    enabled: !!user,
  });

  const isCreator = !!user && story.creatorId === user.id;
  const unlocked =
    coinState.data?.unlockedStoryIds?.includes(story.id) ?? false;
  const locked =
    story.monetization === "locked" && !isCreator && !unlocked;

  const unlockMut = useMutation({
    mutationFn: () => unlockFn({ data: { storyId: story.id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["coin-state"] });
    },
  });

  const [tipAmount, setTipAmount] = useState(10);
  const tipMut = useMutation({
    mutationFn: (amount: number) => tipFn({ data: { storyId: story.id, amount } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["coin-state"] });
    },
  });

  const [viewCount, setViewCount] = useState(story.viewCount);
  useEffect(() => {
    setViewCount(story.viewCount);
  }, [story.viewCount]);
  useEffect(() => {
    let cancelled = false;
    // Stable per-browser key so repeat reads within 6h aren't double counted.
    let sessionKey: string | undefined;
    try {
      const k = "r2r_view_session";
      sessionKey = localStorage.getItem(k) ?? undefined;
      if (!sessionKey) {
        sessionKey = crypto.randomUUID();
        localStorage.setItem(k, sessionKey);
      }
    } catch {
      sessionKey = undefined;
    }
    // Fire-and-forget view counter via the public endpoint so signed-out
    // readers are counted too. Won't retry on failure.
    void fetch("/api/public/story-view", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ storyId: story.id, sessionKey }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`View tracking failed (${res.status})`);
        const json = (await res.json()) as { viewCount?: number | null };
        if (cancelled) return;
        if (typeof json?.viewCount === "number") setViewCount(json.viewCount);
        // Keep listings/analytics in sync with the new count.
        void qc.invalidateQueries({ queryKey: ["public-stories"] });
        void qc.invalidateQueries({ queryKey: ["home-data"] });
        void qc.invalidateQueries({ queryKey: ["my-story-analytics"] });
      })
      .catch((error: unknown) => {
        console.error("Story view tracking failed", error);
      });
    return () => {
      cancelled = true;
    };
  }, [story.id, qc]);


  const authorName = writer?.display_name ?? null;
  const shareUrl =
    typeof window !== "undefined"
      ? window.location.href
      : `https://right2read.lovable.app/stories/${story.slug}`;
  const journeyIndex = journey ? journeyStories.findIndex((s: Story) => s.id === story.id) : -1;
  const prev = journeyIndex > 0 ? journeyStories[journeyIndex - 1] : undefined;
  const next =
    journeyIndex >= 0 && journeyIndex < journeyStories.length - 1
      ? journeyStories[journeyIndex + 1]
      : undefined;

  const previewBlocks = locked ? story.content.slice(0, 2) : story.content;
  const tipEnabled = story.tipEnabled || story.monetization === "tips";

  return (
    <article>
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
            {story.monetization === "locked" && (
              <span className="ml-2 inline-flex items-center gap-1 rounded-md border border-primary/40 bg-primary/10 px-2 py-0.5 text-mono text-[10px] text-primary">
                <Lock className="h-3 w-3" /> {story.unlockPrice} coins to unlock
              </span>
            )}
            {tipEnabled && story.monetization !== "locked" && (
              <span className="ml-2 inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-0.5 text-mono text-[10px] text-muted-foreground">
                <HandHeart className="h-3 w-3 text-primary" /> tips welcome
              </span>
            )}
          </div>

          <h1 className="mt-4 max-w-3xl text-4xl md:text-5xl lg:text-6xl font-display tracking-tight leading-[1.05]">
            {story.title}
          </h1>

          <p className="mt-5 max-w-2xl text-lg text-muted-foreground leading-relaxed">
            {story.shortDescription}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-mono text-xs text-muted-foreground">
            {authorName && (
              <span className="inline-flex items-center gap-1.5">
                <UserIcon className="h-3.5 w-3.5" />
                {authorName}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              {formatDateLong(story.createdAt)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              {story.readingMinutes} min read
            </span>
            <span className="inline-flex items-center gap-1.5" title="Views">
              <Eye className="h-3.5 w-3.5" />
              {viewCount.toLocaleString()} views
            </span>
            {story.updatedAt !== story.createdAt ? (
              <span className="inline-flex items-center gap-1.5">
                <GitCommit className="h-3.5 w-3.5" />
                Updated {formatDateLong(story.updatedAt)}
              </span>
            ) : null}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="flex flex-wrap gap-1.5">
              {story.tags.map((t: string) => (
                <Tag key={t} label={t} />
              ))}
            </div>
            <div className="ml-auto">
              <ShareButton
                url={shareUrl}
                title={story.title}
                text={story.shortDescription}
              />
            </div>
          </div>
        </div>
      </header>

      <div className="container-page py-12">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_240px]">
          <StoryThemeScope theme={story.theme ?? {}} className={`min-w-0 ${themeWidthClass(story.theme ?? {})}`}>
            <ContentRenderer blocks={previewBlocks} />

            {locked && (
              <div className="relative mt-8 rounded-2xl border border-primary/40 bg-gradient-to-b from-primary/10 to-transparent p-8 text-center">
                <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <Lock className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-xl font-display">Premium story</h3>
                <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
                  Unlock the rest of this story with{" "}
                  <span className="text-primary font-medium">{story.unlockPrice} coins</span>.
                </p>
                {user ? (
                  <div className="mt-6 flex flex-col items-center gap-2">
                    <button
                      disabled={unlockMut.isPending}
                      onClick={() => unlockMut.mutate()}
                      className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                    >
                      {unlockMut.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Coins className="h-4 w-4" />
                      )}
                      Unlock for {story.unlockPrice}
                    </button>
                    <div className="text-mono text-[11px] text-muted-foreground">
                      Balance: {coinState.data?.balance ?? 0} coins ·{" "}
                      <Link to="/coins" className="text-primary hover:underline">
                        top up
                      </Link>
                    </div>
                    {unlockMut.isError ? (
                      <div className="text-xs text-destructive">
                        {(unlockMut.error as Error).message}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <Link
                    to="/auth"
                    search={{ redirect: undefined }}
                    className="mt-6 inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    Sign in to unlock
                  </Link>
                )}
              </div>
            )}

            {!locked && tipEnabled && user && !isCreator && (
              <div className="mt-10 rounded-xl border border-border bg-card/40 p-5">
                <div className="flex items-center gap-2">
                  <HandHeart className="h-4 w-4 text-primary" />
                  <div className="font-medium">Tip the writer</div>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Send a small coin tip to say thanks for this story.
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {[5, 10, 25, 50].map((v) => (
                    <button
                      key={v}
                      onClick={() => setTipAmount(v)}
                      className={`text-mono text-xs px-2.5 py-1 rounded border transition ${
                        tipAmount === v
                          ? "border-primary text-primary bg-primary/10"
                          : "border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {v} <Coins className="inline h-3 w-3" />
                    </button>
                  ))}
                  <button
                    disabled={tipMut.isPending}
                    onClick={() => tipMut.mutate(tipAmount)}
                    className="ml-auto inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  >
                    {tipMut.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <HandHeart className="h-3.5 w-3.5" />
                    )}
                    Send {tipAmount}
                  </button>
                </div>
                {tipMut.isSuccess ? (
                  <div className="mt-2 text-xs text-emerald-400">Thanks for the tip! ✨</div>
                ) : null}
                {tipMut.isError ? (
                  <div className="mt-2 text-xs text-destructive">
                    {(tipMut.error as Error).message}
                  </div>
                ) : null}
              </div>
            )}

            <AdSlot className="mt-12" />

            {writer && <WriterCard writer={writer} />}

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
          </StoryThemeScope>

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
                    {journeyStories.map((s: Story, i: number) => (
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

        <Comments storySlug={story.slug} />

        {related.length > 0 ? (
          <section className="mt-16 border-t border-border pt-12">
            <div className="text-mono text-[11px] uppercase tracking-widest text-primary">
              Keep reading
            </div>
            <h2 className="mt-2 text-2xl md:text-3xl font-display tracking-tight">
              Related stories
            </h2>
            <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {related.map((s: Story) => (
                <StoryCard key={s.id} story={s} />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </article>
  );
}
