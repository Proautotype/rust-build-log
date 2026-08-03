import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bell } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getMyNotifications, markNotificationsRead } from "@/lib/notifications.functions";

export function NotificationsBell() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const listFn = useServerFn(getMyNotifications);
  const readFn = useServerFn(markNotificationsRead);
  const [open, setOpen] = useState(false);

  const list = useQuery({
    queryKey: ["my-notifications"],
    queryFn: () => listFn({ data: {} }),
    enabled: !!user,
    refetchInterval: 60_000,
  });

  const markAll = useMutation({
    mutationFn: () => readFn({ data: {} }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["my-notifications"] }),
  });

  if (!user) return null;

  const unread = list.data?.unread ?? 0;
  const items = list.data?.items ?? [];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((s) => !s)}
        aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`}
        className="relative inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-accent/60 hover:text-foreground"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-primary px-1 text-[9px] font-semibold leading-4 text-primary-foreground">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <span className="text-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              Notifications
            </span>
            {unread > 0 ? (
              <button
                onClick={() => markAll.mutate()}
                className="text-mono text-[10px] uppercase tracking-wider text-primary hover:underline"
              >
                Mark all read
              </button>
            ) : null}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                Follow a writer to get notified about new stories.
              </div>
            ) : (
              items.map((n) =>
                n.story_slug ? (
                  <Link
                    key={n.id}
                    to="/stories/$slug"
                    params={{ slug: n.story_slug }}
                    onClick={() => setOpen(false)}
                    className={`block border-b border-border/60 px-3 py-2.5 transition hover:bg-accent/40 ${
                      n.read ? "opacity-70" : ""
                    }`}
                  >
                    <div className="text-sm font-medium text-foreground">{n.title}</div>
                    {n.body ? (
                      <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                        {n.body}
                      </div>
                    ) : null}
                  </Link>
                ) : (
                  <div
                    key={n.id}
                    className="border-b border-border/60 px-3 py-2.5 text-sm text-foreground"
                  >
                    {n.title}
                  </div>
                ),
              )
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
