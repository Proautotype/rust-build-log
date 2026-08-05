import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/aicheck")({
  server: {
    handlers: {
      GET: async () => {
        const { generateText } = await import("ai");
        const { createLovableAiGatewayProvider } = await import("@/lib/ai-gateway.server");
        const gateway = createLovableAiGatewayProvider(process.env.LOVABLE_API_KEY!);
        try {
          const { text } = await generateText({
            model: gateway("google/gemini-3.6-flash"),
            prompt: "Reply with ONLY a JSON object {\"title\":\"x\"}",
          });
          return new Response(JSON.stringify({ text }), {
            headers: { "Content-Type": "application/json" },
          });
        } catch (e) {
          return new Response(JSON.stringify({ err: e instanceof Error ? e.message : String(e) }), {
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
