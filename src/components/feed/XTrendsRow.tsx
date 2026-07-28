import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { Flame, ArrowUpRight } from "lucide-react";
import { getHomeXTrends } from "@/lib/x-public.functions";

/**
 * Landing-page "Trending on X" strip: R2R stories published from X trends,
 * plus the live trends writers chose to surface. Renders nothing when empty.
 */
export function XTrendsRow() {
  const fetchTrends = useServerFn(getHomeXTrends);
  const { data } = useQuery({
    queryKey: ["home-x-trends"],
    queryFn: () => fetchTrends({}),
    staleTime: 10 * 60 * 1000,
  });

  const stories = data?.stories ?? [];
  const trends = data?.trends ?? [];
  if (stories.length === 0 && trends.length === 0) return null;

  return (
    <section className="container-page py-8">
      <div className="inline-flex items-center gap-2 text-mono text-[11px] uppercase tracking-widest text-primary">
        <Flame className="h-3.5 w-3.5" /> Trending on X
      </div>
      <h2 className="mt-2 text-3xl font-display md:text-4xl">Straight from the timeline</h2>

      {stories.length > 0 ? (
        <div className="mt-6 -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2">
          {stories.map((s) => (
            <Link
              key={s.slug}
              to="/stories/$slug"
              params={{ slug: s.slug }}
              className="group w-[280px] shrink-0 snap-start overflow-hidden rounded-xl border border-border bg-card transition hover:border-primary/50"
            >
              {s.cover ? (
                <img
                  src={s.cover}
                  alt={s.title}
                  loading="lazy"
                  className="h-32 w-full object-cover"
                />
              ) : null}
              <div className="p-4">
                {s.x_trend_keyword ? (
                  <div className="text-mono text-[10px] uppercase tracking-widest text-primary">
                    #{s.x_trend_keyword}
                  </div>
                ) : null}
                <h3 className="mt-1 line-clamp-2 font-medium text-foreground">{s.title}</h3>
                {s.short_description ? (
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {s.short_description}
                  </p>
                ) : null}
              </div>
            </Link>
          ))}
        </div>
      ) : null}

      {trends.length > 0 ? (
        <ul className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {trends.map((t) => (
            <li key={t.key} className="rounded-xl border border-border bg-surface p-4">
              <div className="text-mono text-[10px] uppercase tracking-widest text-primary">
                {t.keyword}
              </div>
              <p className="mt-1 line-clamp-3 text-sm text-foreground">{t.label}</p>
              <div className="mt-2 flex items-center justify-between text-mono text-[10px] text-muted-foreground">
                <span>{t.engagement} engagement</span>
                {t.topPostUrl ? (
                  <a
                    href={t.topPostUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 hover:text-primary"
                  >
                    View on X <ArrowUpRight className="h-3 w-3" />
                  </a>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
