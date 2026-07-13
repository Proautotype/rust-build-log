import type { ContentBlock } from "@/data/stories";

interface Props {
  blocks: ContentBlock[];
}

export function TableOfContents({ blocks }: Props) {
  const headings = blocks.filter(
    (b): b is Extract<ContentBlock, { type: "heading" }> => b.type === "heading",
  );
  if (!headings.length) return null;

  return (
    <nav aria-label="Table of contents" className="text-sm">
      <div className="text-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-3">
        On this page
      </div>
      <ul className="space-y-1.5 border-l border-border">
        {headings.map((h) => (
          <li key={h.id}>
            <a
              href={`#${h.id}`}
              className={`block border-l-2 -ml-px pl-3 py-0.5 text-muted-foreground hover:text-primary transition-colors ${
                h.level === 3 ? "pl-6 text-[13px]" : ""
              } border-transparent hover:border-primary`}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
