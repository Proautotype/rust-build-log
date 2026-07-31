import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { Flag, Loader2, CheckCircle2, BellRing } from "lucide-react";
import { listFlagQueue, resolveAdminNotification } from "@/lib/admin.dashboard.functions";
import { formatDateLong } from "@/lib/format";

interface Notification {
  id: string;
  message: string;
  resolved: boolean;
  created_at: string;
}

interface FlagRow {
  id: string;
  story_id: string;
  reason: string;
  created_at: string;
}

export function FlagsTab() {
  const qc = useQueryClient();
  const listFn = useServerFn(listFlagQueue);
  const resolveFn = useServerFn(resolveAdminNotification);

  const q = useQuery({ queryKey: ["admin-flags"], queryFn: () => listFn() });
  const resolveMut = useMutation({
    mutationFn: (id: string) => resolveFn({ data: { id } }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["admin-flags"] }),
  });

  if (q.isLoading) {
    return (
      <div className="text-sm text-muted-foreground">
        <Loader2 className="inline h-4 w-4 animate-spin mr-2" /> Loading flags…
      </div>
    );
  }
  if (q.isError) {
    return <div className="text-sm text-destructive">{(q.error as Error).message}</div>;
  }

  const notifications = (q.data!.notifications ?? []) as Notification[];
  const flags = (q.data!.flags ?? []) as FlagRow[];
  const titles = (q.data!.titles ?? {}) as Record<string, string>;
  const threshold = q.data!.threshold;
  const open = notifications.filter((n: Notification) => !n.resolved);

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2">
          <BellRing className="h-4 w-4 text-primary" />
          <h2 className="font-medium">Threshold alerts</h2>
          <span className="text-mono text-[11px] text-muted-foreground">
            fires at {threshold} flags
          </span>
        </div>
        {open.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No open alerts. Nice and quiet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {open.map((n) => (
              <li
                key={n.id}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-3"
              >
                <Flag className="h-4 w-4 text-destructive" />
                <div className="min-w-0">
                  <div className="text-sm">{n.message}</div>
                  <div className="text-mono text-[11px] text-muted-foreground">
                    {formatDateLong(n.created_at)}
                  </div>
                </div>
                <button
                  onClick={() => resolveMut.mutate(n.id)}
                  disabled={resolveMut.isPending}
                  className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> Resolve
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h2 className="font-medium">Recent reports</h2>
        {flags.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No reader reports yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border rounded-lg border border-border">
            {flags.map((f) => (
              <li key={f.id} className="p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">
                    {titles[f.story_id] ?? "Unknown story"}
                  </span>
                  <span className="text-mono text-[11px] text-muted-foreground">
                    {formatDateLong(f.created_at)}
                  </span>
                  <Link
                    to="/admin/dashboard"
                    className="ml-auto text-mono text-[11px] uppercase tracking-wider text-primary hover:underline"
                  >
                    Moderate in Stories tab →
                  </Link>
                </div>
                {f.reason ? (
                  <p className="mt-1 text-sm text-muted-foreground">{f.reason}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
