import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { blocksToSpeechText, chunkSpeechText } from "@/lib/story-text";
import type { ContentBlock } from "@/data/stories";

const bodySchema = z.object({
  storyId: z.string().uuid(),
  chunkIndex: z.number().int().min(0).max(200).default(0),
});

export const Route = createFileRoute("/api/tts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { getBearerUserId } = await import("@/lib/api-auth.server");
        const userId = await getBearerUserId(request);
        if (!userId) return new Response("Unauthorized", { status: 401 });

        let parsed;
        try {
          parsed = bodySchema.parse(await request.json());
        } catch {
          return new Response("Invalid request", { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/backend/client.server");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const admin = supabaseAdmin as any;

        const { data: story } = await admin
          .from("stories")
          .select("id, title, content, creator_id, published")
          .eq("id", parsed.storyId)
          .maybeSingle();
        if (!story || !story.published) return new Response("Not found", { status: 404 });

        if (story.creator_id !== userId) {
          const { data: listen } = await admin
            .from("story_listens")
            .select("id")
            .eq("story_id", story.id)
            .eq("user_id", userId)
            .maybeSingle();
          if (!listen) return new Response("Payment required", { status: 402 });
        }

        const text = blocksToSpeechText((story.content ?? []) as ContentBlock[]);
        const chunks = chunkSpeechText(`${story.title}. ${text}`);
        if (chunks.length === 0) return new Response("Nothing to read", { status: 422 });
        if (parsed.chunkIndex >= chunks.length) {
          return new Response("Out of range", { status: 416 });
        }

        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) return new Response("Narration unavailable", { status: 503 });

        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "openai/gpt-4o-mini-tts",
            input: chunks[parsed.chunkIndex],
            voice: "alloy",
            response_format: "mp3",
            instructions: "Read calmly and clearly, like a narrated article.",
          }),
        });

        if (!upstream.ok) {
          const detail = await upstream.text().catch(() => "");
          console.error(`TTS failed [${upstream.status}]: ${detail}`);
          return new Response("Narration failed", { status: upstream.status === 429 ? 429 : 502 });
        }

        return new Response(upstream.body, {
          headers: {
            "Content-Type": "audio/mpeg",
            "Cache-Control": "no-store",
            "X-Chunk-Index": String(parsed.chunkIndex),
            "X-Chunk-Count": String(chunks.length),
          },
        });
      },
    },
  },
});
