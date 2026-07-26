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
  Bold,
  Italic,
  Link2,
  Heading as HeadingIcon,
  CaseSensitive,
  Sparkles,
  FileCode,
  Upload,
  Film,
} from "lucide-react";
import type {
  ContentBlock,
  CodeLanguage,
  Category,
  Difficulty,
  Monetization,
} from "@/data/stories";
import { allCategories, allDifficulties } from "@/data/stories";
import { ContentRenderer } from "@/components/story/ContentRenderer";
import {
  listMyStories,
  listJourneys,
  saveStory,
  createJourney,
  deleteMyStory,
} from "@/lib/studio.functions";
import { draftStoryWithAi } from "@/lib/agent.functions";
import { Bot } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

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
  id?: string;
  title: string;
  slug: string;
  shortDescription: string;
  cover: string;
  category: Category;
  difficulty: Difficulty;
  readingMinutes: number;
  tags: string;
  journeyId: string | null;
  published: boolean;
  blocks: EditorBlock[];
  monetization: Monetization;
  unlockPrice: number;
  tipEnabled: boolean;
  promoted: boolean;
}

interface JourneyRow {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  cover: string | null;
  creator_id: string;
  started_at: string;
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
  journeyId: null,
  published: false,
  monetization: "free",
  unlockPrice: 100,
  tipEnabled: false,
  promoted: false,
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
  const [mode, setMode] = useState<"edit" | "markdown" | "preview">("edit");
  const [hydrated, setHydrated] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const listMyStoriesFn = useServerFn(listMyStories);
  const listJourneysFn = useServerFn(listJourneys);
  const saveStoryFn = useServerFn(saveStory);
  const createJourneyFn = useServerFn(createJourney);
  const deleteMyStoryFn = useServerFn(deleteMyStory);
  const qc = useQueryClient();

  const storiesQuery = useQuery({
    queryKey: ["my-stories"],
    queryFn: () => listMyStoriesFn(),
  });
  const journeysQuery = useQuery({
    queryKey: ["journeys"],
    queryFn: () => listJourneysFn(),
  });

  // Load draft from localStorage on client only (avoid SSR mismatch).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setDraft({ ...emptyDraft(), ...JSON.parse(raw) });
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

  const newDraft = () => {
    if (confirm("Start a fresh draft? Unsaved local changes will be lost.")) setDraft(emptyDraft());
  };

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

  const saveMutation = useMutation({
    mutationFn: async (published: boolean) => {
      if (!draft.title.trim()) throw new Error("Title is required");
      if (!draft.slug.trim()) throw new Error("Slug is required");
      const payload = {
        id: draft.id,
        title: draft.title.trim(),
        slug: draft.slug.trim(),
        short_description: draft.shortDescription,
        cover: draft.cover,
        category: draft.category,
        difficulty: draft.difficulty,
        reading_minutes: Number(draft.readingMinutes) || 0,
        tags: draft.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        content: draft.blocks.map(({ _uid: _u, ...rest }) => rest),
        published,
        journey_id: draft.journeyId,
        monetization: draft.monetization,
        unlock_price: draft.unlockPrice,
        tip_enabled: draft.tipEnabled,
        promoted: draft.promoted,
      };
      return saveStoryFn({ data: payload });
    },
    onSuccess: (row, published) => {
      if (row && typeof row === "object" && "id" in row) {
        setDraft((d) => ({ ...d, id: (row as { id: string }).id, published }));
      }
      setStatus(published ? "Published to cloud ✓" : "Draft saved to cloud ✓");
      qc.invalidateQueries({ queryKey: ["my-stories"] });
      setTimeout(() => setStatus(null), 2500);
    },
    onError: (err: Error) => setStatus(`Save failed: ${err.message}`),
  });

  const loadStory = (id: string) => {
    const s = (storiesQuery.data ?? []).find((x) => x.id === id);
    if (!s) return;
    setDraft({
      id: s.id,
      title: s.title,
      slug: s.slug,
      shortDescription: s.short_description ?? "",
      cover: s.cover ?? "",
      category: (s.category ?? "Fundamentals") as Category,
      difficulty: (s.difficulty ?? "Beginner") as Difficulty,
      readingMinutes: s.reading_minutes ?? 5,
      tags: (s.tags ?? []).join(", "),
      journeyId: s.journey_id ?? null,
      published: s.published ?? false,
      monetization: ((s as { monetization?: Monetization }).monetization ?? "free") as Monetization,
      unlockPrice: (s as { unlock_price?: number }).unlock_price ?? 100,
      tipEnabled: (s as { tip_enabled?: boolean }).tip_enabled ?? false,
      promoted: (s as { promoted?: boolean }).promoted ?? false,
      blocks: (Array.isArray(s.content) ? s.content : []).map((b) => ({
        ...(b as ContentBlock),
        _uid: uid(),
      })),
    });
    setStatus(`Loaded "${s.title}"`);
    setTimeout(() => setStatus(null), 2000);
  };

  const deleteCurrent = async () => {
    if (!draft.id) return;
    if (!confirm("Delete this story from the cloud? This can't be undone.")) return;
    await deleteMyStoryFn({ data: { id: draft.id } });
    qc.invalidateQueries({ queryKey: ["my-stories"] });
    setDraft(emptyDraft());
    setStatus("Deleted");
    setTimeout(() => setStatus(null), 2000);
  };

  const handleCreateJourney = async (input: {
    title: string;
    slug: string;
    description: string;
    cover: string;
  }) => {
    const row = await createJourneyFn({ data: input });
    qc.invalidateQueries({ queryKey: ["journeys"] });
    if (row && typeof row === "object" && "id" in row) {
      update({ journeyId: (row as { id: string }).id });
    }
  };

  return (
    <div className="border-t border-border/60">
      {/* Studio header */}
      <div className="border-b border-border/60 bg-surface/40 backdrop-blur">
        <div className="container-page flex flex-wrap items-center justify-between gap-3 py-4">
          <div>
            <div className="text-mono text-[11px] uppercase tracking-widest text-primary">
              Creator Studio {draft.id ? "· editing" : "· new"}
            </div>
            <h1 className="mt-1 text-2xl font-display tracking-tight">
              {draft.title || "Compose a story"}
            </h1>
            {status ? (
              <div className="mt-1 text-mono text-[11px] text-primary">{status}</div>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StoriesDropdown
              stories={storiesQuery.data ?? []}
              onLoad={loadStory}
              onNew={newDraft}
            />
            <div className="inline-flex rounded-md border border-border bg-background p-0.5 text-mono text-xs">
              <button
                onClick={() => setMode("edit")}
                className={`inline-flex items-center gap-1.5 rounded px-3 py-1.5 transition ${
                  mode === "edit"
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Pencil className="h-3.5 w-3.5" /> Blocks
              </button>
              <button
                onClick={() => {
                  const isMd = draft.blocks.length === 1 && draft.blocks[0]?.type === "markdown";
                  if (
                    !isMd &&
                    draft.blocks.length > 0 &&
                    !confirm(
                      "Switch to Markdown editor? Existing blocks will be converted into a single Markdown block.",
                    )
                  ) {
                    return;
                  }
                  if (!isMd) {
                    const md = blocksToMarkdown(draft.blocks);
                    update({
                      blocks: [{ _uid: uid(), type: "markdown", markdown: md }],
                    });
                  }
                  setMode("markdown");
                }}
                className={`inline-flex items-center gap-1.5 rounded px-3 py-1.5 transition ${
                  mode === "markdown"
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <FileCode className="h-3.5 w-3.5" /> Markdown
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
              onClick={() => setAiOpen(true)}
              title="Draft this story with AI"
              className="inline-flex items-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 px-3 py-1.5 text-mono text-xs text-primary hover:bg-primary/20"
            >
              <Bot className="h-3.5 w-3.5" /> AI draft
            </button>
            <button
              onClick={exportJson}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-mono text-xs text-foreground hover:border-border-strong"
            >
              <Download className="h-3.5 w-3.5" /> Export JSON
            </button>
            <button
              onClick={() => saveMutation.mutate(false)}
              disabled={saveMutation.isPending}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-mono text-xs text-foreground hover:border-border-strong disabled:opacity-50"
            >
              {saveMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Cloud className="h-3.5 w-3.5" />
              )}
              Save draft
            </button>
            <button
              onClick={() => saveMutation.mutate(true)}
              disabled={saveMutation.isPending}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-mono text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              <Cloud className="h-3.5 w-3.5" /> {draft.published ? "Update" : "Publish"}
            </button>
          </div>
        </div>
      </div>

      {mode === "preview" ? (
        <PreviewPane draft={draft} />
      ) : mode === "markdown" ? (
        <div className="container-page py-6">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="rounded-lg border border-border bg-background p-3">
              <MarkdownField
                value={draft.blocks[0]?.type === "markdown" ? draft.blocks[0].markdown : ""}
                onChange={(v) =>
                  update({
                    blocks: [{ _uid: uid(), type: "markdown", markdown: v }],
                  })
                }
              />
            </div>
            <MetaPanel
              draft={draft}
              onChange={update}
              journeys={(journeysQuery.data ?? []) as JourneyRow[]}
              onCreateJourney={handleCreateJourney}
              onDelete={draft.id ? deleteCurrent : undefined}
            />
          </div>
        </div>
      ) : (
        <div className="container-page py-6">
          <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)_280px]">
            <div className="space-y-3">
              <Palette />
              <MediaLibrary />
            </div>
            <Canvas
              draft={draft}
              onInsertAt={insertAt}
              onMove={moveBlock}
              onRemove={removeBlock}
              onDuplicate={duplicateBlock}
              onChangeBlock={updateBlock}
            />
            <MetaPanel
              draft={draft}
              onChange={update}
              journeys={(journeysQuery.data ?? []) as JourneyRow[]}
              onCreateJourney={handleCreateJourney}
              onDelete={draft.id ? deleteCurrent : undefined}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function StoriesDropdown({
  stories,
  onLoad,
  onNew,
}: {
  stories: Array<{ id: string; title: string; published: boolean; updated_at: string }>;
  onLoad: (id: string) => void;
  onNew: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-mono text-xs text-foreground hover:border-border-strong"
      >
        <FolderOpen className="h-3.5 w-3.5" /> My stories ({stories.length})
      </button>
      {open ? (
        <div
          className="absolute right-0 z-30 mt-1 w-72 rounded-md border border-border bg-surface p-1.5 shadow-lg"
          onMouseLeave={() => setOpen(false)}
        >
          <button
            onClick={() => {
              onNew();
              setOpen(false);
            }}
            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-accent"
          >
            <Plus className="h-3.5 w-3.5" /> New story
          </button>
          <div className="my-1 border-t border-border" />
          {stories.length === 0 ? (
            <div className="px-2 py-2 text-mono text-[11px] text-muted-foreground">
              No cloud stories yet.
            </div>
          ) : (
            <ul className="max-h-72 overflow-y-auto">
              {stories.map((s) => (
                <li key={s.id}>
                  <button
                    onClick={() => {
                      onLoad(s.id);
                      setOpen(false);
                    }}
                    className="flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-accent"
                  >
                    <span className="truncate">{s.title || "Untitled"}</span>
                    <span
                      className={`text-mono text-[10px] ${
                        s.published ? "text-primary" : "text-muted-foreground"
                      }`}
                    >
                      {s.published ? "live" : "draft"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
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
/*  Media library (upload + draggable assets)                         */
/* ------------------------------------------------------------------ */

interface MediaAsset {
  id: string;
  kind: "image" | "video";
  url: string;
  path: string;
  filename: string | null;
}

function MediaLibrary() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dropActive, setDropActive] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const assetsQuery = useQuery({
    queryKey: ["media-assets", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<MediaAsset[]> => {
      const { data, error } = await supabase
        .from("media_assets")
        .select("id, kind, url, path, filename")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as MediaAsset[];
    },
  });

  const uploadFiles = async (files: FileList | File[]) => {
    if (!user) {
      setError("Sign in to upload media.");
      return;
    }
    setError(null);
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const kind: "image" | "video" | null = file.type.startsWith("image/")
          ? "image"
          : file.type.startsWith("video/")
            ? "video"
            : null;
        if (!kind) {
          setError(`Unsupported file: ${file.name}`);
          continue;
        }
        const safe = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-");
        const path = `${user.id}/${Date.now()}-${safe}`;
        const { error: upErr } = await supabase.storage
          .from("media")
          .upload(path, file, { cacheControl: "31536000", upsert: false });
        if (upErr) throw upErr;
        // Long-lived signed URL (bucket is private for admin policy reasons).
        const { data: signed, error: sErr } = await supabase.storage
          .from("media")
          .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
        if (sErr || !signed) throw sErr ?? new Error("Failed to sign URL");
        const { error: insErr } = await supabase.from("media_assets").insert({
          user_id: user.id,
          kind,
          url: signed.signedUrl,
          path,
          filename: file.name,
          size_bytes: file.size,
        });
        if (insErr) throw insErr;
      }
      qc.invalidateQueries({ queryKey: ["media-assets", user.id] });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const removeAsset = async (asset: MediaAsset) => {
    if (!confirm("Delete this media file?")) return;
    await supabase.storage.from("media").remove([asset.path]);
    await supabase.from("media_assets").delete().eq("id", asset.id);
    qc.invalidateQueries({ queryKey: ["media-assets", user?.id] });
  };

  const assets = assetsQuery.data ?? [];

  return (
    <aside className="lg:sticky lg:top-[420px] h-fit rounded-lg border border-border bg-surface/60 p-3">
      <div className="flex items-center justify-between px-1 pb-2">
        <div className="text-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Media library
        </div>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-1 rounded border border-border bg-background px-1.5 py-0.5 text-mono text-[10px] text-muted-foreground hover:text-foreground disabled:opacity-50"
        >
          {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
          Upload
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files?.length) uploadFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDropActive(true);
        }}
        onDragLeave={() => setDropActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDropActive(false);
          if (e.dataTransfer.files?.length) uploadFiles(e.dataTransfer.files);
        }}
        className={`mb-2 rounded-md border border-dashed p-3 text-center text-mono text-[10px] transition ${
          dropActive
            ? "border-primary bg-primary/10 text-primary"
            : "border-border text-muted-foreground"
        }`}
      >
        Drop image / video files here
      </div>

      {error ? (
        <div className="mb-2 text-mono text-[10px] text-destructive">{error}</div>
      ) : null}

      {assetsQuery.isLoading ? (
        <div className="text-mono text-[10px] text-muted-foreground">Loading…</div>
      ) : assets.length === 0 ? (
        <div className="text-mono text-[10px] text-muted-foreground">
          No media yet. Upload files, then drag them into your story.
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-1.5">
          {assets.map((a) => (
            <li key={a.id} className="group relative">
              <div
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData(
                    "application/x-block-media",
                    JSON.stringify({
                      kind: a.kind,
                      url: a.url,
                      title: a.filename ?? "",
                    }),
                  );
                  e.dataTransfer.effectAllowed = "copy";
                }}
                className="relative aspect-video overflow-hidden rounded border border-border bg-background cursor-grab active:cursor-grabbing"
                title={`Drag "${a.filename ?? a.kind}" onto the canvas`}
              >
                {a.kind === "image" ? (
                  <img
                    src={a.url}
                    alt={a.filename ?? ""}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-surface-2">
                    <Film className="h-5 w-5 text-primary" />
                  </div>
                )}
              </div>
              <button
                onClick={() => removeAsset(a)}
                className="absolute right-0.5 top-0.5 rounded bg-background/80 p-0.5 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive"
                title="Delete"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 px-1 text-mono text-[10px] leading-relaxed text-muted-foreground">
        Drag a thumbnail onto the story canvas to insert it.
      </p>
    </aside>
  );
}


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
    const media = e.dataTransfer.getData("application/x-block-media");
    if (media) {
      try {
        const m = JSON.parse(media) as { kind: "image" | "video"; url: string; title?: string };
        const _uid = uid();
        const block: EditorBlock =
          m.kind === "image"
            ? { _uid, type: "image", src: m.url, alt: m.title ?? "", caption: "" }
            : { _uid, type: "videoFile", src: m.url, title: m.title ?? "" };
        onInsertAt(index, block);
        return;
      } catch {
        /* ignore */
      }
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
    case "videoFile":
      return "Video (upload)";
    case "pdf":
      return "PDF";
    case "gallery":
      return "Gallery";
    case "markdown":
      return "Markdown";
    default:
      return "Block";
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
        <div className="space-y-2">
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
          <ColorField
            value={block.color}
            onChange={(v) => onChange({ color: v } as Partial<EditorBlock>)}
          />
        </div>
      );
    case "paragraph":
      return (
        <div className="space-y-2">
          <Textarea
            label="Text"
            value={block.text}
            rows={3}
            onChange={(v) => onChange({ text: v } as Partial<EditorBlock>)}
          />
          <ColorField
            value={block.color}
            onChange={(v) => onChange({ color: v } as Partial<EditorBlock>)}
          />
        </div>
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
          <ColorField
            value={block.color}
            onChange={(v) => onChange({ color: v } as Partial<EditorBlock>)}
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
          <ColorField
            value={block.color}
            onChange={(v) => onChange({ color: v } as Partial<EditorBlock>)}
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
    case "markdown":
      return (
        <div className="space-y-2">
          <MarkdownField
            value={block.markdown}
            onChange={(v) => onChange({ markdown: v } as Partial<EditorBlock>)}
          />
          <ColorField
            value={block.color}
            onChange={(v) => onChange({ color: v } as Partial<EditorBlock>)}
          />
        </div>
      );
    case "videoFile":
      return (
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Input
              label="Video URL"
              value={block.src}
              onChange={(v) => onChange({ src: v } as Partial<EditorBlock>)}
            />
          </div>
          <Input
            label="Title"
            value={block.title}
            onChange={(v) => onChange({ title: v } as Partial<EditorBlock>)}
          />
          <Input
            label="Poster (optional)"
            value={block.poster ?? ""}
            onChange={(v) => onChange({ poster: v } as Partial<EditorBlock>)}
          />
        </div>
      );
    default:
      return null;
  }
}

function ColorField({
  value,
  onChange,
}: {
  value: string | undefined;
  onChange: (v: string | undefined) => void;
}) {
  const swatches = ["#f97316", "#ef4444", "#eab308", "#22c55e", "#3b82f6", "#a855f7", "#e5e7eb"];
  return (
    <div className="flex items-center gap-2">
      <span className="text-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        Text color
      </span>
      <input
        type="color"
        value={value ?? "#e5e7eb"}
        onChange={(e) => onChange(e.target.value)}
        className="h-6 w-8 cursor-pointer rounded border border-border bg-background"
        aria-label="Pick color"
      />
      <div className="flex items-center gap-1">
        {swatches.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            className="h-4 w-4 rounded-full border border-border/60"
            style={{ backgroundColor: c }}
            aria-label={`Use ${c}`}
          />
        ))}
      </div>
      {value ? (
        <button
          type="button"
          onClick={() => onChange(undefined)}
          className="text-mono text-[10px] text-muted-foreground hover:text-foreground"
        >
          reset
        </button>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Right-side metadata panel                                         */
/* ------------------------------------------------------------------ */

function MetaPanel({
  draft,
  onChange,
  journeys,
  onCreateJourney,
  onDelete,
}: {
  draft: Draft;
  onChange: (patch: Partial<Draft>) => void;
  journeys: JourneyRow[];
  onCreateJourney: (input: {
    title: string;
    slug: string;
    description: string;
    cover: string;
  }) => Promise<void>;
  onDelete?: () => void;
}) {
  const [creatingJourney, setCreatingJourney] = useState(false);
  const [jTitle, setJTitle] = useState("");
  const [jSlug, setJSlug] = useState("");
  const [jDesc, setJDesc] = useState("");
  const [jCover, setJCover] = useState("");
  const [jSaving, setJSaving] = useState(false);
  const [jError, setJError] = useState<string | null>(null);

  const submitJourney = async () => {
    if (!jTitle.trim()) return;
    setJSaving(true);
    setJError(null);
    try {
      await onCreateJourney({
        title: jTitle.trim(),
        slug: jSlug.trim() || slugify(jTitle),
        description: jDesc,
        cover: jCover,
      });
      setCreatingJourney(false);
      setJTitle("");
      setJSlug("");
      setJDesc("");
      setJCover("");
    } catch (e) {
      setJError((e as Error).message);
    } finally {
      setJSaving(false);
    }
  };

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

      {/* Journey attachment */}
      <div className="rounded-md border border-border bg-background/60 p-2.5 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Journey
          </span>
          {!creatingJourney ? (
            <button
              onClick={() => setCreatingJourney(true)}
              className="inline-flex items-center gap-1 text-mono text-[10px] uppercase tracking-widest text-primary hover:underline"
            >
              <Plus className="h-3 w-3" /> New
            </button>
          ) : null}
        </div>

        {!creatingJourney ? (
          <select
            value={draft.journeyId ?? ""}
            onChange={(e) => onChange({ journeyId: e.target.value || null })}
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/40"
          >
            <option value="">— No journey —</option>
            {journeys.map((j) => (
              <option key={j.id} value={j.id}>
                {j.title}
              </option>
            ))}
          </select>
        ) : (
          <div className="space-y-2">
            <Input
              label="Journey title"
              value={jTitle}
              onChange={(v) => {
                setJTitle(v);
                if (!jSlug) setJSlug(slugify(v));
              }}
            />
            <Input label="Slug" value={jSlug} onChange={(v) => setJSlug(slugify(v))} />
            <Textarea label="Description" rows={2} value={jDesc} onChange={setJDesc} />
            <Input label="Cover URL (optional)" value={jCover} onChange={setJCover} />
            {jError ? <div className="text-mono text-[11px] text-destructive">{jError}</div> : null}
            <div className="flex gap-2">
              <button
                onClick={submitJourney}
                disabled={jSaving || !jTitle.trim()}
                className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-mono text-[11px] font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {jSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : null} Create & attach
              </button>
              <button
                onClick={() => {
                  setCreatingJourney(false);
                  setJError(null);
                }}
                className="rounded-md border border-border px-2.5 py-1 text-mono text-[11px] text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Monetization */}
      <div className="rounded-md border border-border bg-background/60 p-2.5 space-y-2">
        <div className="text-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Monetization
        </div>
        <Select
          label="Mode"
          value={draft.monetization}
          onChange={(v) => onChange({ monetization: v as Monetization })}
          options={[
            { value: "free", label: "Free" },
            { value: "tips", label: "Free + accept tips" },
            { value: "locked", label: "Locked (coins to unlock)" },
          ]}
        />
        {draft.monetization === "locked" ? (
          <Input
            label="Unlock price (coins)"
            type="number"
            value={String(draft.unlockPrice)}
            onChange={(v) => onChange({ unlockPrice: Math.max(0, Number(v) || 0) })}
          />
        ) : null}
        {draft.monetization === "tips" ? (
          <label className="inline-flex items-center gap-2 text-mono text-[11px] text-muted-foreground">
            <input
              type="checkbox"
              checked={draft.tipEnabled}
              onChange={(e) => onChange({ tipEnabled: e.target.checked })}
            />
            Show a "tip the writer" button on this story
          </label>
        ) : null}
        <p className="text-mono text-[10px] leading-relaxed text-muted-foreground">
          Locked stories require readers to spend coins to read. Tips are optional and support you
          directly.
        </p>
        <div className="mt-2 border-t border-border/60 pt-3">
          <label className="inline-flex items-start gap-2 text-mono text-[11px] text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={draft.promoted}
              onChange={(e) => onChange({ promoted: e.target.checked })}
            />
            <span>
              <span className="inline-flex items-center gap-1 text-primary">
                <Sparkles className="h-3 w-3" /> Promote this story
              </span>
              <span className="mt-0.5 block text-muted-foreground">
                Feature it on the landing page in the "Promoted" row.
              </span>
            </span>
          </label>
        </div>
      </div>

      {onDelete ? (
        <button
          onClick={onDelete}
          className="w-full inline-flex items-center justify-center gap-1.5 rounded-md border border-destructive/40 bg-destructive/10 px-2.5 py-1.5 text-mono text-[11px] text-destructive hover:bg-destructive/20"
        >
          <Trash2 className="h-3.5 w-3.5" /> Delete from cloud
        </button>
      ) : null}

      <div className="pt-1 text-mono text-[10px] leading-relaxed text-muted-foreground px-1">
        Autosaves locally. Save draft or Publish to persist to the cloud, tied to your account.
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

/* ------------------------------------------------------------------ */
/*  Markdown editor with formatting toolbar                           */
/* ------------------------------------------------------------------ */

function MarkdownField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLTextAreaElement | null>(null);

  const wrapSelection = (before: string, after: string = before) => {
    const ta = ref.current;
    if (!ta) return;
    const start = ta.selectionStart ?? 0;
    const end = ta.selectionEnd ?? 0;
    const selected = value.slice(start, end);
    const next = value.slice(0, start) + before + selected + after + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.selectionStart = start + before.length;
      ta.selectionEnd = end + before.length;
    });
  };

  const linePrefix = (prefix: string) => {
    const ta = ref.current;
    if (!ta) return;
    const start = ta.selectionStart ?? 0;
    const end = ta.selectionEnd ?? 0;
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    const before = value.slice(0, lineStart);
    const middle = value.slice(lineStart, end);
    const after = value.slice(end);
    const prefixed = middle
      .split("\n")
      .map((l) => (l.startsWith(prefix) ? l : prefix + l))
      .join("\n");
    onChange(before + prefixed + after);
  };

  const transformSelection = (fn: (s: string) => string) => {
    const ta = ref.current;
    if (!ta) return;
    const start = ta.selectionStart ?? 0;
    const end = ta.selectionEnd ?? 0;
    if (start === end) return;
    const next = value.slice(0, start) + fn(value.slice(start, end)) + value.slice(end);
    onChange(next);
  };

  const btn =
    "inline-flex items-center gap-1 rounded border border-border bg-background px-2 py-1 text-mono text-[11px] text-muted-foreground hover:text-foreground hover:border-border-strong";

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <button type="button" className={btn} onClick={() => wrapSelection("**")} title="Bold">
          <Bold className="h-3 w-3" /> Bold
        </button>
        <button type="button" className={btn} onClick={() => wrapSelection("*")} title="Italic">
          <Italic className="h-3 w-3" /> Italic
        </button>
        <button type="button" className={btn} onClick={() => linePrefix("## ")} title="Heading 2">
          <HeadingIcon className="h-3 w-3" /> H2
        </button>
        <button type="button" className={btn} onClick={() => linePrefix("### ")} title="Heading 3">
          <HeadingIcon className="h-3 w-3" /> H3
        </button>
        <button type="button" className={btn} onClick={() => linePrefix("- ")} title="Bullet list">
          <ListIcon className="h-3 w-3" /> List
        </button>
        <button type="button" className={btn} onClick={() => linePrefix("> ")} title="Quote">
          <Quote className="h-3 w-3" /> Quote
        </button>
        <button
          type="button"
          className={btn}
          onClick={() => wrapSelection("`")}
          title="Inline code"
        >
          <Code2 className="h-3 w-3" /> Code
        </button>
        <button
          type="button"
          className={btn}
          onClick={() => wrapSelection("[", "](https://)")}
          title="Link"
        >
          <Link2 className="h-3 w-3" /> Link
        </button>
        <div className="mx-1 h-4 w-px bg-border" />
        <button
          type="button"
          className={btn}
          onClick={() => transformSelection((s) => s.toUpperCase())}
          title="UPPERCASE"
        >
          <CaseSensitive className="h-3 w-3" /> UPPER
        </button>
        <button
          type="button"
          className={btn}
          onClick={() => transformSelection((s) => s.toLowerCase())}
          title="lowercase"
        >
          <CaseSensitive className="h-3 w-3" /> lower
        </button>
        <button
          type="button"
          className={btn}
          onClick={() =>
            transformSelection((s) =>
              s.replace(/\b([a-z])(\w*)/g, (_, a: string, b: string) => a.toUpperCase() + b),
            )
          }
          title="Capitalize Words"
        >
          <CaseSensitive className="h-3 w-3" /> Capitalize
        </button>
      </div>
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={24}
        placeholder="Write your story in Markdown. Select text and use the toolbar to format."
        className="w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-mono text-[13px] leading-relaxed text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
      />
      <p className="text-mono text-[10px] text-muted-foreground">
        Supports GitHub-flavored Markdown (headings, lists, tables, code fences, links).
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Serialize existing blocks -> Markdown (for mode switch)           */
/* ------------------------------------------------------------------ */

function blocksToMarkdown(blocks: EditorBlock[]): string {
  return blocks
    .map((b) => {
      switch (b.type) {
        case "heading":
          return (b.level === 3 ? "### " : "## ") + b.text;
        case "paragraph":
          return b.text;
        case "list":
          return b.items.map((it, i) => (b.ordered ? `${i + 1}. ${it}` : `- ${it}`)).join("\n");
        case "quote":
          return (
            b.text
              .split("\n")
              .map((l) => `> ${l}`)
              .join("\n") + (b.cite ? `\n>\n> — ${b.cite}` : "")
          );
        case "code":
          return "```" + (b.language ?? "") + "\n" + b.code + "\n```";
        case "image":
          return `![${b.alt}](${b.src})` + (b.caption ? `\n\n*${b.caption}*` : "");
        case "video":
          return `[▶ ${b.title}](https://youtu.be/${b.youtubeId})`;
        case "videoFile":
          return `[▶ ${b.title || "Video"}](${b.src})`;
        case "pdf":
          return `[📄 ${b.title}](${b.href})`;
        case "gallery":
          return b.images.map((im) => `![${im.alt}](${im.src})`).join("\n\n");
        case "markdown":
          return b.markdown;
        default:
          return "";
      }
    })
    .join("\n\n");
}
