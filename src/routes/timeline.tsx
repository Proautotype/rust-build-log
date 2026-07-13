import { createFileRoute } from "@tanstack/react-router";
import { Timeline } from "@/components/story/Timeline";
import { stories } from "@/data/stories";

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
        <Timeline stories={stories} />
      </div>
    </div>
  );
}
