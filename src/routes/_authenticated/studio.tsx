import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Type,
  Heading1,
  Heading2,
  List as ListIcon,
  Quote,
  Code2,
  Image as ImageIcon,
  Youtube,
  FileText,
  Images,
  Trash2,
  GripVertical,
  Eye,
  Pencil,
  Download,
  Plus,
  Copy,
  RotateCcw,
  Cloud,
  Loader2,
  FolderOpen,
} from "lucide-react";
import type { ContentBlock, CodeLanguage, Category, Difficulty } from "@/data/stories";
import { allCategories, allDifficulties } from "@/data/stories";
import { ContentRenderer } from "@/components/story/ContentRenderer";
import {
  listMyStories,
  listJourneys,
  saveStory,
  createJourney,
  deleteMyStory,
} from "@/lib/studio.functions";


export const Route = createFileRoute("/_authenticated/studio")({
  head: () => ({
    meta: [
      { title: "Creator Studio — Rust Journey" },
      {
        name: "description",
        content:
          "Drag-and-drop editor for composing stories and journey milestones with rich content blocks.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: StudioPage,
});

/* ------------------------------------------------------------------ */
/*  Draft model — mirrors Story from data/stories.ts                  */
/* ------------------------------------------------------------------ */

interface Draft {
  title: string;
  slug: string;
  shortDescription: string;
  cover: string;
  category: Category;
  difficulty: Difficulty;
  readingMinutes: number;
  tags: string; // comma-separated in the editor
  blocks: EditorBlock[];
}

type EditorBlock = ContentBlock & { _uid: string };

const uid = () => Math.random().toString(36).slice(2, 10);

const STORAGE_KEY = "rust-journey:studio-draft:v1";

const emptyDraft = (): Draft => ({
  title: "",
  slug: "",
  shortDescription: "",
  cover: "",
  category: "Fundamentals",
  difficulty: "Beginner",
  readingMinutes: 5,
  tags: "rust",
  blocks: [
    {
      _uid: uid(),
      type: "heading",
      level: 2,
      text: "Start writing here",
      id: "intro",
    },
    {
      _uid: uid(),
      type: "paragraph",
      text: "Drag blocks from the left palette to compose your story.",
    },
  ],
});

/* ------------------------------------------------------------------ */
/*  Block factory (used when dropping from palette)                   */
/* ------------------------------------------------------------------ */

type PaletteKind =
  | "h2"
  | "h3"
  | "paragraph"
  | "list"
  | "list-ordered"
  | "quote"
  | "code"
  | "image"
  | "video"
  | "pdf"
  | "gallery";

function makeBlock(kind: PaletteKind): EditorBlock {
  const _uid = uid();
  switch (kind) {
    case "h2":
      return { _uid, type: "heading", level: 2, text: "New heading", id: `h-${_uid}` };
    case "h3":
      return { _uid, type: "heading", level: 3, text: "Sub heading", id: `h-${_uid}` };
    case "paragraph":
      return { _uid, type: "paragraph", text: "New paragraph. Click to edit." };
    case "list":
      return { _uid, type: "list", items: ["First item", "Second item"] };
    case "list-ordered":
      return { _uid, type: "list", ordered: true, items: ["Step one", "Step two"] };
    case "quote":
      return { _uid, type: "quote", text: "A quote worth remembering.", cite: "" };
    case "code":
      return {
        _uid,
        type: "code",
        language: "rust",
        filename: "src/main.rs",
        code: 'fn main() {\n    println!("Hello, world!");\n}',
      };
    case "image":
      return {
        _uid,
        type: "image",
        src: "https://placehold.co/1200x630/1a1a1a/f97316?text=Image",
        alt: "Image description",
        caption: "",
      };
    case "video":
      return { _uid, type: "video", youtubeId: "5C_HPTJg5ek", title: "Video title" };
    case "pdf":
      return {
        _uid,
        type: "pdf",
        title: "Attachment.pdf",
        description: "",
        sizeKb: 200,
        href: "#",
      };
    case "gallery":
      return {
        _uid,
        type: "gallery",
        images: [
          { src: "https://placehold.co/800x600/1a1a1a/f97316?text=1", alt: "Image 1" },
          { src: "https://placehold.co/800x600/1a1a1a/f97316?text=2", alt: "Image 2" },
        ],
      };
  }
}

const PALETTE: {
  kind: PaletteKind;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { kind: "h2", label: "Heading 2", icon: Heading1 },
  { kind: "h3", label: "Heading 3", icon: Heading2 },
  { kind: "paragraph", label: "Paragraph", icon: Type },
  { kind: "list", label: "Bullet list", icon: ListIcon },
  { kind: "list-ordered", label: "Numbered list", icon: ListIcon },
  { kind: "quote", label: "Quote", icon: Quote },
  { kind: "code", label: "Code", icon: Code2 },
  { kind: "image", label: "Image", icon: ImageIcon },
  { kind: "video", label: "YouTube", icon: Youtube },
  { kind: "pdf", label: "PDF", icon: FileText },
  { kind: "gallery", label: "Gallery", icon: Images },
];

/* ------------------------------------------------------------------ */
/*  Page                                                              */
/* ------------------------------------------------------------------ */

function StudioPage() {
  const [draft, setDraft] = useState<Draft>(() => emptyDraft());
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [hydrated, setHydrated] = useState(false);

  // Load draft from localStorage on client only (avoid SSR mismatch).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setDraft(JSON.parse(raw));
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    } catch {
      /* ignore */
    }
  }, [draft, hydrated]);

  const update = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));

  const updateBlock = (uidVal: string, patch: Partial<EditorBlock>) =>
    setDraft((d) => ({
      ...d,
      blocks: d.blocks.map((b) => (b._uid === uidVal ? ({ ...b, ...patch } as EditorBlock) : b)),
    }));

  const removeBlock = (uidVal: string) =>
    setDraft((d) => ({ ...d, blocks: d.blocks.filter((b) => b._uid !== uidVal) }));

  const duplicateBlock = (uidVal: string) =>
    setDraft((d) => {
      const i = d.blocks.findIndex((b) => b._uid === uidVal);
      if (i < 0) return d;
      const clone: EditorBlock = { ...d.blocks[i], _uid: uid() };
      const next = [...d.blocks];
      next.splice(i + 1, 0, clone);
      return { ...d, blocks: next };
    });

  const insertAt = (index: number, block: EditorBlock) =>
    setDraft((d) => {
      const next = [...d.blocks];
      next.splice(Math.max(0, Math.min(index, next.length)), 0, block);
      return { ...d, blocks: next };
    });

  const moveBlock = (fromUid: string, toIndex: number) =>
    setDraft((d) => {
      const from = d.blocks.findIndex((b) => b._uid === fromUid);
      if (from < 0) return d;
      const next = [...d.blocks];
      const [moved] = next.splice(from, 1);
      const target = from < toIndex ? toIndex - 1 : toIndex;
      next.splice(Math.max(0, Math.min(target, next.length)), 0, moved);
      return { ...d, blocks: next };
    });

  const resetDraft = () => {
    if (confirm("Discard the current draft and start fresh?")) setDraft(emptyDraft());
  };

  const exportJson = () => {
    const clean = {
      ...draft,
      tags: draft.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      blocks: draft.blocks.map(({ _uid: _u, ...rest }) => rest),
    };
    const blob = new Blob([JSON.stringify(clean, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${draft.slug || "story"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="border-t border-border/60">
      {/* Studio header */}
      <div className="border-b border-border/60 bg-surface/40 backdrop-blur">
        <div className="container-page flex flex-wrap items-center justify-between gap-3 py-4">
          <div>
            <div className="text-mono text-[11px] uppercase tracking-widest text-primary">
              Creator Studio
            </div>
            <h1 className="mt-1 text-2xl font-display tracking-tight">Compose a story</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-md border border-border bg-background p-0.5 text-mono text-xs">
              <button
                onClick={() => setMode("edit")}
                className={`inline-flex items-center gap-1.5 rounded px-3 py-1.5 transition ${
                  mode === "edit"
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Pencil className="h-3.5 w-3.5" /> Edit
              </button>
              <button
                onClick={() => setMode("preview")}
                className={`inline-flex items-center gap-1.5 rounded px-3 py-1.5 transition ${
                  mode === "preview"
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Eye className="h-3.5 w-3.5" /> Preview
              </button>
            </div>
            <button
              onClick={resetDraft}
              title="Reset draft"
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-mono text-xs text-muted-foreground hover:text-foreground hover:border-border-strong"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </button>
            <button
              onClick={exportJson}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-mono text-xs font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Download className="h-3.5 w-3.5" /> Export JSON
            </button>
          </div>
        </div>
      </div>

      {mode === "preview" ? (
        <PreviewPane draft={draft} />
      ) : (
        <div className="container-page py-6">
          <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)_260px]">
            <Palette />
            <Canvas
              draft={draft}
              onInsertAt={insertAt}
              onMove={moveBlock}
              onRemove={removeBlock}
              onDuplicate={duplicateBlock}
              onChangeBlock={updateBlock}
            />
            <MetaPanel draft={draft} onChange={update} />
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Palette (draggable sources)                                       */
/* ------------------------------------------------------------------ */

function Palette() {
  return (
    <aside className="lg:sticky lg:top-20 h-fit rounded-lg border border-border bg-surface/60 p-3">
      <div className="text-mono text-[10px] uppercase tracking-widest text-muted-foreground px-1 pb-2">
        Blocks
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-1 gap-1.5">
        {PALETTE.map((p) => (
          <div
            key={p.kind}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("application/x-block-kind", p.kind);
              e.dataTransfer.effectAllowed = "copy";
            }}
            className="group flex items-center gap-2 rounded-md border border-border bg-background px-2.5 py-2 text-sm cursor-grab active:cursor-grabbing hover:border-primary/40 hover:bg-accent/40 transition"
          >
            <p.icon className="h-4 w-4 text-primary" />
            <span className="text-foreground">{p.label}</span>
            <Plus className="ml-auto h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100" />
          </div>
        ))}
      </div>
      <p className="mt-3 px-1 text-mono text-[10px] leading-relaxed text-muted-foreground">
        Drag onto the canvas to insert. Drag blocks by their handle to reorder.
      </p>
    </aside>
  );
}

/* ------------------------------------------------------------------ */
/*  Canvas (drop zone + block list)                                   */
/* ------------------------------------------------------------------ */

interface CanvasProps {
  draft: Draft;
  onInsertAt: (index: number, block: EditorBlock) => void;
  onMove: (fromUid: string, toIndex: number) => void;
  onRemove: (uid: string) => void;
  onDuplicate: (uid: string) => void;
  onChangeBlock: (uid: string, patch: Partial<EditorBlock>) => void;
}

function Canvas({ draft, onInsertAt, onMove, onRemove, onDuplicate, onChangeBlock }: CanvasProps) {
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const dragUid = useRef<string | null>(null);

  const handleDropAt = (index: number, e: React.DragEvent) => {
    e.preventDefault();
    setDropIndex(null);
    const kind = e.dataTransfer.getData("application/x-block-kind") as PaletteKind;
    if (kind) {
      onInsertAt(index, makeBlock(kind));
      return;
    }
    const movingUid = e.dataTransfer.getData("application/x-block-uid") || dragUid.current;
    if (movingUid) onMove(movingUid, index);
    dragUid.current = null;
  };

  return (
    <div className="min-w-0">
      <div className="rounded-lg border border-dashed border-border bg-surface/30 p-4">
        {draft.blocks.length === 0 ? (
          <DropSlot
            active={dropIndex === 0}
            onDropAt={(e) => handleDropAt(0, e)}
            onEnter={() => setDropIndex(0)}
            onLeave={() => setDropIndex(null)}
            label="Drop your first block here"
            empty
          />
        ) : (
          <>
            <DropSlot
              active={dropIndex === 0}
              onDropAt={(e) => handleDropAt(0, e)}
              onEnter={() => setDropIndex(0)}
              onLeave={() => setDropIndex(null)}
            />
            {draft.blocks.map((b, i) => (
              <div key={b._uid}>
                <BlockEditor
                  block={b}
                  index={i}
                  onRemove={() => onRemove(b._uid)}
                  onDuplicate={() => onDuplicate(b._uid)}
                  onChange={(patch) => onChangeBlock(b._uid, patch)}
                  onDragStart={(e) => {
                    dragUid.current = b._uid;
                    e.dataTransfer.setData("application/x-block-uid", b._uid);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                />
                <DropSlot
                  active={dropIndex === i + 1}
                  onDropAt={(e) => handleDropAt(i + 1, e)}
                  onEnter={() => setDropIndex(i + 1)}
                  onLeave={() => setDropIndex(null)}
                />
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function DropSlot({
  active,
  onDropAt,
  onEnter,
  onLeave,
  label,
  empty,
}: {
  active: boolean;
  onDropAt: (e: React.DragEvent) => void;
  onEnter: () => void;
  onLeave: () => void;
  label?: string;
  empty?: boolean;
}) {
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        onEnter();
      }}
      onDragLeave={onLeave}
      onDrop={onDropAt}
      className={`transition-all ${
        empty
          ? `flex items-center justify-center rounded-md border border-dashed py-16 text-mono text-xs ${
              active
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground"
            }`
          : `my-1 rounded-full ${active ? "h-8 bg-primary/10 border border-dashed border-primary" : "h-2"}`
      }`}
    >
      {empty ? label : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Individual block editor                                           */
/* ------------------------------------------------------------------ */

function BlockEditor({
  block,
  index,
  onRemove,
  onDuplicate,
  onChange,
  onDragStart,
}: {
  block: EditorBlock;
  index: number;
  onRemove: () => void;
  onDuplicate: () => void;
  onChange: (patch: Partial<EditorBlock>) => void;
  onDragStart: (e: React.DragEvent) => void;
}) {
  return (
    <div className="group relative rounded-lg border border-border bg-background p-3 transition hover:border-border-strong">
      <div className="flex items-center justify-between gap-2 pb-2">
        <div className="flex items-center gap-2">
          <div
            draggable
            onDragStart={onDragStart}
            className="cursor-grab active:cursor-grabbing rounded p-1 text-muted-foreground hover:text-foreground hover:bg-accent"
            title="Drag to reorder"
          >
            <GripVertical className="h-4 w-4" />
          </div>
          <span className="text-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            {String(index + 1).padStart(2, "0")} · {blockLabel(block)}
          </span>
        </div>
        <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100">
          <button
            onClick={onDuplicate}
            title="Duplicate"
            className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-accent"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onRemove}
            title="Delete"
            className="rounded p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <BlockFields block={block} onChange={onChange} />
    </div>
  );
}

function blockLabel(b: ContentBlock): string {
  switch (b.type) {
    case "heading":
      return `Heading ${b.level}`;
    case "paragraph":
      return "Paragraph";
    case "list":
      return b.ordered ? "Numbered list" : "Bullet list";
    case "quote":
      return "Quote";
    case "code":
      return `Code · ${b.language}`;
    case "image":
      return "Image";
    case "video":
      return "YouTube";
    case "pdf":
      return "PDF";
    case "gallery":
      return "Gallery";
  }
}

/* ------------------------------------------------------------------ */
/*  Field editors                                                     */
/* ------------------------------------------------------------------ */

function BlockFields({
  block,
  onChange,
}: {
  block: EditorBlock;
  onChange: (patch: Partial<EditorBlock>) => void;
}) {
  switch (block.type) {
    case "heading":
      return (
        <div className="grid gap-2 sm:grid-cols-[80px_minmax(0,1fr)]">
          <Select
            label="Level"
            value={String(block.level)}
            onChange={(v) => onChange({ level: v === "3" ? 3 : 2 } as Partial<EditorBlock>)}
            options={[
              { value: "2", label: "H2" },
              { value: "3", label: "H3" },
            ]}
          />
          <Input
            label="Text"
            value={block.text}
            onChange={(v) =>
              onChange({
                text: v,
                id: slugify(v) || block.id,
              } as Partial<EditorBlock>)
            }
          />
        </div>
      );
    case "paragraph":
      return (
        <Textarea
          label="Text"
          value={block.text}
          rows={3}
          onChange={(v) => onChange({ text: v } as Partial<EditorBlock>)}
        />
      );
    case "list":
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <label className="inline-flex items-center gap-2 text-mono text-[11px] text-muted-foreground">
              <input
                type="checkbox"
                checked={!!block.ordered}
                onChange={(e) => onChange({ ordered: e.target.checked } as Partial<EditorBlock>)}
              />
              Ordered
            </label>
          </div>
          <Textarea
            label="Items (one per line)"
            value={block.items.join("\n")}
            rows={Math.max(3, block.items.length)}
            onChange={(v) =>
              onChange({ items: v.split("\n").map((s) => s) } as Partial<EditorBlock>)
            }
          />
        </div>
      );
    case "quote":
      return (
        <div className="space-y-2">
          <Textarea
            label="Quote"
            value={block.text}
            rows={2}
            onChange={(v) => onChange({ text: v } as Partial<EditorBlock>)}
          />
          <Input
            label="Attribution (optional)"
            value={block.cite ?? ""}
            onChange={(v) => onChange({ cite: v } as Partial<EditorBlock>)}
          />
        </div>
      );
    case "code":
      return (
        <div className="space-y-2">
          <div className="grid gap-2 sm:grid-cols-2">
            <Select
              label="Language"
              value={block.language}
              onChange={(v) => onChange({ language: v as CodeLanguage } as Partial<EditorBlock>)}
              options={[
                "rust",
                "typescript",
                "java",
                "kotlin",
                "python",
                "bash",
                "toml",
                "text",
              ].map((l) => ({ value: l, label: l }))}
            />
            <Input
              label="Filename (optional)"
              value={block.filename ?? ""}
              onChange={(v) => onChange({ filename: v } as Partial<EditorBlock>)}
            />
          </div>
          <Textarea
            label="Code"
            value={block.code}
            rows={8}
            mono
            onChange={(v) => onChange({ code: v } as Partial<EditorBlock>)}
          />
        </div>
      );
    case "image":
      return (
        <div className="grid gap-2 sm:grid-cols-2">
          <Input
            label="Image URL"
            value={block.src}
            onChange={(v) => onChange({ src: v } as Partial<EditorBlock>)}
          />
          <Input
            label="Alt text"
            value={block.alt}
            onChange={(v) => onChange({ alt: v } as Partial<EditorBlock>)}
          />
          <div className="sm:col-span-2">
            <Input
              label="Caption (optional)"
              value={block.caption ?? ""}
              onChange={(v) => onChange({ caption: v } as Partial<EditorBlock>)}
            />
          </div>
        </div>
      );
    case "video":
      return (
        <div className="grid gap-2 sm:grid-cols-2">
          <Input
            label="YouTube ID"
            value={block.youtubeId}
            onChange={(v) => onChange({ youtubeId: v } as Partial<EditorBlock>)}
          />
          <Input
            label="Title"
            value={block.title}
            onChange={(v) => onChange({ title: v } as Partial<EditorBlock>)}
          />
        </div>
      );
    case "pdf":
      return (
        <div className="grid gap-2 sm:grid-cols-2">
          <Input
            label="Title"
            value={block.title}
            onChange={(v) => onChange({ title: v } as Partial<EditorBlock>)}
          />
          <Input
            label="Size (KB)"
            type="number"
            value={String(block.sizeKb)}
            onChange={(v) => onChange({ sizeKb: Number(v) || 0 } as Partial<EditorBlock>)}
          />
          <div className="sm:col-span-2">
            <Input
              label="Href"
              value={block.href}
              onChange={(v) => onChange({ href: v } as Partial<EditorBlock>)}
            />
          </div>
          <div className="sm:col-span-2">
            <Input
              label="Description (optional)"
              value={block.description ?? ""}
              onChange={(v) => onChange({ description: v } as Partial<EditorBlock>)}
            />
          </div>
        </div>
      );
    case "gallery":
      return (
        <Textarea
          label="Images (one 'url | alt' per line)"
          value={block.images.map((im) => `${im.src} | ${im.alt}`).join("\n")}
          rows={Math.max(3, block.images.length)}
          mono
          onChange={(v) => {
            const images = v
              .split("\n")
              .map((line) => line.trim())
              .filter(Boolean)
              .map((line) => {
                const [src, ...alt] = line.split("|");
                return { src: src.trim(), alt: alt.join("|").trim() || "" };
              });
            onChange({ images } as Partial<EditorBlock>);
          }}
        />
      );
  }
}

/* ------------------------------------------------------------------ */
/*  Right-side metadata panel                                         */
/* ------------------------------------------------------------------ */

function MetaPanel({
  draft,
  onChange,
}: {
  draft: Draft;
  onChange: (patch: Partial<Draft>) => void;
}) {
  return (
    <aside className="lg:sticky lg:top-20 h-fit rounded-lg border border-border bg-surface/60 p-3 space-y-3">
      <div className="text-mono text-[10px] uppercase tracking-widest text-muted-foreground px-1">
        Story metadata
      </div>
      <Input
        label="Title"
        value={draft.title}
        placeholder="A story worth telling"
        onChange={(v) => onChange({ title: v, slug: draft.slug || slugify(v) })}
      />
      <Input
        label="Slug"
        value={draft.slug}
        placeholder="a-story-worth-telling"
        onChange={(v) => onChange({ slug: slugify(v) })}
      />
      <Textarea
        label="Short description"
        rows={3}
        value={draft.shortDescription}
        onChange={(v) => onChange({ shortDescription: v })}
      />
      <Input label="Cover image URL" value={draft.cover} onChange={(v) => onChange({ cover: v })} />
      <Select
        label="Category"
        value={draft.category}
        onChange={(v) => onChange({ category: v as Category })}
        options={allCategories.map((c) => ({ value: c, label: c }))}
      />
      <Select
        label="Difficulty"
        value={draft.difficulty}
        onChange={(v) => onChange({ difficulty: v as Difficulty })}
        options={allDifficulties.map((d) => ({ value: d, label: d }))}
      />
      <Input
        label="Reading minutes"
        type="number"
        value={String(draft.readingMinutes)}
        onChange={(v) => onChange({ readingMinutes: Number(v) || 0 })}
      />
      <Input
        label="Tags (comma-separated)"
        value={draft.tags}
        onChange={(v) => onChange({ tags: v })}
      />
      <div className="pt-2 text-mono text-[10px] leading-relaxed text-muted-foreground px-1">
        Autosaved locally. Use Export JSON to save the story data.
      </div>
    </aside>
  );
}

/* ------------------------------------------------------------------ */
/*  Preview                                                           */
/* ------------------------------------------------------------------ */

function PreviewPane({ draft }: { draft: Draft }) {
  const blocks = useMemo(
    () => draft.blocks.map(({ _uid: _u, ...rest }) => rest as ContentBlock),
    [draft.blocks],
  );
  const tags = draft.tags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  return (
    <div className="container-page py-10">
      <div className="mx-auto max-w-2xl">
        <div className="text-mono text-[11px] uppercase tracking-widest text-primary">
          {draft.category} · {draft.difficulty}
        </div>
        <h1 className="mt-3 text-4xl md:text-5xl font-display tracking-tight leading-[1.05]">
          {draft.title || "Untitled story"}
        </h1>
        {draft.shortDescription ? (
          <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
            {draft.shortDescription}
          </p>
        ) : null}
        {tags.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <span
                key={t}
                className="rounded-full border border-border bg-surface px-2 py-0.5 text-mono text-[11px] text-muted-foreground"
              >
                #{t}
              </span>
            ))}
          </div>
        ) : null}
        <div className="mt-10">
          <ContentRenderer blocks={blocks} />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tiny form primitives (kept local to studio)                       */
/* ------------------------------------------------------------------ */

function Input({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/40"
      />
    </label>
  );
}

function Textarea({
  label,
  value,
  onChange,
  rows = 3,
  mono = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  mono?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <textarea
        value={value}
        rows={rows}
        onChange={(e) => onChange(e.target.value)}
        className={`mt-1 w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/40 resize-y ${
          mono ? "font-mono text-[13px] leading-relaxed" : ""
        }`}
      />
    </label>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="text-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/40"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
