import { useState } from "react";
import { Check, Copy, Link2, Share2 } from "lucide-react";

interface Props {
  url: string;
  title: string;
  text?: string;
}

export function ShareButton({ url, title, text }: Props) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  const encUrl = encodeURIComponent(url);
  const encTitle = encodeURIComponent(title);
  const encText = encodeURIComponent(text ?? title);

  const twitter = `https://twitter.com/intent/tweet?url=${encUrl}&text=${encText}`;
  const linkedin = `https://www.linkedin.com/sharing/share-offsite/?url=${encUrl}`;
  const reddit = `https://www.reddit.com/submit?url=${encUrl}&title=${encTitle}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  }

  async function nativeShare() {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ url, title, text });
        return true;
      } catch {
        /* fall through */
      }
    }
    return false;
  }

  return (
    <div className="relative inline-block">
      <button
        onClick={async () => {
          const shared = await nativeShare();
          if (!shared) setOpen((o) => !o);
        }}
        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-card/40 px-3 text-xs text-foreground hover:border-primary/40 hover:text-primary transition"
      >
        <Share2 className="h-3.5 w-3.5" />
        Share
      </button>

      {open && (
        <div
          className="absolute right-0 z-30 mt-2 w-56 rounded-lg border border-border bg-card p-1 shadow-lg"
          onMouseLeave={() => setOpen(false)}
        >
          <button
            onClick={copyLink}
            className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-xs hover:bg-accent"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-primary" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            {copied ? "Link copied" : "Copy link"}
          </button>
          <a
            href={twitter}
            target="_blank"
            rel="noreferrer"
            className="flex w-full items-center gap-2 rounded px-3 py-2 text-xs hover:bg-accent"
          >
            <Link2 className="h-3.5 w-3.5" /> Share on X / Twitter
          </a>
          <a
            href={linkedin}
            target="_blank"
            rel="noreferrer"
            className="flex w-full items-center gap-2 rounded px-3 py-2 text-xs hover:bg-accent"
          >
            <Link2 className="h-3.5 w-3.5" /> Share on LinkedIn
          </a>
          <a
            href={reddit}
            target="_blank"
            rel="noreferrer"
            className="flex w-full items-center gap-2 rounded px-3 py-2 text-xs hover:bg-accent"
          >
            <Link2 className="h-3.5 w-3.5" /> Share on Reddit
          </a>
        </div>
      )}
    </div>
  );
}
