import { Link } from "@tanstack/react-router";
import type { Story } from "@/data/stories";
import { formatDate } from "@/lib/format";
import { DifficultyBadge } from "./DifficultyBadge";
import { Eye } from "lucide-react";
import { useWriterNames } from "@/hooks/useWriterNames";

interface Props {
  stories: Story[];
}

function groupByYear(stories: Story[]) {
  const map = new Map<string, Story[]>();
  for (const s of stories) {
    const year = new Date(s.createdAt).getFullYear().toString();
    if (!map.has(year)) map.set(year, []);
    map.get(year)!.push(s);
  }
  return Array.from(map.entries()).sort((a, b) => Number(b[0]) - Number(a[0]));
}

export function Timeline({ stories }: Props) {
  const groups = groupByYear([...stories].sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
  const writerMap = useWriterNames(stories.map((s) => s.creatorId));

  return (
    <div className="relative">
      {groups.map(([year, items]) => (
        <section key={year} className="mb-12">
          <div className="sticky top-14 z-10 -mx-4 md:-mx-6 mb-6 bg-background/90 backdrop-blur px-4 md:px-6 py-2 border-b border-border/60">
            <h2 className="text-4xl md:text-5xl font-display tracking-tight">
              <span className="text-primary">/</span>
              {year}
            </h2>
          </div>

          <ol className="relative border-l-2 border-border/70 ml-3 space-y-8">
            {items.map((s) => {
              const writerName = s.creatorId ? writerMap[s.creatorId] : null;
              return (
                <li key={s.id} className="pl-8 relative group">
                  <span className="absolute -left-[9px] top-1.5 h-4 w-4 rounded-full bg-background ring-2 ring-primary/70 group-hover:ring-primary transition" />
                  <span className="absolute -left-[5px] top-[10px] h-2 w-2 rounded-full bg-primary" />

                  <div className="text-mono text-[11px] text-muted-foreground mb-1 uppercase tracking-wider">
                    {formatDate(s.createdAt)} · {s.category}
                    {writerName ? <> · by <span className="text-foreground/80">{writerName}</span></> : null}
                  </div>
                  <Link
                    to="/stories/$slug"
                    params={{ slug: s.slug }}
                    className="block group/link"
                  >
                    <h3 className="text-lg font-semibold text-foreground group-hover/link:text-primary transition-colors">
                      {s.title}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
                      {s.shortDescription}
                    </p>
                  </Link>
                  <div className="mt-2 flex items-center gap-3 flex-wrap">
                    <DifficultyBadge level={s.difficulty} />
                    <span className="text-mono text-[11px] text-muted-foreground">
                      {s.readingMinutes} min read
                    </span>
                    <span className="text-mono text-[11px] text-muted-foreground inline-flex items-center gap-1">
                      <Eye className="h-3 w-3" /> {s.viewCount.toLocaleString()} views
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}
