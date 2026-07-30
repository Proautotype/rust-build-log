/**
 * Document import helpers for Creator Studio.
 *
 * Converts uploaded documents (.docx, .md, .txt, .html) into Story
 * ContentBlock[] so writers can drop a manuscript in and keep editing.
 * Pure functions — safe to import anywhere, but `htmlToBlocks` needs a DOM
 * (call it from the browser).
 */
import type { CodeLanguage, ContentBlock } from "@/data/stories";

const CODE_LANGS: CodeLanguage[] = [
  "rust",
  "typescript",
  "java",
  "kotlin",
  "python",
  "bash",
  "toml",
  "text",
];

export function slugifyHeading(text: string): string {
  const base = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);
  return base || `section-${Math.random().toString(36).slice(2, 7)}`;
}

function asLanguage(hint?: string | null): CodeLanguage {
  const l = (hint ?? "").toLowerCase().replace(/^language-/, "");
  const alias: Record<string, CodeLanguage> = { ts: "typescript", js: "typescript", py: "python", sh: "bash", shell: "bash" };
  if (alias[l]) return alias[l];
  return (CODE_LANGS as string[]).includes(l) ? (l as CodeLanguage) : "text";
}

const VIDEO_EXT = /\.(mp4|webm|ogg|mov|m4v)(\?|#|$)/i;
const IMAGE_EXT = /\.(png|jpe?g|gif|webp|avif|svg)(\?|#|$)/i;

function youtubeId(url: string): string | null {
  const m =
    url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/) ?? null;
  return m ? m[1] : null;
}

/** Turn a bare media URL into the most fitting media block. */
export function mediaBlockForUrl(
  url: string,
  alt = "",
  caption?: string,
): ContentBlock | null {
  const yt = youtubeId(url);
  if (yt) return { type: "video", youtubeId: yt, title: caption || alt || "Video" };
  if (VIDEO_EXT.test(url)) return { type: "videoFile", src: url, title: caption || alt || "Video" };
  if (IMAGE_EXT.test(url) || url.startsWith("data:image/"))
    return { type: "image", src: url, alt: alt || caption || "", caption };
  return null;
}

/* ------------------------------------------------------------------ */
/*  HTML -> blocks (used for .docx via mammoth, and .html uploads)     */
/* ------------------------------------------------------------------ */

export function htmlToBlocks(html: string): ContentBlock[] {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const blocks: ContentBlock[] = [];

  const pushText = (text: string) => {
    const t = text.replace(/\s+/g, " ").trim();
    if (t) blocks.push({ type: "paragraph", text: t });
  };

  const walk = (el: Element) => {
    const tag = el.tagName.toLowerCase();
    switch (tag) {
      case "h1":
      case "h2":
      case "h3":
      case "h4":
      case "h5":
      case "h6": {
        const text = (el.textContent ?? "").trim();
        if (!text) return;
        blocks.push({
          type: "heading",
          level: tag === "h1" || tag === "h2" ? 2 : 3,
          text,
          id: slugifyHeading(text),
        });
        return;
      }
      case "p": {
        const imgs = Array.from(el.querySelectorAll("img"));
        const textOnly = (el.textContent ?? "").trim();
        if (imgs.length && !textOnly) {
          imgs.forEach((img) => walk(img));
          return;
        }
        imgs.forEach((img) => walk(img));
        pushText(textOnly);
        return;
      }
      case "ul":
      case "ol": {
        const items = Array.from(el.children)
          .filter((li) => li.tagName.toLowerCase() === "li")
          .map((li) => (li.textContent ?? "").replace(/\s+/g, " ").trim())
          .filter(Boolean);
        if (items.length) blocks.push({ type: "list", ordered: tag === "ol", items });
        return;
      }
      case "blockquote": {
        const text = (el.textContent ?? "").replace(/\s+/g, " ").trim();
        if (text) blocks.push({ type: "quote", text });
        return;
      }
      case "pre": {
        const codeEl = el.querySelector("code");
        const code = (codeEl?.textContent ?? el.textContent ?? "").replace(/\s+$/, "");
        if (code.trim())
          blocks.push({ type: "code", language: asLanguage(codeEl?.className), code });
        return;
      }
      case "img": {
        const src = el.getAttribute("src") ?? "";
        if (!src) return;
        const alt = el.getAttribute("alt") ?? "";
        const block = mediaBlockForUrl(src, alt);
        blocks.push(block ?? { type: "image", src, alt });
        return;
      }
      case "video": {
        const src = el.getAttribute("src") ?? el.querySelector("source")?.getAttribute("src") ?? "";
        if (src) blocks.push({ type: "videoFile", src, title: el.getAttribute("title") ?? "Video" });
        return;
      }
      case "iframe": {
        const src = el.getAttribute("src") ?? "";
        const yt = youtubeId(src);
        if (yt) blocks.push({ type: "video", youtubeId: yt, title: el.getAttribute("title") ?? "Video" });
        return;
      }
      case "figure": {
        const img = el.querySelector("img");
        const caption = el.querySelector("figcaption")?.textContent?.trim();
        if (img) {
          const src = img.getAttribute("src") ?? "";
          if (src)
            blocks.push(
              mediaBlockForUrl(src, img.getAttribute("alt") ?? "", caption) ?? {
                type: "image",
                src,
                alt: img.getAttribute("alt") ?? "",
                caption,
              },
            );
          return;
        }
        Array.from(el.children).forEach(walk);
        return;
      }
      case "table": {
        blocks.push({ type: "markdown", markdown: tableToMarkdown(el) });
        return;
      }
      case "hr":
        return;
      default: {
        if (el.children.length) {
          Array.from(el.children).forEach(walk);
        } else {
          pushText(el.textContent ?? "");
        }
      }
    }
  };

  Array.from(doc.body.children).forEach(walk);
  return mergeAdjacentParagraphs(blocks);
}

function tableToMarkdown(table: Element): string {
  const rows = Array.from(table.querySelectorAll("tr")).map((tr) =>
    Array.from(tr.querySelectorAll("th,td")).map((c) =>
      (c.textContent ?? "").replace(/\s+/g, " ").replace(/\|/g, "\\|").trim(),
    ),
  );
  if (!rows.length) return "";
  const width = Math.max(...rows.map((r) => r.length));
  const pad = (r: string[]) => [...r, ...Array(width - r.length).fill("")];
  const [head, ...rest] = rows;
  return [
    `| ${pad(head).join(" | ")} |`,
    `| ${Array(width).fill("---").join(" | ")} |`,
    ...rest.map((r) => `| ${pad(r).join(" | ")} |`),
  ].join("\n");
}

function mergeAdjacentParagraphs(blocks: ContentBlock[]): ContentBlock[] {
  return blocks.filter(
    (b) => !(b.type === "paragraph" && !b.text.trim()) && !(b.type === "markdown" && !b.markdown.trim()),
  );
}

/* ------------------------------------------------------------------ */
/*  Markdown / plain text -> blocks                                    */
/* ------------------------------------------------------------------ */

export function markdownToBlocks(md: string): ContentBlock[] {
  const lines = md.replace(/\r\n?/g, "\n").split("\n");
  const blocks: ContentBlock[] = [];
  let para: string[] = [];

  const flushPara = () => {
    const text = para.join(" ").replace(/\s+/g, " ").trim();
    para = [];
    if (!text) return;
    // A paragraph that is just an image/video reference becomes a media block.
    const only = text.match(/^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)$/);
    if (only) {
      const block = mediaBlockForUrl(only[2], only[1], only[3]);
      blocks.push(block ?? { type: "image", src: only[2], alt: only[1], caption: only[3] });
      return;
    }
    const bare = text.match(/^<?(https?:\/\/\S+?)>?$/);
    if (bare) {
      const block = mediaBlockForUrl(bare[1]);
      if (block) {
        blocks.push(block);
        return;
      }
    }
    blocks.push({ type: "paragraph", text });
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Fenced code
    const fence = line.match(/^\s*```(\w+)?\s*$/);
    if (fence) {
      flushPara();
      const buf: string[] = [];
      i++;
      while (i < lines.length && !/^\s*```/.test(lines[i])) buf.push(lines[i++]);
      blocks.push({ type: "code", language: asLanguage(fence[1]), code: buf.join("\n") });
      continue;
    }

    // Table -> markdown block (kept verbatim, renders with GFM)
    if (/^\s*\|.*\|\s*$/.test(line) && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1] ?? "")) {
      flushPara();
      const buf: string[] = [];
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) buf.push(lines[i++]);
      i--;
      blocks.push({ type: "markdown", markdown: buf.join("\n") });
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      flushPara();
      const text = heading[2].trim();
      blocks.push({
        type: "heading",
        level: heading[1].length <= 2 ? 2 : 3,
        text,
        id: slugifyHeading(text),
      });
      continue;
    }

    if (/^\s*>\s?/.test(line)) {
      flushPara();
      const buf: string[] = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) buf.push(lines[i++].replace(/^\s*>\s?/, ""));
      i--;
      blocks.push({ type: "quote", text: buf.join(" ").trim() });
      continue;
    }

    const bullet = /^\s*[-*+]\s+(.*)$/;
    const ordered = /^\s*\d+[.)]\s+(.*)$/;
    if (bullet.test(line) || ordered.test(line)) {
      flushPara();
      const isOrdered = ordered.test(line);
      const items: string[] = [];
      while (i < lines.length && (bullet.test(lines[i]) || ordered.test(lines[i]))) {
        const m = lines[i].match(isOrdered ? ordered : bullet) ?? lines[i].match(bullet) ?? lines[i].match(ordered);
        if (m) items.push(m[1].trim());
        i++;
      }
      i--;
      blocks.push({ type: "list", ordered: isOrdered, items });
      continue;
    }

    if (!line.trim()) {
      flushPara();
      continue;
    }

    para.push(line.trim());
  }
  flushPara();
  return mergeAdjacentParagraphs(blocks);
}

export function textToBlocks(text: string): ContentBlock[] {
  return markdownToBlocks(text);
}

/** First heading (or first paragraph) makes a good story title. */
export function guessTitle(blocks: ContentBlock[]): string | null {
  const h = blocks.find((b) => b.type === "heading");
  if (h && h.type === "heading") return h.text;
  const p = blocks.find((b) => b.type === "paragraph");
  return p && p.type === "paragraph" ? p.text.slice(0, 80) : null;
}

/** Serialize blocks back to markdown for the "single markdown block" mode. */
export function blocksToMarkdownSource(blocks: ContentBlock[]): string {
  const out: string[] = [];
  for (const b of blocks) {
    switch (b.type) {
      case "heading":
        out.push(`${b.level === 2 ? "##" : "###"} ${b.text}`);
        break;
      case "paragraph":
        out.push(b.text);
        break;
      case "list":
        out.push(b.items.map((it, i) => (b.ordered ? `${i + 1}. ${it}` : `- ${it}`)).join("\n"));
        break;
      case "quote":
        out.push(`> ${b.text}`);
        break;
      case "code":
        out.push(`\`\`\`${b.language}\n${b.code}\n\`\`\``);
        break;
      case "image":
        out.push(`![${b.alt}](${b.src})`);
        break;
      case "videoFile":
        out.push(`[${b.title}](${b.src})`);
        break;
      case "video":
        out.push(`[${b.title}](https://www.youtube.com/watch?v=${b.youtubeId})`);
        break;
      case "markdown":
        out.push(b.markdown);
        break;
      default:
        break;
    }
  }
  return out.join("\n\n");
}
