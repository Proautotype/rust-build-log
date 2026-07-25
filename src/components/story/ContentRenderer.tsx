import type { ContentBlock } from "@/data/stories";
import { CodeBlock } from "@/components/media/CodeBlock";
import { VideoEmbed } from "@/components/media/VideoEmbed";
import { PDFViewer } from "@/components/media/PDFViewer";
import { ImageGallery } from "@/components/media/ImageGallery";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function ContentRenderer({ blocks }: { blocks: ContentBlock[] }) {
  return (
    <div className="prose-article">
      {blocks.map((block, i) => {
        switch (block.type) {
          case "heading":
            return block.level === 2 ? (
              <h2 key={i} id={block.id}>
                {block.text}
              </h2>
            ) : (
              <h3 key={i} id={block.id}>
                {block.text}
              </h3>
            );
          case "paragraph":
            return <p key={i}>{block.text}</p>;
          case "list":
            return block.ordered ? (
              <ol key={i}>
                {block.items.map((it, j) => (
                  <li key={j}>{renderInline(it)}</li>
                ))}
              </ol>
            ) : (
              <ul key={i}>
                {block.items.map((it, j) => (
                  <li key={j}>{renderInline(it)}</li>
                ))}
              </ul>
            );
          case "quote":
            return (
              <blockquote key={i}>
                {block.text}
                {block.cite ? <div className="mt-2 text-mono text-xs not-italic">— {block.cite}</div> : null}
              </blockquote>
            );
          case "code":
            return (
              <CodeBlock
                key={i}
                code={block.code}
                language={block.language}
                filename={block.filename}
              />
            );
          case "image":
            return (
              <figure key={i} className="my-6">
                <div className="overflow-hidden rounded-lg border border-border bg-surface-2">
                  <img
                    src={block.src}
                    alt={block.alt}
                    loading="lazy"
                    className="w-full"
                  />
                </div>
                {block.caption ? (
                  <figcaption className="mt-2 text-center text-mono text-xs text-muted-foreground">
                    {block.caption}
                  </figcaption>
                ) : null}
              </figure>
            );
          case "video":
            return <VideoEmbed key={i} youtubeId={block.youtubeId} title={block.title} />;
          case "pdf":
            return (
              <PDFViewer
                key={i}
                title={block.title}
                description={block.description}
                sizeKb={block.sizeKb}
                href={block.href}
              />
            );
          case "gallery":
            return <ImageGallery key={i} images={block.images} />;
          case "markdown":
            return (
              <div key={i} className="markdown-body">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{block.markdown}</ReactMarkdown>
              </div>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}

// Minimal inline formatting for backtick code inside list items.
function renderInline(text: string) {
  const parts = text.split(/(`[^`]+`)/g);
  return parts.map((p, i) =>
    p.startsWith("`") && p.endsWith("`") ? <code key={i}>{p.slice(1, -1)}</code> : <span key={i}>{p}</span>,
  );
}
