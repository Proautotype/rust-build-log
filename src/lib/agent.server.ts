import { generateText, Output, NoObjectGeneratedError } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

export interface GeneratedStory {
  title: string;
  slug: string;
  shortDescription: string;
  tags: string[];
  readingMinutes: number;
  markdown: string;
}

const schema = z.object({
  title: z.string(),
  summary: z.string(),
  tags: z.array(z.string()),
  reading_minutes: z.number(),
  markdown: z.string(),
});

export function slugify(input: string) {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 70) || `story-${Date.now().toString(36)}`
  );
}

/** Models often wrap JSON in ``` fences or add prose around it. Pull the object out. */
function extractJsonObject(text: string): unknown {
  const cleaned = text
    .replace(/^\s*```(?:json)?/i, "")
    .replace(/```\s*$/, "")
    .trim();
  const candidates = [cleaned];
  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  if (first !== -1 && last > first) candidates.push(cleaned.slice(first, last + 1));
  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      /* try next */
    }
  }
  throw new Error("No JSON object found");
}

function clampStory(raw: z.infer<typeof schema>): GeneratedStory {
  const title = raw.title.trim().slice(0, 120) || "Untitled story";
  return {
    title,
    slug: slugify(title),
    shortDescription: raw.summary.trim().slice(0, 280),
    tags: (raw.tags ?? []).map((t) => t.trim().toLowerCase()).filter(Boolean).slice(0, 6),
    readingMinutes: Math.min(60, Math.max(1, Math.round(raw.reading_minutes || 5))),
    markdown: raw.markdown.trim(),
  };
}


export async function generateStory(opts: {
  topic: string;
  tone?: string;
  category?: string;
  extraInstructions?: string;
}): Promise<GeneratedStory> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("AI is not configured for this project.");

  const gateway = createLovableAiGatewayProvider(key);
  const model = gateway("google/gemini-3.6-flash");

  const prompt = [
    `Write an original developer-focused article for the Right2Read publishing platform.`,
    `Topic: ${opts.topic}`,
    opts.category ? `Category: ${opts.category}` : "",
    `Tone: ${opts.tone || "practical, friendly, concrete"}`,
    opts.extraInstructions ?? "",
    ``,
    `Rules:`,
    `- Title under 90 characters, specific and non-clickbait.`,
    `- summary: one sentence under 200 characters.`,
    `- tags: 3 to 5 short lowercase topic tags.`,
    `- reading_minutes: a realistic estimate between 3 and 12.`,
    `- markdown: the full article in GitHub-flavoured Markdown. Use ## subheadings,`,
    `  short paragraphs, bullet lists and fenced code blocks with a language tag`,
    `  where code helps. Do NOT repeat the title as an H1. Aim for 600-1200 words.`,
    `- Respond with ONLY a single JSON object with keys: title, summary, tags, reading_minutes, markdown. No commentary, no code fences.`,
  ]
    .filter(Boolean)
    .join("\n");

  // The model reliably returns JSON but often wraps it in ``` fences, which the
  // SDK's strict object mode rejects — so take the raw text and parse it here.
  const { text } = await generateText({ model, prompt });

  try {
    return clampStory(schema.parse(extractJsonObject(text)));
  } catch {
    throw new Error("The AI response could not be parsed. Try again.");
  }
}

