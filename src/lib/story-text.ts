import type { ContentBlock } from "@/data/stories";

function stripMarkdown(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s*/gm, "")
    .replace(/[*_>#|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Flatten story blocks into readable narration text (code/media skipped). */
export function blocksToSpeechText(blocks: ContentBlock[]): string {
  const parts: string[] = [];
  const walk = (list: ContentBlock[]) => {
    for (const b of list) {
      switch (b.type) {
        case "heading":
          parts.push(`${b.text}.`);
          break;
        case "paragraph":
          parts.push(b.text);
          break;
        case "list":
          parts.push(b.items.join(". "));
          break;
        case "quote":
          parts.push(`Quote: ${b.text}.`);
          break;
        case "markdown":
          parts.push(stripMarkdown(b.markdown));
          break;
        case "image":
          if (b.caption) parts.push(`Image: ${b.caption}.`);
          break;
        case "layout":
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          walk(((b as any).blocks ?? (b as any).children ?? []) as ContentBlock[]);
          break;
        default:
          break;
      }
    }
  };
  walk(blocks ?? []);
  return parts
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n\n");
}

const MAX_WORDS_PER_CHUNK = 320;

/** Split narration text into TTS-sized chunks at sentence boundaries. */
export function chunkSpeechText(text: string, maxWords = MAX_WORDS_PER_CHUNK): string[] {
  const wordCount = (s: string) => (s.match(/\S+/g) ?? []).length;
  const sentences = text.match(/[^.!?]+[.!?]*\s*/g) ?? (text ? [text] : []);
  const chunks: string[] = [];
  let current = "";
  const flush = () => {
    if (current.trim()) chunks.push(current.trim());
    current = "";
  };
  for (const sentence of sentences) {
    if (wordCount(sentence) > maxWords) {
      flush();
      const words = sentence.match(/\S+/g) ?? [];
      for (let i = 0; i < words.length; i += maxWords) {
        chunks.push(words.slice(i, i + maxWords).join(" "));
      }
      continue;
    }
    if (current && wordCount(current) + wordCount(sentence) > maxWords) flush();
    current += sentence;
  }
  flush();
  return chunks;
}
