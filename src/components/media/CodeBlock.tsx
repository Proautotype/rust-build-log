import { useEffect, useState } from "react";
import { Copy, Check } from "lucide-react";
import type { CodeLanguage } from "@/data/stories";

interface Props {
  code: string;
  language: CodeLanguage;
  filename?: string;
}

// Lightweight token-based highlighter. Not a real parser — enough for readable
// developer aesthetics without adding a large dependency. Handles keywords,
// strings, comments, numbers, and type-ish tokens.

const KEYWORDS: Record<CodeLanguage, string[]> = {
  rust: [
    "fn",
    "let",
    "mut",
    "const",
    "static",
    "if",
    "else",
    "match",
    "for",
    "while",
    "loop",
    "return",
    "use",
    "mod",
    "pub",
    "struct",
    "enum",
    "trait",
    "impl",
    "self",
    "Self",
    "as",
    "in",
    "move",
    "ref",
    "where",
    "async",
    "await",
    "dyn",
    "true",
    "false",
    "crate",
    "super",
    "break",
    "continue",
    "type",
  ],
  typescript: [
    "const",
    "let",
    "var",
    "function",
    "return",
    "if",
    "else",
    "for",
    "while",
    "import",
    "from",
    "export",
    "default",
    "class",
    "interface",
    "type",
    "extends",
    "implements",
    "new",
    "this",
    "async",
    "await",
    "true",
    "false",
    "null",
    "undefined",
    "as",
    "of",
    "in",
    "void",
  ],
  java: [
    "public",
    "private",
    "protected",
    "class",
    "interface",
    "static",
    "final",
    "void",
    "new",
    "return",
    "if",
    "else",
    "for",
    "while",
    "import",
    "package",
    "extends",
    "implements",
    "true",
    "false",
    "null",
    "this",
    "super",
    "try",
    "catch",
    "finally",
    "throw",
    "throws",
  ],
  kotlin: [
    "fun",
    "val",
    "var",
    "class",
    "interface",
    "object",
    "if",
    "else",
    "when",
    "for",
    "while",
    "return",
    "import",
    "package",
    "true",
    "false",
    "null",
    "this",
    "super",
    "private",
    "public",
    "internal",
    "protected",
    "suspend",
    "override",
    "data",
    "sealed",
  ],
  python: [
    "def",
    "class",
    "if",
    "elif",
    "else",
    "for",
    "while",
    "return",
    "import",
    "from",
    "as",
    "with",
    "try",
    "except",
    "finally",
    "raise",
    "True",
    "False",
    "None",
    "and",
    "or",
    "not",
    "in",
    "is",
    "lambda",
    "yield",
    "async",
    "await",
    "pass",
    "break",
    "continue",
    "global",
    "nonlocal",
  ],
  bash: [
    "if",
    "then",
    "else",
    "fi",
    "for",
    "in",
    "do",
    "done",
    "while",
    "case",
    "esac",
    "function",
    "return",
    "export",
    "local",
    "cd",
    "echo",
    "exit",
  ],
  toml: [],
  text: [],
};

function highlight(code: string, lang: CodeLanguage): string {
  const escape = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  let src = escape(code);

  // Comments
  if (lang === "python" || lang === "bash" || lang === "toml") {
    src = src.replace(/(^|\s)(#[^\n]*)/g, '$1<span class="tk-com">$2</span>');
  } else {
    src = src.replace(/(\/\/[^\n]*)/g, '<span class="tk-com">$1</span>');
    src = src.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="tk-com">$1</span>');
  }

  // Strings
  src = src.replace(/("(?:[^"\\]|\\.)*")/g, '<span class="tk-str">$1</span>');
  src = src.replace(/('(?:[^'\\]|\\.)*')/g, '<span class="tk-str">$1</span>');

  // Numbers
  src = src.replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="tk-num">$1</span>');

  // Keywords
  const kws = KEYWORDS[lang];
  if (kws.length) {
    const re = new RegExp(`\\b(${kws.join("|")})\\b`, "g");
    src = src.replace(re, '<span class="tk-kw">$1</span>');
  }

  // Rust macros / functions
  if (lang === "rust") {
    src = src.replace(/\b([a-z_][\w]*)!/g, '<span class="tk-mac">$1!</span>');
    src = src.replace(/\b([A-Z][A-Za-z0-9_]*)\b/g, '<span class="tk-type">$1</span>');
  } else if (lang === "typescript" || lang === "java" || lang === "kotlin") {
    src = src.replace(/\b([A-Z][A-Za-z0-9_]*)\b/g, '<span class="tk-type">$1</span>');
  }

  return src;
}

export function CodeBlock({ code, language, filename }: Props) {
  const [copied, setCopied] = useState(false);
  const [html, setHtml] = useState("");

  useEffect(() => {
    setHtml(highlight(code, language));
  }, [code, language]);

  const onCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="my-6 overflow-hidden rounded-lg border border-border bg-surface-2">
      <div className="flex items-center justify-between border-b border-border/80 bg-surface px-4 py-2">
        <div className="flex items-center gap-2 text-mono text-xs">
          <span className="text-primary">◆</span>
          <span className="text-muted-foreground">{filename || language}</span>
          <span className="rounded-sm bg-accent px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
            {language}
          </span>
        </div>
        <button
          onClick={onCopy}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background/60 px-2 py-1 text-[11px] text-mono text-muted-foreground hover:text-foreground hover:border-primary/40 transition"
        >
          {copied ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-[13px] leading-relaxed">
        <code className="text-mono text-foreground/90" dangerouslySetInnerHTML={{ __html: html }} />
      </pre>
      <style>{`
        .tk-kw { color: oklch(0.78 0.16 320); font-weight: 500; }
        .tk-str { color: oklch(0.78 0.15 145); }
        .tk-com { color: oklch(0.55 0.02 260); font-style: italic; }
        .tk-num { color: oklch(0.78 0.14 60); }
        .tk-type { color: oklch(0.78 0.15 200); }
        .tk-mac { color: oklch(0.78 0.17 45); font-weight: 500; }
      `}</style>
    </div>
  );
}
