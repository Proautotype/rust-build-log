import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Timeline } from "@/components/story/Timeline";
import { rowToStory } from "@/data/stories";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/timeline")({
  head: () => ({
    meta: [
      { title: "Timeline — Rust Journey" },
      {
        name: "description",
        content:
          "A chronological timeline of every milestone in my Rust learning journey — from first commit to shipped tools.",
      },
    ],
  }),
  component: TimelinePage,
});

function TimelinePage() {
  const { data: stories = [], isLoading } = useQuery({
    queryKey: ["public-stories-timeline"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stories")
        .select("*")
        .eq("published", true)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map(rowToStory);
    },
  });

  return (
    <div className="container-page py-10 md:py-14">
      <div className="max-w-3xl">
        <div className="text-mono text-[11px] uppercase tracking-widest text-primary">
          $ git log --oneline --all
        </div>
        <h1 className="mt-2 text-4xl md:text-5xl font-display tracking-tight">Timeline</h1>
        <p className="mt-3 text-muted-foreground">
          Every milestone, in order. Each commit is a story.
        </p>
      </div>

      <div className="mt-12">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading timeline…
          </div>
        ) : (
          <Timeline stories={stories} />
        )}
      </div>
    </div>
  );
}
