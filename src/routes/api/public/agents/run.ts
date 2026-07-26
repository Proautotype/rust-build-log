import { createFileRoute } from "@tanstack/react-router";

/**
 * Scheduled runner: generates + posts a story for every enabled agent that is due.
 * Called by pg_cron with the project's publishable key in the `apikey` header.
 */
export const Route = createFileRoute("/api/public/agents/run")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = request.headers.get("apikey");
        if (!apiKey || apiKey !== process.env.SUPABASE_PUBLISHABLE_KEY) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        const { runDueAgents } = await import("@/lib/agent-run.server");
        try {
          const result = await runDueAgents();
          return new Response(JSON.stringify({ ok: true, ...result }), {
            headers: { "Content-Type": "application/json" },
          });
        } catch (e) {
          return new Response(
            JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});
