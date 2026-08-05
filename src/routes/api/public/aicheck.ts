import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/aicheck")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const { generateStory } = await import("@/lib/agent.server");
          const out = await generateStory({ topic: "Testing the AI pipeline", tone: "brief" });
          return new Response(JSON.stringify({ ok: true, title: out.title }), {
            headers: { "Content-Type": "application/json" },
          });
        } catch (e) {
          return new Response(
            JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }),
            { headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});
