import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { journeys, getStoriesForJourney } from "@/data/stories";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/journeys")({
  head: () => ({
    meta: [
      { title: "Journeys — Rust Journey" },
      {
        name: "description",
        content: "Learning paths — collections of stories that follow a longer arc.",
      },
    ],
  }),
  component: JourneysPage,
});

function JourneysPage() {
  return (
    <div className="container-page py-10 md:py-14">
      <div className="max-w-3xl">
        <div className="text-mono text-[11px] uppercase tracking-widest text-primary">
          Learning paths
        </div>
        <h1 className="mt-2 text-4xl md:text-5xl font-display tracking-tight">Journeys</h1>
        <p className="mt-3 text-muted-foreground">
          Each journey is a longer arc — a sequence of stories that together form a milestone
          in learning.
        </p>
      </div>

      <div className="mt-10 space-y-6">
        {journeys.map((j) => {
          const list = getStoriesForJourney(j);
          return (
            <div
              key={j.id}
              className="overflow-hidden rounded-2xl border border-border bg-card"
            >
              <div className="grid md:grid-cols-[1fr_1.2fr]">
                <div className="relative aspect-[16/10] md:aspect-auto md:min-h-[280px] bg-surface-2">
                  <img
                    src={j.cover}
                    alt=""
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-card/80 via-card/20 to-transparent" />
                </div>
                <div className="p-6 md:p-8">
                  <div className="text-mono text-[11px] uppercase tracking-widest text-primary">
                    Journey · started {formatDate(j.startedAt)}
                  </div>
                  <h2 className="mt-2 text-3xl font-display tracking-tight">{j.title}</h2>
                  <p className="mt-2 text-muted-foreground">{j.description}</p>

                  <div className="mt-5 space-y-1.5">
                    {list.slice(0, 5).map((s, i) => (
                      <Link
                        key={s.id}
                        to="/stories/$slug"
                        params={{ slug: s.slug }}
                        className="flex items-center gap-3 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-surface-2 transition"
                      >
                        <span className="text-mono text-[11px] w-6 opacity-60">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="flex-1 truncate">{s.title}</span>
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    ))}
                    {list.length > 5 ? (
                      <div className="text-mono text-[11px] text-muted-foreground pl-11">
                        + {list.length - 5} more…
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
