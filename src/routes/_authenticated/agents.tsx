import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Bot,
  Loader2,
  Plus,
  Play,
  Trash2,
  KeyRound,
  ShieldAlert,
  Copy,
  Check,
} from "lucide-react";
import { useRole } from "@/hooks/useRole";
import {
  listMyAgents,
  saveAgent,
  deleteAgent,
  runAgentNow,
  listAgentRuns,
  listMyApiKeys,
  createApiKey,
  revokeApiKey,
} from "@/lib/agent.functions";
import { listJourneys } from "@/lib/studio.functions";

export const Route = createFileRoute("/_authenticated/agents")({
  head: () => ({
    meta: [
      { title: "AI agents — Right2Read" },
      {
        name: "description",
        content:
          "Configure AI writing agents that draft and publish stories on your behalf on Right2Read.",
      },
      { property: "og:title", content: "AI agents — Right2Read" },
      {
        property: "og:description",
        content: "Configure AI writing agents that publish stories on your behalf.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AgentsPage,
});

type AgentForm = {
  id?: string;
  name: string;
  enabled: boolean;
  topic: string;
  tone: string;
  cadence: "daily" | "weekly" | "monthly";
  auto_publish: boolean;
  journey_id: string | null;
  category: string;
  monetization: "free" | "tips" | "locked";
  unlock_price: number;
  tip_enabled: boolean;
  source_mode: "topic" | "x_trends";
  x_keywords: string[];
  use_reader_interests: boolean;
  min_engagement: number;
};

const emptyAgent = (): AgentForm => ({
  name: "My AI writer",
  enabled: false,
  topic: "",
  tone: "practical, friendly",
  cadence: "weekly",
  auto_publish: false,
  journey_id: null,
  category: "Fundamentals",
  monetization: "free",
  unlock_price: 0,
  tip_enabled: false,
  source_mode: "topic",
  x_keywords: [],
  use_reader_interests: false,
  min_engagement: 0,
});

/** Rows from the database may predate the X fields; fill the gaps. */
const toForm = (row: AgentForm): AgentForm => ({
  ...emptyAgent(),
  ...row,
  source_mode: row.source_mode === "x_trends" ? "x_trends" : "topic",
  x_keywords: row.x_keywords ?? [],
  use_reader_interests: row.use_reader_interests ?? false,
  min_engagement: row.min_engagement ?? 0,
});

function AgentsPage() {
  const { isWriter, loading } = useRole();
  const qc = useQueryClient();

  const listAgentsFn = useServerFn(listMyAgents);
  const saveAgentFn = useServerFn(saveAgent);
  const deleteAgentFn = useServerFn(deleteAgent);
  const runAgentFn = useServerFn(runAgentNow);
  const listRunsFn = useServerFn(listAgentRuns);
  const listKeysFn = useServerFn(listMyApiKeys);
  const createKeyFn = useServerFn(createApiKey);
  const revokeKeyFn = useServerFn(revokeApiKey);
  const listJourneysFn = useServerFn(listJourneys);

  const agentsQ = useQuery({ queryKey: ["my-agents"], queryFn: () => listAgentsFn(), enabled: isWriter });
  const runsQ = useQuery({ queryKey: ["agent-runs"], queryFn: () => listRunsFn(), enabled: isWriter });
  const keysQ = useQuery({ queryKey: ["agent-keys"], queryFn: () => listKeysFn(), enabled: isWriter });
  const journeysQ = useQuery({ queryKey: ["journeys"], queryFn: () => listJourneysFn(), enabled: isWriter });

  const [form, setForm] = useState<AgentForm | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [keyLabel, setKeyLabel] = useState("My bot");
  const [copied, setCopied] = useState(false);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["my-agents"] });
    qc.invalidateQueries({ queryKey: ["agent-runs"] });
    qc.invalidateQueries({ queryKey: ["my-stories"] });
  };

  const saveMut = useMutation({
    mutationFn: (f: AgentForm) => saveAgentFn({ data: f }),
    onSuccess: () => {
      setForm(null);
      setStatus("Agent saved");
      invalidate();
      setTimeout(() => setStatus(null), 2500);
    },
    onError: (e: Error) => setStatus(e.message),
  });

  const runMut = useMutation({
    mutationFn: (id: string) => runAgentFn({ data: { id } }),
    onSuccess: (res) => {
      const r = res as { ok: boolean; error?: string };
      setStatus(r.ok ? "Agent run complete — check your studio." : `Run failed: ${r.error}`);
      invalidate();
    },
    onError: (e: Error) => setStatus(e.message),
  });

  const keyMut = useMutation({
    mutationFn: (label: string) => createKeyFn({ data: { label } }),
    onSuccess: (res) => {
      setNewKey((res as { key: string }).key);
      qc.invalidateQueries({ queryKey: ["agent-keys"] });
    },
  });

  if (loading) {
    return (
      <div className="container-page py-16 text-sm text-muted-foreground">
        <Loader2 className="inline h-4 w-4 animate-spin mr-2" /> Loading…
      </div>
    );
  }

  if (!isWriter) {
    return (
      <div className="container-page py-16 max-w-lg">
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-6 text-center">
          <ShieldAlert className="h-6 w-6 text-destructive mx-auto mb-2" />
          <h1 className="text-lg font-semibold">Writers only</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            AI agents are available to writers. Request writer access from your profile.
          </p>
        </div>
      </div>
    );
  }

  const agents = (agentsQ.data ?? []) as unknown as AgentForm[];
  const runs = (runsQ.data ?? []) as unknown as {
    id: string;
    source: string;
    status: string;
    message: string | null;
    created_at: string;
  }[];
  const keys = (keysQ.data ?? []) as unknown as {
    id: string;
    label: string;
    key_prefix: string;
    revoked: boolean;
    last_used_at: string | null;
  }[];
  const journeys = (journeysQ.data ?? []) as unknown as { id: string; title: string }[];

  return (
    <div className="container-page py-10 md:py-14">
      <div className="text-mono text-[11px] uppercase tracking-widest text-primary">
        Creator · Automation
      </div>
      <h1 className="mt-2 text-4xl md:text-5xl font-display tracking-tight inline-flex items-center gap-3">
        <Bot className="h-8 w-8 text-primary" /> AI agents
      </h1>
      <p className="mt-3 text-muted-foreground max-w-2xl">
        Set up an AI writer that drafts stories on your topics and posts them to your account —
        either on a schedule, or on demand from your own bot via the API.
      </p>
      {status ? <div className="mt-3 text-mono text-xs text-primary">{status}</div> : null}

      {/* Agents */}
      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Your agents</h2>
        <button
          onClick={() => setForm(emptyAgent())}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-mono text-xs text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-3.5 w-3.5" /> New agent
        </button>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {agentsQ.isLoading ? (
          <div className="text-sm text-muted-foreground">
            <Loader2 className="inline h-4 w-4 animate-spin mr-2" /> Loading agents…
          </div>
        ) : agents.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground md:col-span-2">
            No agents yet. Create one to start auto-drafting stories.
          </div>
        ) : (
          agents.map((a) => (
            <div key={a.id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium truncate">{a.name}</div>
                  <div className="text-mono text-[11px] text-muted-foreground mt-0.5">
                    {a.enabled ? "enabled" : "paused"} · {a.cadence} ·{" "}
                    {a.auto_publish ? "auto-publish" : "saves as draft"}
                  </div>
                </div>
                <span className="text-mono text-[10px] rounded border border-border px-1.5 py-0.5 text-muted-foreground">
                  {a.category}
                </span>
              </div>
              <p className="mt-3 text-sm text-muted-foreground line-clamp-3">
                {a.topic || "No topic set."}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={() => a.id && runMut.mutate(a.id)}
                  disabled={runMut.isPending}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-mono text-xs hover:border-border-strong disabled:opacity-50"
                >
                  {runMut.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Play className="h-3.5 w-3.5" />
                  )}
                  Run now
                </button>
                <button
                  onClick={() => setForm(toForm(a))}
                  className="rounded-md border border-border bg-background px-3 py-1.5 text-mono text-xs hover:border-border-strong"
                >
                  Edit
                </button>
                <button
                  onClick={async () => {
                    if (!a.id || !confirm("Delete this agent?")) return;
                    await deleteAgentFn({ data: { id: a.id } });
                    invalidate();
                  }}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-mono text-xs text-destructive hover:border-destructive/50"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {form ? (
        <div className="mt-6 rounded-xl border border-primary/40 bg-card p-6">
          <h3 className="font-semibold">{form.id ? "Edit agent" : "New agent"}</h3>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field label="Name">
              <input
                className={inputCls}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Field>
            <Field label="Category">
              <input
                className={inputCls}
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />
            </Field>
            <Field label="Content source" className="md:col-span-2">
              <select
                className={inputCls}
                value={form.source_mode}
                onChange={(e) =>
                  setForm({ ...form, source_mode: e.target.value as AgentForm["source_mode"] })
                }
              >
                <option value="topic">My topic / brief</option>
                <option value="x_trends">Trending on X</option>
              </select>
            </Field>

            {form.source_mode === "topic" ? (
              <Field label="Topic / brief" className="md:col-span-2">
                <textarea
                  rows={3}
                  className={inputCls}
                  placeholder="e.g. Practical Rust tips for backend developers moving from Go"
                  value={form.topic}
                  onChange={(e) => setForm({ ...form, topic: e.target.value })}
                />
              </Field>
            ) : (
              <>
                <Field label="X keywords (comma separated, max 5)" className="md:col-span-2">
                  <input
                    className={inputCls}
                    placeholder="rust, ai agents, web performance"
                    value={form.x_keywords.join(", ")}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        x_keywords: e.target.value
                          .split(",")
                          .map((k) => k.trim())
                          .filter(Boolean)
                          .slice(0, 5),
                      })
                    }
                  />
                </Field>
                <Field label="Minimum engagement per post">
                  <input
                    type="number"
                    min={0}
                    className={inputCls}
                    value={form.min_engagement}
                    onChange={(e) =>
                      setForm({ ...form, min_engagement: Number(e.target.value) || 0 })
                    }
                  />
                </Field>
                <Field label="Also use reader interests">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.use_reader_interests}
                      onChange={(e) =>
                        setForm({ ...form, use_reader_interests: e.target.checked })
                      }
                    />
                    Fall back to the site&apos;s signup topics
                  </label>
                </Field>
                <p className="text-xs text-muted-foreground md:col-span-2">
                  The agent searches recent high-engagement public posts, writes an original
                  article about the trend and links back to the source posts. Requires the X
                  connector.
                </p>
              </>
            )}
            <Field label="Tone">
              <input
                className={inputCls}
                value={form.tone}
                onChange={(e) => setForm({ ...form, tone: e.target.value })}
              />
            </Field>
            <Field label="Cadence">
              <select
                className={inputCls}
                value={form.cadence}
                onChange={(e) =>
                  setForm({ ...form, cadence: e.target.value as AgentForm["cadence"] })
                }
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </Field>
            <Field label="Journey">
              <select
                className={inputCls}
                value={form.journey_id ?? ""}
                onChange={(e) => setForm({ ...form, journey_id: e.target.value || null })}
              >
                <option value="">No journey</option>
                {journeys.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.title}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Monetization">
              <select
                className={inputCls}
                value={form.monetization}
                onChange={(e) =>
                  setForm({
                    ...form,
                    monetization: e.target.value as AgentForm["monetization"],
                  })
                }
              >
                <option value="free">Free</option>
                <option value="tips">Free + tips</option>
                <option value="locked">Locked (coins)</option>
              </select>
            </Field>
            {form.monetization === "locked" ? (
              <Field label="Unlock price (coins)">
                <input
                  type="number"
                  className={inputCls}
                  value={form.unlock_price}
                  onChange={(e) =>
                    setForm({ ...form, unlock_price: Number(e.target.value) || 0 })
                  }
                />
              </Field>
            ) : null}
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
              />
              Enabled (run on schedule)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.auto_publish}
                onChange={(e) => setForm({ ...form, auto_publish: e.target.checked })}
              />
              Publish automatically
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.tip_enabled}
                onChange={(e) => setForm({ ...form, tip_enabled: e.target.checked })}
              />
              Allow tips
            </label>
          </div>
          <div className="mt-5 flex gap-2">
            <button
              onClick={() => saveMut.mutate(form)}
              disabled={saveMut.isPending}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-mono text-xs text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {saveMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} Save agent
            </button>
            <button
              onClick={() => setForm(null)}
              className="rounded-md border border-border bg-background px-4 py-2 text-mono text-xs"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {/* API keys */}
      <h2 className="mt-12 text-lg font-semibold inline-flex items-center gap-2">
        <KeyRound className="h-4 w-4 text-primary" /> Bot API keys
      </h2>
      <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
        Let your own AI agent post to Right2Read. Send a <code>POST</code> to{" "}
        <code className="text-foreground">/api/public/agents/post</code> with the header{" "}
        <code className="text-foreground">Authorization: Bearer &lt;key&gt;</code> and a JSON body of{" "}
        <code className="text-foreground">
          {"{ title, markdown, summary?, tags?, category?, publish? }"}
        </code>
        .
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <input
          className={`${inputCls} max-w-xs`}
          value={keyLabel}
          onChange={(e) => setKeyLabel(e.target.value)}
          placeholder="Key label"
        />
        <button
          onClick={() => keyMut.mutate(keyLabel)}
          disabled={keyMut.isPending}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-mono text-xs text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {keyMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          Create key
        </button>
      </div>

      {newKey ? (
        <div className="mt-4 rounded-lg border border-primary/50 bg-primary/5 p-4">
          <div className="text-mono text-[11px] uppercase tracking-widest text-primary">
            Copy this key now — it won&apos;t be shown again
          </div>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 truncate text-sm">{newKey}</code>
            <button
              onClick={() => {
                navigator.clipboard.writeText(newKey);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-mono text-xs"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-4 rounded-xl border border-border bg-card/40 overflow-hidden">
        {keys.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">No API keys yet.</div>
        ) : (
          keys.map((k) => (
            <div
              key={k.id}
              className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3 last:border-0"
            >
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{k.label}</div>
                <div className="text-mono text-[10px] text-muted-foreground">
                  {k.key_prefix} · {k.revoked ? "revoked" : "active"}
                  {k.last_used_at ? ` · last used ${new Date(k.last_used_at).toLocaleString()}` : ""}
                </div>
              </div>
              {!k.revoked ? (
                <button
                  onClick={async () => {
                    await revokeKeyFn({ data: { id: k.id } });
                    qc.invalidateQueries({ queryKey: ["agent-keys"] });
                  }}
                  className="rounded-md border border-border bg-background px-3 py-1.5 text-mono text-xs text-destructive hover:border-destructive/50"
                >
                  Revoke
                </button>
              ) : null}
            </div>
          ))
        )}
      </div>

      {/* Runs */}
      <h2 className="mt-12 text-lg font-semibold">Recent activity</h2>
      <div className="mt-4 rounded-xl border border-border bg-card/40 overflow-hidden">
        {runs.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">No agent activity yet.</div>
        ) : (
          runs.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3 last:border-0"
            >
              <div className="min-w-0">
                <div className="text-sm truncate">{r.message ?? r.status}</div>
                <div className="text-mono text-[10px] text-muted-foreground">
                  {r.source} · {new Date(r.created_at).toLocaleString()}
                </div>
              </div>
              <span
                className={`text-mono text-[10px] rounded px-1.5 py-0.5 border ${
                  r.status === "ok"
                    ? "border-primary/40 text-primary"
                    : "border-destructive/40 text-destructive"
                }`}
              >
                {r.status}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none";

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="text-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">
        {label}
      </div>
      {children}
    </div>
  );
}
