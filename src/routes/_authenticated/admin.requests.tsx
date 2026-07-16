import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, X, Loader2, ShieldAlert } from "lucide-react";
import { useRole } from "@/hooks/useRole";
import { listWriterRequests, reviewWriterRequest } from "@/lib/writer.functions";
import { formatDateLong } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/requests")({
  head: () => ({
    meta: [
      { title: "Writer requests — Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminRequests,
});

function AdminRequests() {
  const { isAdmin, loading } = useRole();
  const list = useServerFn(listWriterRequests);
  const review = useServerFn(reviewWriterRequest);
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["writer-requests"],
    queryFn: () => list(),
    enabled: isAdmin,
  });

  const decide = useMutation({
    mutationFn: (v: { id: string; decision: "approved" | "rejected" }) =>
      review({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["writer-requests"] }),
  });

  if (loading) {
    return (
      <div className="container-page py-16 text-sm text-muted-foreground">
        <Loader2 className="inline h-4 w-4 animate-spin mr-2" /> Checking permissions…
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container-page py-16 max-w-lg">
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-6 text-center">
          <ShieldAlert className="h-6 w-6 text-destructive mx-auto mb-2" />
          <h1 className="text-lg font-semibold">Admins only</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            You need the <span className="text-mono">admin</span> role to view writer requests.
          </p>
        </div>
      </div>
    );
  }

  const requests = q.data ?? [];

  return (
    <div className="container-page py-10 md:py-14 max-w-4xl">
      <div className="text-mono text-[11px] uppercase tracking-widest text-primary">
        Admin
      </div>
      <h1 className="mt-2 text-4xl md:text-5xl font-display tracking-tight">Writer requests</h1>
      <p className="mt-3 text-muted-foreground">
        Approve or reject readers who want to publish stories.
      </p>

      <div className="mt-8 space-y-3">
        {q.isLoading ? (
          <div className="text-sm text-muted-foreground inline-flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : requests.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-surface p-10 text-center text-muted-foreground">
            <div className="text-mono text-sm">// no requests yet.</div>
          </div>
        ) : (
          requests.map((r) => (
            <div
              key={r.id}
              className="flex flex-wrap items-start justify-between gap-4 rounded-lg border border-border bg-card/40 p-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {r.profile?.avatar_url ? (
                    <img src={r.profile.avatar_url} alt="" className="h-6 w-6 rounded-full" />
                  ) : (
                    <div className="h-6 w-6 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[10px] font-semibold">
                      {(r.profile?.display_name ?? "?").slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div className="font-medium text-sm">
                    {r.profile?.display_name ?? "Unknown"}
                  </div>
                  <StatusBadge status={r.status} />
                </div>
                <div className="text-mono text-[11px] text-muted-foreground mt-1">
                  Submitted {formatDateLong(r.created_at)}
                </div>
                {r.message && (
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                    "{r.message}"
                  </p>
                )}
              </div>
              {r.status === "pending" && (
                <div className="flex gap-2">
                  <button
                    disabled={decide.isPending}
                    onClick={() => decide.mutate({ id: r.id, decision: "approved" })}
                    className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                  >
                    <Check className="h-3.5 w-3.5" /> Approve
                  </button>
                  <button
                    disabled={decide.isPending}
                    onClick={() => decide.mutate({ id: r.id, decision: "rejected" })}
                    className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" /> Reject
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "border-yellow-500/40 bg-yellow-500/10 text-yellow-400",
    approved: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
    rejected: "border-destructive/40 bg-destructive/10 text-destructive",
  };
  return (
    <span
      className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-mono text-[10px] uppercase tracking-wider ${
        map[status] ?? "border-border bg-surface text-muted-foreground"
      }`}
    >
      {status}
    </span>
  );
}
