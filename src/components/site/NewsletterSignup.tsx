import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Mail, Check } from "lucide-react";
import { subscribeToNewsletter } from "@/lib/newsletter.functions";

export function NewsletterSignup({ className = "" }: { className?: string }) {
  const [email, setEmail] = useState("");
  const subscribeFn = useServerFn(subscribeToNewsletter);

  const mut = useMutation({
    mutationFn: () => subscribeFn({ data: { email, topics: [], source: "footer" } }),
    onSuccess: () => setEmail(""),
  });

  return (
    <form
      className={`w-full max-w-md ${className}`}
      onSubmit={(e) => {
        e.preventDefault();
        if (email.trim()) mut.mutate();
      }}
    >
      <div className="text-mono text-[11px] uppercase tracking-wider text-muted-foreground">
        Story newsletter
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        New stories, straight to your inbox. No noise.
      </p>
      <div className="mt-2 flex items-center gap-2">
        <div className="relative flex-1">
          <Mail className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="email"
            required
            maxLength={255}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            aria-label="Email address"
            className="w-full rounded-md border border-border bg-surface pl-8 pr-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>
        <button
          type="submit"
          disabled={mut.isPending}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {mut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          Subscribe
        </button>
      </div>
      {mut.isSuccess ? (
        <div className="mt-2 inline-flex items-center gap-1 text-xs text-emerald-400">
          <Check className="h-3.5 w-3.5" /> You're on the list.
        </div>
      ) : null}
      {mut.isError ? (
        <div className="mt-2 text-xs text-destructive">{(mut.error as Error).message}</div>
      ) : null}
    </form>
  );
}
