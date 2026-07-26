import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, X, Loader2 } from "lucide-react";
import {
  allCategories,
  allDifficulties,
  rowToStory,
  type Category,
  type Difficulty,
} from "@/data/stories";
import { StoryCard } from "@/components/story/StoryCard";
import { supabase } from "@/integrations/supabase/client";
import { useWriterNames } from "@/hooks/useWriterNames";

export const Route = createFileRoute("/stories")({
  head: () => ({
    meta: [
      { title: "All stories — Right2Read" },
      {
        name: "description",
        content:
          "Every story on Right2Read — filter by category, difficulty and tags to find your next read.",
      },
      { property: "og:title", content: "All stories — Right2Read" },
      { property: "og:description", content: "Every story on Right2Read." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StoriesLayout,
});

function StoriesLayout() {
  const loc = useLocation();
  const isDetail = loc.pathname.startsWith("/stories/") && loc.pathname !== "/stories";
  return isDetail ? <Outlet /> : <StoriesList />;
}

function StoriesList() {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<Category | "All">("All");
  const [difficulty, setDifficulty] = useState<Difficulty | "All" | "None">("All");
  const [tag, setTag] = useState<string | null>(null);

  const { data: stories = [], isLoading } = useQuery({
    queryKey: ["public-stories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stories")
        .select("*")
        .eq("published", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(rowToStory);
    },
  });

  const allTags = useMemo(
    () => Array.from(new Set(stories.flatMap((s) => s.tags))).sort(),
    [stories],
  );

  const filtered = useMemo(() => {
    return stories.filter((s) => {
      if (category !== "All" && s.category !== category) return false;
      if (difficulty === "None" && s.difficulty !== null) return false;
      if (difficulty !== "All" && difficulty !== "None" && s.difficulty !== difficulty) return false;
      if (tag && !s.tags.includes(tag)) return false;
      if (q) {
        const hay = (s.title + " " + s.shortDescription + " " + s.tags.join(" ")).toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      return true;
    });
  }, [q, category, difficulty, tag, stories]);

  const writerMap = useWriterNames(filtered.map((s) => s.creatorId));

  const activeFilters =
    (category !== "All" ? 1 : 0) + (difficulty !== "All" ? 1 : 0) + (tag ? 1 : 0);

  return (
    <div className="container-page py-10 md:py-14">
      <div className="max-w-3xl">
        <div className="text-mono text-[11px] uppercase tracking-widest text-primary">
          Journal · index
        </div>
        <h1 className="mt-2 text-4xl md:text-5xl font-display tracking-tight">All stories</h1>
        <p className="mt-3 text-muted-foreground">
          Every milestone, experiment and failure logged so far.
        </p>
      </div>

      <div className="mt-8 flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 focus-within:border-primary/50 transition">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search stories, tags, keywords…"
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        {q ? (
          <button
            onClick={() => setQ("")}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <div className="mt-6 space-y-4">
        <FilterRow label="Category">
          <Chip active={category === "All"} onClick={() => setCategory("All")}>
            All
          </Chip>
          {allCategories.map((c) => (
            <Chip key={c} active={category === c} onClick={() => setCategory(c)}>
              {c}
            </Chip>
          ))}
        </FilterRow>
        <FilterRow label="Difficulty">
          <Chip active={difficulty === "All"} onClick={() => setDifficulty("All")}>
            All
          </Chip>
          {allDifficulties.map((d) => (
            <Chip key={d} active={difficulty === d} onClick={() => setDifficulty(d)}>
              {d}
            </Chip>
          ))}
          <Chip active={difficulty === "None"} onClick={() => setDifficulty("None")} muted>
            No level
          </Chip>
        </FilterRow>
        {allTags.length > 0 && (
          <FilterRow label="Tags">
            {allTags.map((t) => (
              <Chip key={t} active={tag === t} onClick={() => setTag(tag === t ? null : t)} muted>
                #{t}
              </Chip>
            ))}
          </FilterRow>
        )}
      </div>

      <div className="mt-8 flex items-center justify-between text-mono text-xs text-muted-foreground">
        <div>
          <span className="text-foreground">{filtered.length}</span> / {stories.length} stories
          {activeFilters > 0 ? <> · {activeFilters} filter(s) active</> : null}
        </div>
        {activeFilters > 0 || q ? (
          <button
            onClick={() => {
              setQ("");
              setCategory("All");
              setDifficulty("All");
              setTag(null);
            }}
            className="text-primary hover:underline"
          >
            Reset
          </button>
        ) : null}
      </div>

      {isLoading ? (
        <div className="mt-12 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading stories…
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-12 rounded-xl border border-dashed border-border bg-surface p-10 text-center text-muted-foreground">
          <div className="text-mono text-sm">// no stories match those filters.</div>
        </div>
      ) : (
        <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s) => (
            <StoryCard
              key={s.id}
              story={s}
              writerName={s.creatorId ? writerMap[s.creatorId] : null}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-20 flex-none pt-1.5 text-mono text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Chip({
  children,
  active,
  onClick,
  muted,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  muted?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-mono text-[11.5px] transition ${
        active
          ? "border-primary/60 bg-primary/15 text-primary"
          : muted
            ? "border-border bg-surface-2 text-muted-foreground hover:text-foreground hover:border-border-strong"
            : "border-border bg-surface hover:border-border-strong text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
