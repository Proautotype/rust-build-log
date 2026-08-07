import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, ShieldAlert, Mail, Check } from "lucide-react";
import { useRole } from "@/hooks/useRole";
import {
  listSupportMessages,
  updateSupportMessage,
  type SupportMessage,
} from "@/lib/support.functions";
import { formatDateLong } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/support")({
  head: () => ({
    meta: [
      { title: "Customer service inbox — Right2Read" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SupportInbox,
});

const STATUS_STYLES: Record<string, string> = {
  open: "border-primary/40 bg-primary/10 text-primary",
  pending: "border-amber-500/40 bg-amber-500/10 text-amber-500",
  resolved: "border-border bg-accent/40 text-muted-foreground",
};

function Ticket({ m, onSaved }: { m: SupportMessage; onSaved: () => void }) {
  const update = useServerFn(updateSupportMessage);
  const [reply, setReply] = useState(m.reply ?? "");

  const save = useMutation({
    mutationFn: (v: { status?: "open" | "pending" | "resolved"; reply?: string }) =>
      update({ data: { id: m.id, ...v } }),
    onSuccess: onSaved,
  });

  return (
    <div className="rounded-xl border border-border/70 bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{m.subject}</div>
          <div className="text-mono text-[11px] text-muted-foreground">
            {m.name} · {m.email} · {m.category} · {formatDateLong(m.created_at)}
          </div>
        </div>
        <span
          className={`rounded border px-2 py-0.5 text-mono text-[10px] uppercase tracking-widest ${
            STATUS_STYLES[m.status] ?? STATUS_STYLES["open"]
          }`}
        >
          {m.status}
        </span>
      </div>

      <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{m.body}</p>

      <textarea
        rows={3}
        maxLength={4000}
        placeholder="Internal note / the reply you sent…"
        value={reply}
        onChange={(e) => setReply(e.target.value)}
        className="mt-4 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
      />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <a
          href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.subject}`)}`}
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-2.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <Mail className="h-3.5 w-3.5" /> Reply by email
        </a>
        <button
          onClick={() => save.mutate({ reply })}
          disabled={save.isPending}
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-2.5 text-xs hover:bg-accent/60 disabled:opacity-60"
        >
          Save note
        </button>
        <button
          onClick={() => save.mutate({ status: "pending", reply })}
          disabled={save.isPending}
          className="inline-flex h-8 items-center rounded-md border border-amber-500/40 px-2.5 text-xs text-amber-500 disabled:opacity-60"
        >
          Mark pending
        </button>
        <button
          onClick={() => save.mutate({ status: "resolved", reply })}
          disabled={save.isPending}
          className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-2.5 text-xs font-medium text-primary-foreground disabled:opacity-60"
        >
          {save.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Check className="h-3.5 w-3.5" />
          )}
          Resolve
        </button>
      </div>
    </div>
  );
}

function SupportInbox() {
  const { canHandleSupport, loading } = useRole();
  const list = useServerFn(listSupportMessages);
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["support-messages"],
    queryFn: () => list(),
    enabled: canHandleSupport,
  });

  if (loading) {
    return (
      <div className="container-page py-16 text-sm text-muted-foreground">
        <Loader2 className="inline h-4 w-4 animate-spin mr-2" /> Checking permissions…
      </div>
    );
  }

  if (!canHandleSupport) {
    return (
      <div className="container-page py-16 max-w-lg">
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-6 text-center">
          <ShieldAlert className="h-6 w-6 text-destructive mx-auto mb-2" />
          <h1 className="text-lg font-semibold">Customer service only</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            You need the customer service, manager or admin role to read this inbox.
          </p>
        </div>
      </div>
    );
  }

  const messages = q.data ?? [];
  const open = messages.filter((m) => m.status !== "resolved").length;

  return (
    <div className="container-page py-10 md:py-14 max-w-4xl">
      <div className="text-mono text-[11px] uppercase tracking-widest text-primary">
        Customer service
      </div>
      <h1 className="mt-2 text-4xl md:text-5xl font-display tracking-tight">Support inbox</h1>
      <p className="mt-3 text-muted-foreground">
        {open} open · {messages.length} total message{messages.length === 1 ? "" : "s"} from readers
        and writers.
      </p>

      <div className="mt-8 space-y-3">
        {q.isLoading ? (
          <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : messages.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-surface p-10 text-center text-muted-foreground">
            <div className="text-mono text-sm">// inbox is empty.</div>
          </div>
        ) : (
          messages.map((m) => (
            <Ticket
              key={m.id}
              m={m}
              onSaved={() => qc.invalidateQueries({ queryKey: ["support-messages"] })}
            />
          ))
        )}
      </div>
    </div>
  );
}
