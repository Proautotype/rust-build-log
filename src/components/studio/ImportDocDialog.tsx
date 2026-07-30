import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { FileUp, Loader2 } from "lucide-react";
import type { ContentBlock } from "@/data/stories";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  blocksToMarkdownSource,
  guessTitle,
  htmlToBlocks,
  markdownToBlocks,
  textToBlocks,
} from "@/lib/doc-import";

const BUCKET = import.meta.env.VITE_SUPABASE_BUCKET || "right2read";

const ACCEPT =
  ".docx,.md,.markdown,.txt,.html,.htm,text/plain,text/markdown,text/html,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

type ImportMode = "blocks" | "markdown";

interface Props {
  /** Called with the parsed blocks; `replace` clears the current canvas. */
  onImport: (blocks: ContentBlock[], opts: { replace: boolean; title: string | null }) => void;
}

/** Converts a data: URL to a File so it can be uploaded to storage. */
function dataUrlToFile(dataUrl: string, name: string): File | null {
  const m = dataUrl.match(/^data:([^;,]+);base64,(.*)$/);
  if (!m) return null;
  const bin = atob(m[2]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const ext = (m[1].split("/")[1] || "png").replace("+xml", "");
  return new File([bytes], `${name}.${ext}`, { type: m[1] });
}

export function ImportDocButton({ onImport }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<ImportMode>("blocks");
  const [replace, setReplace] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /** Upload embedded (data:) images so stories reference real media URLs. */
  const hostEmbeddedImages = async (blocks: ContentBlock[]): Promise<ContentBlock[]> => {
    if (!user) return blocks;
    const walk = async (b: ContentBlock): Promise<ContentBlock> => {
      if (b.type === "layout") {
        return { ...b, items: await Promise.all(b.items.map(walk)) };
      }
      if (b.type !== "image" || !b.src.startsWith("data:")) return b;
      const file = dataUrlToFile(b.src, `import-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);
      if (!file) return b;
      const path = `${user.id}/${file.name}`;
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { cacheControl: "31536000", upsert: false });
      if (upErr) return b;
      const { data: signed } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (!signed) return b;
      await supabase.from("media_assets").insert({
        user_id: user.id,
        kind: "image",
        url: signed.signedUrl,
        path,
        filename: file.name,
        size_bytes: file.size,
      });
      return { ...b, src: signed.signedUrl };
    };
    const out = await Promise.all(blocks.map(walk));
    qc.invalidateQueries({ queryKey: ["media-assets", user.id] });
    return out;
  };

  const handleFile = async (file: File) => {
    setBusy(true);
    setError(null);
    setStatus(`Reading ${file.name}…`);
    try {
      const name = file.name.toLowerCase();
      let blocks: ContentBlock[] = [];

      if (name.endsWith(".docx")) {
        const mammoth = await import("mammoth/mammoth.browser");
        const buffer = await file.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer: buffer });
        blocks = htmlToBlocks(result.value);
      } else if (name.endsWith(".html") || name.endsWith(".htm")) {
        blocks = htmlToBlocks(await file.text());
      } else if (name.endsWith(".md") || name.endsWith(".markdown")) {
        blocks = markdownToBlocks(await file.text());
      } else if (name.endsWith(".txt") || file.type.startsWith("text/")) {
        blocks = textToBlocks(await file.text());
      } else if (name.endsWith(".doc")) {
        throw new Error("Legacy .doc isn't supported — save it as .docx and try again.");
      } else {
        throw new Error("Unsupported file. Use .docx, .md, .txt or .html.");
      }

      if (!blocks.length) throw new Error("No readable content found in that file.");

      setStatus("Uploading embedded images…");
      blocks = await hostEmbeddedImages(blocks);

      const title = guessTitle(blocks);
      const final: ContentBlock[] =
        mode === "markdown"
          ? [{ type: "markdown", markdown: blocksToMarkdownSource(blocks) }]
          : blocks;

      onImport(final, { replace, title });
      setStatus(`Imported ${final.length} block${final.length === 1 ? "" : "s"} from ${file.name}.`);
      setOpen(false);
    } catch (e) {
      setError((e as Error).message);
      setStatus(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        title="Import a .docx, Markdown, text or HTML file"
        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-mono text-xs text-foreground hover:border-border-strong"
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileUp className="h-3.5 w-3.5" />}
        Import doc
      </button>

      {open ? (
        <div className="absolute right-0 z-30 mt-2 w-72 rounded-lg border border-border bg-surface p-3 shadow-xl">
          <div className="text-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Import document
          </div>
          <p className="mt-2 text-mono text-[11px] leading-relaxed text-muted-foreground">
            Upload a .docx, .md, .txt or .html file. Headings, lists, quotes, code, tables and image
            or video links are converted for you.
          </p>

          <div className="mt-3 space-y-1.5">
            {(
              [
                ["blocks", "Editable blocks"],
                ["markdown", "One Markdown block"],
              ] as [ImportMode, string][]
            ).map(([value, label]) => (
              <label
                key={value}
                className="flex items-center gap-2 text-mono text-[11px] text-muted-foreground"
              >
                <input
                  type="radio"
                  name="import-mode"
                  checked={mode === value}
                  onChange={() => setMode(value)}
                />
                {label}
              </label>
            ))}
            <label className="flex items-center gap-2 pt-1 text-mono text-[11px] text-muted-foreground">
              <input
                type="checkbox"
                checked={replace}
                onChange={(e) => setReplace(e.target.checked)}
              />
              Replace current blocks
            </label>
          </div>

          <button
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="mt-3 w-full rounded-md bg-primary px-3 py-1.5 text-mono text-[11px] font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {busy ? "Working…" : "Choose file"}
          </button>

          {error ? (
            <p className="mt-2 text-mono text-[11px] text-destructive">{error}</p>
          ) : status ? (
            <p className="mt-2 text-mono text-[11px] text-muted-foreground">{status}</p>
          ) : null}
        </div>
      ) : null}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) handleFile(f);
        }}
      />
    </div>
  );
}
