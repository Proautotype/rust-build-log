import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { XSetupTab } from "@/components/admin/XSetupTab";

import {
  Users,
  BookText,
  MessageSquare,
  Coins,
  Lock,
  ShieldAlert,
  Loader2,
  Ban,
  CheckCircle2,
  Trash2,
  Plus,
  Minus,
  Search,
} from "lucide-react";
import { useRole } from "@/hooks/useRole";
import {
  getAdminMetrics,
  listUsersForAdmin,
  setUserRole,
  setUserBanned,
  adjustUserCoins,
  listAllStoriesForAdmin,
  adminDeleteStory,
  listAllCommentsForAdmin,
  adminDeleteComment,
  listCoinLedger,
} from "@/lib/admin.dashboard.functions";
import { formatDateLong } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/dashboard")({
  head: () => ({
    meta: [{ title: "Dashboard — Right2Read" }, { name: "robots", content: "noindex" }],
  }),
  component: AdminDashboard,
});

type Tab = "overview" | "users" | "content" | "comments" | "ledger" | "xsetup";

function AdminDashboard() {
  const { isStaff, isAdmin, loading } = useRole();
  const [tab, setTab] = useState<Tab>("overview");

  if (loading) {
    return (
      <div className="container-page py-16 text-sm text-muted-foreground">
        <Loader2 className="inline h-4 w-4 animate-spin mr-2" /> Checking permissions…
      </div>
    );
  }
  if (!isStaff) {
    return (
      <div className="container-page py-16 max-w-lg">
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-6 text-center">
          <ShieldAlert className="h-6 w-6 text-destructive mx-auto mb-2" />
          <h1 className="text-lg font-semibold">Staff only</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Admins and managers can view the dashboard.
          </p>
        </div>
      </div>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "users", label: "Users" },
    { id: "content", label: "Stories" },
    { id: "comments", label: "Comments" },
    { id: "ledger", label: "Ledger" },
    { id: "xsetup", label: "X setup" },
  ];


  return (
    <div className="container-page py-10 md:py-14">
      <div className="text-mono text-[11px] uppercase tracking-widest text-primary">
        {isAdmin ? "Admin" : "Manager"}
      </div>
      <h1 className="mt-2 text-4xl md:text-5xl font-display tracking-tight">Dashboard</h1>
      <p className="mt-3 text-muted-foreground max-w-2xl">
        Site health, users, moderation and the coin ledger.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-2 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-2 text-sm border-b-2 -mb-px transition ${
              tab === t.id
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
        <Link
          to="/admin/requests"
          className="ml-auto text-mono text-[11px] uppercase tracking-widest text-primary hover:underline"
        >
          Writer requests →
        </Link>
      </div>

      <div className="mt-6">
        {tab === "overview" && <OverviewTab />}
        {tab === "users" && <UsersTab />}
        {tab === "content" && <StoriesTab />}
        {tab === "comments" && <CommentsTab />}
        {tab === "ledger" && <LedgerTab />}
        {tab === "xsetup" && <XSetupTab />}

      </div>
    </div>
  );
}

function OverviewTab() {
  const fn = useServerFn(getAdminMetrics);
  const q = useQuery({ queryKey: ["admin-metrics"], queryFn: () => fn() });
  const m = q.data;
  const cards = [
    { label: "Users", value: m?.users, icon: Users },
    { label: "Stories", value: m?.stories, icon: BookText },
    { label: "Published", value: m?.publishedStories, icon: BookText },
    { label: "Journeys", value: m?.journeys, icon: BookText },
    { label: "Comments", value: m?.comments, icon: MessageSquare },
    { label: "Coins in circulation", value: m?.coinsInCirculation, icon: Coins },
    { label: "Story unlocks", value: m?.unlocks, icon: Lock },
    { label: "Pending writer requests", value: m?.pendingRequests, icon: ShieldAlert },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => (
        <div key={c.label} className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <div className="text-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {c.label}
            </div>
            <c.icon className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2 text-3xl font-display">
            {q.isLoading ? "…" : (c.value ?? 0).toLocaleString()}
          </div>
        </div>
      ))}
    </div>
  );
}

function UsersTab() {
  const { isAdmin } = useRole();
  const listFn = useServerFn(listUsersForAdmin);
  const roleFn = useServerFn(setUserRole);
  const banFn = useServerFn(setUserBanned);
  const coinFn = useServerFn(adjustUserCoins);
  const qc = useQueryClient();
  const [search, setSearch] = useState("");

  const q = useQuery({
    queryKey: ["admin-users", search],
    queryFn: () => listFn({ data: { search } }),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-users"] });

  const roleMut = useMutation({
    mutationFn: (v: { userId: string; role: "reader" | "writer" | "manager" | "admin"; grant: boolean }) =>
      roleFn({ data: v }),
    onSuccess: invalidate,
  });
  const banMut = useMutation({
    mutationFn: (v: { userId: string; banned: boolean }) => banFn({ data: v }),
    onSuccess: invalidate,
  });
  const coinMut = useMutation({
    mutationFn: (v: { userId: string; delta: number; note?: string }) => coinFn({ data: v }),
    onSuccess: invalidate,
  });

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by display name…"
            className="w-full rounded-md border border-border bg-background pl-8 pr-2.5 py-1.5 text-sm outline-none focus:border-primary/60"
          />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card/40 divide-y divide-border">
        {q.isLoading ? (
          <div className="p-6 text-sm text-muted-foreground">
            <Loader2 className="inline h-4 w-4 animate-spin mr-2" /> Loading…
          </div>
        ) : (q.data ?? []).length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">No users found.</div>
        ) : (
          (q.data ?? []).map((u) => (
            <div key={u.id} className="p-4 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                {u.avatar_url ? (
                  <img src={u.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-semibold">
                    {(u.display_name ?? "?").slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate flex items-center gap-2">
                    {u.display_name ?? "Unnamed"}
                    {u.banned && (
                      <span className="text-mono text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded bg-destructive/15 text-destructive">
                        banned
                      </span>
                    )}
                    {u.is_pro && (
                      <span className="text-mono text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded bg-primary/15 text-primary">
                        pro
                      </span>
                    )}
                  </div>
                  <div className="text-mono text-[10px] text-muted-foreground">
                    Joined {formatDateLong(u.created_at)} · {u.coin_balance} coins
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {(["reader", "writer", "manager", "admin"] as const).map((r) => {
                  const has = u.roles.includes(r);
                  const disabled = !isAdmin && (r === "admin" || r === "manager");
                  return (
                    <button
                      key={r}
                      disabled={roleMut.isPending || disabled}
                      onClick={() => roleMut.mutate({ userId: u.id, role: r, grant: !has })}
                      title={disabled ? "Only admins can change this role" : undefined}
                      className={`text-mono text-[10px] uppercase tracking-widest px-2 py-1 rounded border transition ${
                        has
                          ? "border-primary/40 bg-primary/10 text-primary"
                          : "border-border bg-background text-muted-foreground hover:text-foreground"
                      } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
                    >
                      {r}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-1">
                <button
                  title="+10 coins"
                  onClick={() => coinMut.mutate({ userId: u.id, delta: 10 })}
                  className="rounded p-1.5 hover:bg-accent"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
                <button
                  title="-10 coins"
                  onClick={() => coinMut.mutate({ userId: u.id, delta: -10 })}
                  className="rounded p-1.5 hover:bg-accent"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <button
                  title={u.banned ? "Unban" : "Ban"}
                  onClick={() => banMut.mutate({ userId: u.id, banned: !u.banned })}
                  className={`rounded p-1.5 hover:bg-accent ${
                    u.banned ? "text-emerald-400" : "text-destructive"
                  }`}
                >
                  {u.banned ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : (
                    <Ban className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function StoriesTab() {
  const listFn = useServerFn(listAllStoriesForAdmin);
  const delFn = useServerFn(adminDeleteStory);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin-stories"], queryFn: () => listFn() });
  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-stories"] }),
  });
  return (
    <div className="rounded-xl border border-border bg-card/40 divide-y divide-border">
      {q.isLoading ? (
        <div className="p-6 text-sm text-muted-foreground">
          <Loader2 className="inline h-4 w-4 animate-spin mr-2" /> Loading…
        </div>
      ) : (q.data ?? []).length === 0 ? (
        <div className="p-6 text-sm text-muted-foreground">No stories.</div>
      ) : (
        (q.data ?? []).map((s) => (
          <div key={s.id} className="p-4 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate flex items-center gap-2">
                {s.title}
                {!s.published && (
                  <span className="text-mono text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded bg-surface text-muted-foreground border border-border">
                    draft
                  </span>
                )}
                {s.monetization === "locked" && (
                  <span className="text-mono text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded bg-primary/15 text-primary">
                    locked · {s.unlock_price}
                  </span>
                )}
                {s.monetization === "tips" && (
                  <span className="text-mono text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                    tips
                  </span>
                )}
              </div>
              <div className="text-mono text-[10px] text-muted-foreground">
                {formatDateLong(s.created_at)} · /{s.slug}
              </div>
            </div>
            <Link
              to="/stories/$slug"
              params={{ slug: s.slug }}
              className="text-mono text-[11px] text-muted-foreground hover:text-primary"
            >
              view
            </Link>
            <button
              disabled={del.isPending}
              onClick={() => {
                if (confirm(`Delete "${s.title}"? This is permanent.`)) del.mutate(s.id);
              }}
              className="rounded p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))
      )}
    </div>
  );
}

function CommentsTab() {
  const listFn = useServerFn(listAllCommentsForAdmin);
  const delFn = useServerFn(adminDeleteComment);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin-comments"], queryFn: () => listFn() });
  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-comments"] }),
  });
  return (
    <div className="rounded-xl border border-border bg-card/40 divide-y divide-border">
      {q.isLoading ? (
        <div className="p-6 text-sm text-muted-foreground">
          <Loader2 className="inline h-4 w-4 animate-spin mr-2" /> Loading…
        </div>
      ) : (q.data ?? []).length === 0 ? (
        <div className="p-6 text-sm text-muted-foreground">No comments.</div>
      ) : (
        (q.data ?? []).map((c) => (
          <div key={c.id} className="p-4 flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-sm">{c.body}</div>
              <div className="text-mono text-[10px] text-muted-foreground mt-1">
                {formatDateLong(c.created_at)} · on /{c.story_slug}
              </div>
            </div>
            <button
              disabled={del.isPending}
              onClick={() => {
                if (confirm("Delete this comment?")) del.mutate(c.id);
              }}
              className="rounded p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))
      )}
    </div>
  );
}

function LedgerTab() {
  const listFn = useServerFn(listCoinLedger);
  const q = useQuery({ queryKey: ["admin-ledger"], queryFn: () => listFn() });
  return (
    <div className="rounded-xl border border-border bg-card/40 divide-y divide-border">
      {q.isLoading ? (
        <div className="p-6 text-sm text-muted-foreground">
          <Loader2 className="inline h-4 w-4 animate-spin mr-2" /> Loading…
        </div>
      ) : (q.data ?? []).length === 0 ? (
        <div className="p-6 text-sm text-muted-foreground">No transactions yet.</div>
      ) : (
        (q.data ?? []).map((t) => (
          <div key={t.id} className="p-3 flex items-center gap-3 text-sm">
            <div className="text-mono text-[10px] w-40 truncate text-muted-foreground">
              {formatDateLong(t.created_at)}
            </div>
            <div className="text-mono text-[10px] uppercase tracking-widest text-primary w-28">
              {t.kind}
            </div>
            <div className="flex-1 min-w-0 truncate text-muted-foreground">{t.note ?? "—"}</div>
            <div
              className={`text-mono text-sm ${
                t.amount >= 0 ? "text-emerald-400" : "text-destructive"
              }`}
            >
              {t.amount >= 0 ? "+" : ""}
              {t.amount}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
