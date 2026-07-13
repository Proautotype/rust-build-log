import heroRust from "@/assets/hero-rust.jpg";
import storyBeginners from "@/assets/story-beginners.jpg";
import storyWhyRust from "@/assets/story-why-rust.jpg";
import storyOwnership from "@/assets/story-ownership.jpg";
import storyCli from "@/assets/story-cli.jpg";

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
  | { type: "list"; ordered?: boolean; items: string[] }
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
  createdAt: string; // ISO
  updatedAt: string;
  category: Category;
  tags: string[];
  difficulty: Difficulty;
  readingMinutes: number;
  relatedIds?: string[];
  journeyId: string;
}

export interface Journey {
  id: string;
  title: string;
  slug: string;
  description: string;
  cover: string;
  storyIds: string[];
  startedAt: string;
}

export const heroImage = heroRust;

export const journeys: Journey[] = [
  {
    id: "j-rust",
    title: "Learning Rust",
    slug: "learning-rust",
    description:
      "From zero to shipping. Ownership, lifetimes, async, systems programming, and everything I break along the way.",
    cover: heroRust,
    storyIds: ["s-beginners", "s-why", "s-first-project", "s-ownership", "s-cli", "s-http", "s-ffmpeg"],
    startedAt: "2026-01-14",
  },
];

export const stories: Story[] = [
  {
    id: "s-beginners",
    title: "Is Rust for Beginners?",
    slug: "is-rust-for-beginners",
    shortDescription:
      "The internet says Rust is hard. After a month with the borrow checker, here's what I actually think.",
    cover: storyBeginners,
    createdAt: "2026-02-03",
    updatedAt: "2026-02-05",
    category: "Meta",
    tags: ["rust", "learning", "beginners"],
    difficulty: "Beginner",
    readingMinutes: 6,
    journeyId: "j-rust",
    relatedIds: ["s-why", "s-ownership"],
    content: [
      {
        type: "paragraph",
        text:
          "Every time I mentioned I was picking up Rust, someone warned me it wasn't a first language. The compiler will yell at you. Ownership will hurt. You'll fight lifetimes. So — is any of that true?",
      },
      { type: "heading", level: 2, text: "The short answer", id: "the-short-answer" },
      {
        type: "paragraph",
        text:
          "Yes, and no. Rust is unusual because it forces you to think about memory before your program runs. That's uncomfortable if you're coming from Python or JavaScript, but it's not gatekeeping — it's honesty. The compiler is a pair programmer that refuses to let you ship a segfault.",
      },
      { type: "heading", level: 2, text: "What actually helped me", id: "what-helped" },
      {
        type: "list",
        items: [
          "Reading `The Book` cover to cover before touching a real project.",
          "Writing tiny CLIs instead of trying to build a web app on day one.",
          "Treating compiler errors as prose, not noise.",
          "Ignoring async for the first three weeks.",
        ],
      },
      {
        type: "quote",
        text:
          "Rust doesn't make hard things easy. It makes the hard things you were already doing visible.",
      },
      { type: "heading", level: 2, text: "A first program", id: "first-program" },
      {
        type: "paragraph",
        text: "Here's the smallest useful Rust program I wrote — a temperature converter.",
      },
      {
        type: "code",
        language: "rust",
        filename: "src/main.rs",
        code: `use std::io::{self, Write};

fn celsius_to_fahrenheit(c: f64) -> f64 {
    c * 9.0 / 5.0 + 32.0
}

fn main() {
    print!("Celsius: ");
    io::stdout().flush().unwrap();

    let mut input = String::new();
    io::stdin().read_line(&mut input).expect("read failed");

    match input.trim().parse::<f64>() {
        Ok(c) => println!("{c}°C = {:.1}°F", celsius_to_fahrenheit(c)),
        Err(_) => eprintln!("Not a number."),
    }
}`,
      },
      { type: "heading", level: 2, text: "So, should you?", id: "should-you" },
      {
        type: "paragraph",
        text:
          "If you've written code before, yes. If you're brand new to programming, learn Python for six months first — then come back. Rust rewards patience, not raw hours.",
      },
    ],
  },
  {
    id: "s-why",
    title: "Why Rust Exists",
    slug: "why-rust-exists",
    shortDescription:
      "A short history of Rust — from a Mozilla research project to the language rewriting the kernel.",
    cover: storyWhyRust,
    createdAt: "2026-02-10",
    updatedAt: "2026-02-10",
    category: "Fundamentals",
    tags: ["rust", "history", "systems"],
    difficulty: "Beginner",
    readingMinutes: 8,
    journeyId: "j-rust",
    relatedIds: ["s-beginners", "s-ownership"],
    content: [
      {
        type: "paragraph",
        text:
          "You can't really understand Rust without understanding what it was reacting to. Every design decision is a scar tissue from decades of C and C++ bugs.",
      },
      { type: "heading", level: 2, text: "The problem", id: "problem" },
      {
        type: "paragraph",
        text:
          "Roughly 70% of security vulnerabilities in large C/C++ codebases (Chrome, Windows, Linux) come from memory safety issues: use-after-free, buffer overflows, data races. Not logic bugs. Memory bugs.",
      },
      {
        type: "video",
        youtubeId: "5C_HPTJg5ek",
        title: "Rust in the Linux kernel — a short overview",
      },
      { type: "heading", level: 2, text: "The bet", id: "bet" },
      {
        type: "paragraph",
        text:
          "Rust bets that you can eliminate that entire class of bugs at compile time — without a garbage collector, without runtime overhead — if you're willing to teach the compiler about ownership.",
      },
      { type: "heading", level: 3, text: "Two rules that changed everything", id: "two-rules" },
      {
        type: "list",
        ordered: true,
        items: [
          "Every value has exactly one owner.",
          "You can have many readers, or one writer — never both.",
        ],
      },
      {
        type: "paragraph",
        text:
          "Those two constraints, enforced by the compiler, remove data races and dangling pointers by construction. It's less magic than it sounds.",
      },
      {
        type: "pdf",
        title: "The Rust Programming Language — reference cheatsheet",
        description: "Handy syntax and ownership rules reference (personal notes).",
        sizeKb: 412,
        href: "#",
      },
    ],
  },
  {
    id: "s-first-project",
    title: "My First Rust Project",
    slug: "my-first-rust-project",
    shortDescription:
      "A tiny markdown-to-HTML converter. What I got wrong, what surprised me, and what I'd do again.",
    cover: storyCli,
    createdAt: "2026-02-24",
    updatedAt: "2026-02-26",
    category: "CLI Tools",
    tags: ["rust", "cli", "project"],
    difficulty: "Beginner",
    readingMinutes: 10,
    journeyId: "j-rust",
    relatedIds: ["s-cli", "s-ownership"],
    content: [
      {
        type: "paragraph",
        text:
          "After two weeks of reading, I needed to build something. Not a toy — something I'd actually use. I settled on a markdown-to-HTML converter for my own notes.",
      },
      { type: "heading", level: 2, text: "Setting up the project", id: "setup" },
      {
        type: "code",
        language: "bash",
        code: `cargo new md2html
cd md2html
cargo add pulldown-cmark clap --features clap/derive`,
      },
      {
        type: "code",
        language: "toml",
        filename: "Cargo.toml",
        code: `[package]
name = "md2html"
version = "0.1.0"
edition = "2021"

[dependencies]
pulldown-cmark = "0.10"
clap = { version = "4", features = ["derive"] }`,
      },
      { type: "heading", level: 2, text: "The whole program", id: "code" },
      {
        type: "code",
        language: "rust",
        filename: "src/main.rs",
        code: `use clap::Parser;
use pulldown_cmark::{html, Options, Parser as MdParser};
use std::{fs, path::PathBuf};

#[derive(Parser)]
#[command(about = "Convert markdown to HTML")]
struct Args {
    /// Input markdown file
    input: PathBuf,
    /// Output HTML file
    #[arg(short, long)]
    output: Option<PathBuf>,
}

fn main() -> anyhow::Result<()> {
    let args = Args::parse();
    let md = fs::read_to_string(&args.input)?;

    let mut opts = Options::empty();
    opts.insert(Options::ENABLE_TABLES);
    opts.insert(Options::ENABLE_STRIKETHROUGH);

    let parser = MdParser::new_ext(&md, opts);
    let mut html_out = String::new();
    html::push_html(&mut html_out, parser);

    match args.output {
        Some(path) => fs::write(path, html_out)?,
        None => print!("{html_out}"),
    }
    Ok(())
}`,
      },
      { type: "heading", level: 2, text: "What surprised me", id: "surprises" },
      {
        type: "list",
        items: [
          "Cargo is the best package manager I've ever used. Full stop.",
          "The error messages actually suggest fixes — and they're usually right.",
          "I never wrote a single free() and the program has no leaks. That's the whole point.",
        ],
      },
      {
        type: "image",
        src: storyCli,
        alt: "Terminal running md2html",
        caption: "First successful run — converting these very notes.",
      },
    ],
  },
  {
    id: "s-ownership",
    title: "Understanding Ownership",
    slug: "understanding-ownership",
    shortDescription:
      "The single idea that makes Rust click. Move, borrow, and why the compiler is right (again).",
    cover: storyOwnership,
    createdAt: "2026-03-08",
    updatedAt: "2026-03-10",
    category: "Fundamentals",
    tags: ["rust", "ownership", "memory"],
    difficulty: "Intermediate",
    readingMinutes: 12,
    journeyId: "j-rust",
    relatedIds: ["s-why", "s-first-project"],
    content: [
      {
        type: "paragraph",
        text:
          "Ownership is the one thing you cannot skip. Everything else in Rust — lifetimes, borrowing, Send/Sync — is a consequence of it.",
      },
      { type: "heading", level: 2, text: "Move semantics", id: "move" },
      {
        type: "code",
        language: "rust",
        code: `fn main() {
    let s1 = String::from("hello");
    let s2 = s1;              // s1 is moved into s2
    // println!("{s1}");       // ← would not compile
    println!("{s2}");
}`,
      },
      { type: "heading", level: 2, text: "Borrowing", id: "borrowing" },
      {
        type: "paragraph",
        text:
          "If you don't want to give ownership away, you borrow. A reference lets someone read (or write) without taking the value.",
      },
      {
        type: "code",
        language: "rust",
        code: `fn length(s: &String) -> usize { s.len() }

fn main() {
    let s = String::from("borrowed");
    let n = length(&s);   // s is only lent
    println!("{s} has {n} chars");
}`,
      },
    ],
  },
  {
    id: "s-cli",
    title: "My First Rust CLI Application",
    slug: "first-rust-cli",
    shortDescription: "Building a real CLI with clap, error handling, and a proper release binary.",
    cover: storyCli,
    createdAt: "2026-03-25",
    updatedAt: "2026-03-25",
    category: "CLI Tools",
    tags: ["rust", "cli", "clap"],
    difficulty: "Intermediate",
    readingMinutes: 9,
    journeyId: "j-rust",
    relatedIds: ["s-first-project"],
    content: [
      {
        type: "paragraph",
        text:
          "Once I understood ownership, I wanted a real tool — one I'd install with cargo install and use every day.",
      },
    ],
  },
  {
    id: "s-http",
    title: "Building an HTTP Server in Rust",
    slug: "http-server-in-rust",
    shortDescription: "Axum, tokio, and a small JSON API. What async actually feels like in practice.",
    cover: storyOwnership,
    createdAt: "2026-04-11",
    updatedAt: "2026-04-11",
    category: "Backend",
    tags: ["rust", "axum", "async", "backend"],
    difficulty: "Advanced",
    readingMinutes: 14,
    journeyId: "j-rust",
    relatedIds: ["s-ownership"],
    content: [
      {
        type: "paragraph",
        text: "Async Rust is a different language layered on top of Rust. That's not a criticism — it's a warning.",
      },
    ],
  },
  {
    id: "s-ffmpeg",
    title: "Rust + FFmpeg Video Processing",
    slug: "rust-ffmpeg",
    shortDescription: "Wrapping FFmpeg to build a batch video transcoder. Bindings, unsafe, and pipelines.",
    cover: heroRust,
    createdAt: "2026-05-02",
    updatedAt: "2026-05-02",
    category: "Systems Programming",
    tags: ["rust", "ffmpeg", "video", "systems"],
    difficulty: "Advanced",
    readingMinutes: 16,
    journeyId: "j-rust",
    relatedIds: ["s-http"],
    content: [
      {
        type: "paragraph",
        text: "FFI in Rust is safer than you'd think, right up until it isn't. Here's the pipeline I built.",
      },
    ],
  },
];

export const allTags = Array.from(new Set(stories.flatMap((s) => s.tags))).sort();
export const allCategories = Array.from(new Set(stories.map((s) => s.category))) as Category[];
export const allDifficulties: Difficulty[] = ["Beginner", "Intermediate", "Advanced"];

export function getStoryBySlug(slug: string): Story | undefined {
  return stories.find((s) => s.slug === slug);
}

export function getRelatedStories(story: Story): Story[] {
  if (!story.relatedIds?.length) return [];
  return story.relatedIds
    .map((id) => stories.find((s) => s.id === id))
    .filter((s): s is Story => Boolean(s));
}

export function getAdjacentStories(story: Story): { prev?: Story; next?: Story } {
  const journey = journeys.find((j) => j.id === story.journeyId);
  if (!journey) return {};
  const idx = journey.storyIds.indexOf(story.id);
  const prevId = journey.storyIds[idx - 1];
  const nextId = journey.storyIds[idx + 1];
  return {
    prev: prevId ? stories.find((s) => s.id === prevId) : undefined,
    next: nextId ? stories.find((s) => s.id === nextId) : undefined,
  };
}

export function getJourneyForStory(story: Story): Journey | undefined {
  return journeys.find((j) => j.id === story.journeyId);
}

export function getStoriesForJourney(journey: Journey): Story[] {
  return journey.storyIds
    .map((id) => stories.find((s) => s.id === id))
    .filter((s): s is Story => Boolean(s));
}

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
