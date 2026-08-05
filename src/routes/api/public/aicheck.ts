import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/aicheck")({
  server: {
    handlers: {
      GET: async () => {
        const key = process.env.LOVABLE_API_KEY;
        return new Response(JSON.stringify({ hasKey: Boolean(key), len: key?.length ?? 0 }), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
