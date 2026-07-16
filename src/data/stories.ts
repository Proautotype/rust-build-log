// Types and mappers for stories/journeys. All actual data now lives in Supabase.
import heroRust from "@/assets/hero-rust.jpg";
import type { Tables } from "@/integrations/supabase/types";

export type Difficulty = "Beginner" | "Intermediate" | "Advanced";

export type Category =
  | "Fundamentals"
  | "Systems Programming"
  | "Backend"
  | "CLI Tools"
  | "Embedded"
  | "Web Development"
  | "Meta";

export type CodeLanguage =
  | "rust"
  | "typescript"
  | "java"
  | "kotlin"
  | "python"
  | "bash"
  | "toml"
  | "text";

export type ContentBlock =
  | { type: "heading"; level: 2 | 3; text: string; id: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered?: boolean; items: string[]; delimiter?: string }
  | { type: "quote"; text: string; cite?: string }
  | { type: "code"; language: CodeLanguage; filename?: string; code: string }
  | { type: "image"; src: string; alt: string; caption?: string }
  | { type: "video"; youtubeId: string; title: string }
  | { type: "pdf"; title: string; description?: string; sizeKb: number; href: string }
  | { type: "gallery"; images: { src: string; alt: string }[] };

export interface Story {
  id: string;
  title: string;
  slug: string;
  shortDescription: string;
  cover: string;
  content: ContentBlock[];
  createdAt: string;
  updatedAt: string;
  category: Category;
  tags: string[];
  difficulty: Difficulty;
  readingMinutes: number;
  journeyId: string | null;
  creatorId: string | null;
}

export interface Journey {
  id: string;
  title: string;
  slug: string;
  description: string;
  cover: string;
  startedAt: string;
  creatorId: string | null;
}

export const heroImage = heroRust;

export const allCategories: Category[] = [
  "Fundamentals",
  "Systems Programming",
  "Backend",
  "CLI Tools",
  "Embedded",
  "Web Development",
  "Meta",
];

export const allDifficulties: Difficulty[] = ["Beginner", "Intermediate", "Advanced"];

export const technologies = [
  { name: "Rust", note: "Primary language" },
  { name: "Tokio", note: "Async runtime" },
  { name: "Axum", note: "Web framework" },
  { name: "Cargo", note: "Build & package" },
  { name: "FFmpeg", note: "Media pipeline" },
  { name: "SQLite", note: "Embedded DB" },
  { name: "WASM", note: "Portable target" },
  { name: "Serde", note: "Serialization" },
];

const FALLBACK_COVER = "https://placehold.co/1600x900/1a1a1a/f97316?text=Rust+Journey";

export function rowToStory(row: Tables<"stories">): Story {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    shortDescription: row.short_description ?? "",
    cover: row.cover || FALLBACK_COVER,
    content: (Array.isArray(row.content) ? row.content : []) as unknown as ContentBlock[],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    category: (row.category ?? "Fundamentals") as Category,
    tags: row.tags ?? [],
    difficulty: (row.difficulty ?? "Beginner") as Difficulty,
    readingMinutes: row.reading_minutes ?? 5,
    journeyId: row.journey_id,
    creatorId: row.creator_id,
  };
}

export function rowToJourney(row: Tables<"journeys">): Journey {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description ?? "",
    cover: row.cover || FALLBACK_COVER,
    startedAt: row.started_at,
    creatorId: row.creator_id,
  };
}
