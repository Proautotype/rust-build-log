import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, GitBranch } from "lucide-react";
import { Timeline } from "@/components/story/Timeline";
import { rowToJourney, rowToStory } from "@/data/stories";
import { supabase } from "@/integrations/backend/client";

export const Route = createFileRoute("/timeline")({
  head: () => ({
    meta: [
      { title: "Journey timeline — Right2Read" },
      {
        name: "description",
        content:
          "Follow a Right2Read journey step by step — pick a learning path and read the stories in the order they were written.",
      },
      { property: "og:title", content: "Journey timeline — Right2Read" },
      { property: "og:description", content: "Follow a Right2Read journey step by step." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TimelinePage,
});

function TimelinePage() {
  const [journeyId, setJourneyId] = useState<string>("");

  const journeysQ = useQuery({
    queryKey: ["public-journeys-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("journeys")
        .select("*")
        .order("started_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(rowToJourney);
    },
  });

  const journeys = journeysQ.data ?? [];
  const activeJourneyId = journeyId || journeys[0]?.id || "";
  const activeJourney = useMemo(
    () => journeys.find((j) => j.id === activeJourneyId) ?? null,
    [journeys, activeJourneyId],
  );

  const storiesQ = useQuery({
    queryKey: ["public-stories-journey-timeline", activeJourneyId],
    enabled: !!activeJourneyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stories")
        .select("*")
        .eq("published", true)
        .eq("journey_id", activeJourneyId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map(rowToStory);
    },
  });

  return (
    <div className="container-page py-10 md:py-14">
      <div className="max-w-3xl">
        <div className="text-mono text-[11px] uppercase tracking-widest text-primary">
          $ git log --oneline
        </div>
        <h1 className="mt-2 text-4xl md:text-5xl font-display tracking-tight">Journey timeline</h1>
        <p className="mt-3 text-muted-foreground">
          Pick a journey to see its stories laid out in order — one commit at a time.
        </p>
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <label className="inline-flex items-center gap-2 text-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          <GitBranch className="h-3.5 w-3.5 text-primary" />
          Journey
        </label>
        {journeysQ.isLoading ? (
          <span className="text-sm text-muted-foreground inline-flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> loading journeys…
          </span>
        ) : journeys.length === 0 ? (
          <span className="text-sm text-muted-foreground">No journeys yet.</span>
        ) : (
          <select
            value={activeJourneyId}
            onChange={(e) => setJourneyId(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm outline-none focus:border-primary/60"
          >
            {journeys.map((j) => (
              <option key={j.id} value={j.id}>
                {j.title}
              </option>
            ))}
          </select>
        )}
      </div>

      {activeJourney && (
        <div className="mt-6 rounded-xl border border-border/70 bg-card/40 p-5 max-w-3xl">
          <div className="font-medium">{activeJourney.title}</div>
          {activeJourney.description && (
            <p className="mt-1 text-sm text-muted-foreground">{activeJourney.description}</p>
          )}
        </div>
      )}

      <div className="mt-10">
        {!activeJourneyId ? null : storiesQ.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading stories…
          </div>
        ) : (storiesQ.data ?? []).length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-surface p-10 text-center text-muted-foreground text-mono text-sm">
            // this journey has no published stories yet.
          </div>
        ) : (
          <Timeline stories={storiesQ.data ?? []} />
        )}
      </div>
    </div>
  );
}
