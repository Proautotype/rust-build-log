import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  BarChart3,
  Eye,
  Coins,
  HandHeart,
  MessageSquare,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import { useRole } from "@/hooks/useRole";
import { getMyStoryAnalytics } from "@/lib/analytics.functions";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({
    meta: [
      { title: "Story analytics — Right2Read" },
      {
        name: "description",
        content: "Track how your stories are performing on Right2Read — views, tips, unlocks and comments.",
      },
      { property: "og:title", content: "Story analytics — Right2Read" },
      { property: "og:description", content: "Track how your stories are performing on Right2Read." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const { isWriter, loading } = useRole();
  const fn = useServerFn(getMyStoryAnalytics);
  const q = useQuery({
    queryKey: ["my-story-analytics"],
    queryFn: () => fn(),
    enabled: isWriter,
  });

  if (loading) {
    return (
      <div className="container-page py-16 text-sm text-muted-foreground">
        <Loader2 className="inline h-4 w-4 animate-spin mr-2" /> Loading…
      </div>
    );
  }
  if (!isWriter) {
    return (
      <div className="container-page py-16 max-w-lg">
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-6 text-center">
          <ShieldAlert className="h-6 w-6 text-destructive mx-auto mb-2" />
          <h1 className="text-lg font-semibold">Writers only</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Analytics are available to writers. Request writer access from your profile.
          </p>
        </div>
      </div>
    );
  }

  const rows = q.data ?? [];
  const totals = rows.reduce(
    (acc, r) => {
      acc.views += r.view_count;
      acc.unlocks += r.unlock_count;
      acc.unlockRevenue += r.unlock_revenue;
      acc.tips += r.tip_count;
      acc.tipRevenue += r.tip_revenue;
      acc.comments += r.comment_count;
      return acc;
    },
    { views: 0, unlocks: 0, unlockRevenue: 0, tips: 0, tipRevenue: 0, comments: 0 },
  );

  return (
    <div className="container-page py-10 md:py-14">
      <div className="text-mono text-[11px] uppercase tracking-widest text-primary">
        Creator · Analytics
      </div>
      <h1 className="mt-2 text-4xl md:text-5xl font-display tracking-tight inline-flex items-center gap-3">
        <BarChart3 className="h-8 w-8 text-primary" /> Story performance
      </h1>
      <p className="mt-3 text-muted-foreground max-w-2xl">
        See how your stories are performing across Right2Read — reader views, comments, tips and unlocks.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Total views" value={totals.views} icon={Eye} />
        <Metric label="Comments" value={totals.comments} icon={MessageSquare} />
        <Metric label="Tips received" value={`${totals.tipRevenue} coins`} sub={`${totals.tips} tips`} icon={HandHeart} />
        <Metric label="Unlock revenue" value={`${totals.unlockRevenue} coins`} sub={`${totals.unlocks} unlocks`} icon={Coins} />
      </div>

      <div className="mt-10 rounded-xl border border-border bg-card/40 overflow-hidden">
        <div className="grid grid-cols-[1fr_repeat(4,minmax(72px,auto))] gap-3 px-4 py-3 border-b border-border text-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          <div>Story</div>
          <div className="text-right">Views</div>
          <div className="text-right">Comments</div>
          <div className="text-right">Tips</div>
          <div className="text-right">Unlocks</div>
        </div>
        {q.isLoading ? (
          <div className="p-6 text-sm text-muted-foreground">
            <Loader2 className="inline h-4 w-4 animate-spin mr-2" /> Loading analytics…
          </div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No stories yet. <Link to="/studio" className="text-primary hover:underline">Open the studio →</Link>
          </div>
        ) : (
          rows.map((r) => (
            <div
              key={r.story_id}
              className="grid grid-cols-[1fr_repeat(4,minmax(72px,auto))] gap-3 px-4 py-3 border-b border-border/60 last:border-0 items-center"
            >
              <div className="min-w-0">
                <Link
                  to="/stories/$slug"
                  params={{ slug: r.slug }}
                  className="text-sm font-medium truncate hover:text-primary block"
                >
                  {r.title}
                </Link>
                <div className="text-mono text-[10px] text-muted-foreground">
                  {r.published ? "published" : "draft"} · /{r.slug}
                </div>
              </div>
              <div className="text-right text-sm text-mono">{r.view_count.toLocaleString()}</div>
              <div className="text-right text-sm text-mono">{r.comment_count}</div>
              <div className="text-right text-sm text-mono">
                {r.tip_revenue}
                <span className="text-muted-foreground text-[10px]"> / {r.tip_count}</span>
              </div>
              <div className="text-right text-sm text-mono">
                {r.unlock_revenue}
                <span className="text-muted-foreground text-[10px]"> / {r.unlock_count}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <div className="text-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          {label}
        </div>
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="mt-2 text-3xl font-display">{value}</div>
      {sub && <div className="text-mono text-[10px] text-muted-foreground">{sub}</div>}
    </div>
  );
}
