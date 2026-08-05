import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/aicheck")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const { generateStory } = await import("@/lib/agent.server");
          const out = await generateStory({ topic: "Rust ownership basics" });
          return new Response(
            JSON.stringify({ ok: true, title: out.title, len: out.markdown.length }),
            { headers: { "Content-Type": "application/json" } },
          );
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
