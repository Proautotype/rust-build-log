import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listXSetupRequests, resolveXSetupRequest } from "@/lib/x-access.functions";

interface Row {
  id: string;
  user_id: string;
  display_name: string | null;
  contact_email: string;
  x_handle: string;
  notes: string;
  status: string;
  price_coins: number;
  admin_note: string;
  created_at: string;
}

/** Admin/manager queue for paid "set up my X access" requests. */
export function XSetupTab() {
  const qc = useQueryClient();
  const listFn = useServerFn(listXSetupRequests);
  const resolveFn = useServerFn(resolveXSetupRequest);
  const q = useQuery({ queryKey: ["x-setup-requests"], queryFn: () => listFn({}) });
  const [tokens, setTokens] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const resolve = useMutation({
    mutationFn: (v: { id: string; status: "in_progress" | "done" | "rejected" }) =>
      resolveFn({
        data: { id: v.id, status: v.status, token: tokens[v.id], adminNote: notes[v.id] },
      }),
    onSuccess: () => {
      setError(null);
      qc.invalidateQueries({ queryKey: ["x-setup-requests"] });
    },
    onError: (e: unknown) => setError(e instanceof Error ? e.message : "Failed"),
  });

  const rows = (q.data ?? []) as unknown as Row[];

  if (q.isLoading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  if (rows.length === 0)
    return <div className="text-sm text-muted-foreground">No X setup requests yet.</div>;

  return (
    <div className="space-y-3">
      {error ? <div className="text-xs text-destructive">{error}</div> : null}
      {rows.map((r) => (
        <div key={r.id} className="rounded-lg border border-border bg-card p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{r.display_name ?? "Writer"}</span>
            <span className="text-mono text-xs text-muted-foreground">{r.contact_email}</span>
            {r.x_handle ? (
              <span className="text-mono text-xs text-muted-foreground">{r.x_handle}</span>
            ) : null}
            <span className="rounded-md bg-muted px-2 py-0.5 text-mono text-[10px] uppercase tracking-widest">
              {r.status}
            </span>
            <span className="ml-auto text-xs text-muted-foreground">
              {r.price_coins} coins · {new Date(r.created_at).toLocaleDateString()}
            </span>
          </div>
          {r.notes ? <p className="mt-2 text-sm text-muted-foreground">{r.notes}</p> : null}

          <div className="mt-3 grid gap-2 md:grid-cols-2">
            <input
              type="password"
              placeholder="X bearer token for this writer (optional)"
              value={tokens[r.id] ?? ""}
              onChange={(e) => setTokens({ ...tokens, [r.id]: e.target.value })}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
            <input
              placeholder="Note for the writer"
              value={notes[r.id] ?? ""}
              onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => resolve.mutate({ id: r.id, status: "in_progress" })}
              className="rounded-md border border-border px-3 py-1.5 text-mono text-xs hover:bg-muted"
            >
              Mark in progress
            </button>
            <button
              onClick={() => resolve.mutate({ id: r.id, status: "done" })}
              className="rounded-md bg-primary px-3 py-1.5 text-mono text-xs text-primary-foreground hover:bg-primary/90"
            >
              Save token & complete
            </button>
            <button
              onClick={() => resolve.mutate({ id: r.id, status: "rejected" })}
              className="rounded-md border border-destructive/40 px-3 py-1.5 text-mono text-xs text-destructive hover:bg-destructive/10"
            >
              Reject & refund
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
