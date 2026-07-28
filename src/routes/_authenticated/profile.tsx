import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Save, PenSquare, ShieldCheck, User as UserIcon, XCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useInterests } from "@/hooks/useInterests";
import { TopicPicker } from "@/components/feed/TopicPicker";
import { useRole } from "@/hooks/useRole";
import {
  getMyWriterRequest,
  submitWriterRequest,
  cancelMyWriterRequest,
  updateMyProfile,
} from "@/lib/writer.functions";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Your profile — Rust Journey" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, profile } = useAuth();
  const { interests, toggle } = useInterests();
  const { roles, isWriter, isAdmin, loading: rolesLoading } = useRole();
  const qc = useQueryClient();

  const getRequest = useServerFn(getMyWriterRequest);
  const submitRequest = useServerFn(submitWriterRequest);
  const cancelRequest = useServerFn(cancelMyWriterRequest);
  const updateProfile = useServerFn(updateMyProfile);

  const requestQuery = useQuery({
    queryKey: ["my-writer-request"],
    queryFn: () => getRequest(),
    enabled: !!user,
  });

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name ?? "");
      setBio(profile.bio ?? "");
      setAvatarUrl(profile.avatar_url ?? "");
    }
  }, [profile]);

  const saveProfile = useMutation({
    mutationFn: () =>
      updateProfile({
        data: {
          display_name: displayName.trim(),
          bio: bio.trim() || null,
          avatar_url: avatarUrl.trim() || null,
        },
      }),
    onSuccess: () => {
      setStatus("Profile updated ✓");
      setTimeout(() => setStatus(null), 2000);
      // Trigger useAuth to refetch — easiest is to reload window state minimally.
      qc.invalidateQueries();
    },
    onError: (err: Error) => setStatus(`Save failed: ${err.message}`),
  });

  const submit = useMutation({
    mutationFn: () => submitRequest({ data: { message: message.trim() || undefined } }),
    onSuccess: () => {
      setMessage("");
      qc.invalidateQueries({ queryKey: ["my-writer-request"] });
    },
  });

  const cancel = useMutation({
    mutationFn: () => cancelRequest({}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-writer-request"] }),
  });

  const request = requestQuery.data;

  return (
    <div className="container-page py-10 md:py-14 max-w-3xl">
      <div className="text-mono text-[11px] uppercase tracking-widest text-primary">
        Your account
      </div>
      <h1 className="mt-2 text-4xl md:text-5xl font-display tracking-tight">Profile</h1>

      {/* Role badges */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        {rolesLoading ? (
          <span className="text-mono text-xs text-muted-foreground inline-flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" /> checking roles…
          </span>
        ) : (
          roles.map((r) => (
            <span
              key={r}
              className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-mono text-[11px] uppercase tracking-wider ${
                r === "admin"
                  ? "border-primary/60 bg-primary/15 text-primary"
                  : r === "writer"
                    ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
                    : "border-border bg-surface text-muted-foreground"
              }`}
            >
              {r === "admin" && <ShieldCheck className="h-3 w-3" />}
              {r === "writer" && <PenSquare className="h-3 w-3" />}
              {r === "reader" && <UserIcon className="h-3 w-3" />}
              {r}
            </span>
          ))
        )}
        {isWriter && (
          <Link
            to="/studio"
            className="ml-2 inline-flex items-center gap-1 rounded-md bg-primary/10 border border-primary/40 px-2 py-0.5 text-mono text-[11px] text-primary hover:bg-primary/20"
          >
            Open studio →
          </Link>
        )}
        {isAdmin && (
          <Link
            to="/admin/requests"
            className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-0.5 text-mono text-[11px] text-muted-foreground hover:text-foreground"
          >
            Review requests →
          </Link>
        )}
      </div>

      {/* Interests */}
      <section className="mt-10 rounded-xl border border-border bg-card/40 p-6">
        <h2 className="text-lg font-semibold">Your topics</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick what you want to read. Your home feed reorders around these.
        </p>
        <TopicPicker selected={interests} onToggle={toggle} size="lg" className="mt-5" />
      </section>

      {/* Profile edit */}
      <section className="mt-10 rounded-xl border border-border bg-card/40 p-6">

        <h2 className="text-lg font-semibold">Public profile</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          This is what other readers see on your stories and comments.
        </p>

        <div className="mt-6 space-y-4">
          <Field label="Email">
            <input
              value={user?.email ?? ""}
              disabled
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-muted-foreground"
            />
          </Field>
          <Field label="Display name">
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
            />
          </Field>
          <Field label="Avatar URL">
            <input
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://…"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
            />
          </Field>
          <Field label="Bio">
            <textarea
              rows={4}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell readers a little about yourself…"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary resize-none"
            />
          </Field>
        </div>

        <div className="mt-5 flex items-center gap-3">
          <button
            onClick={() => saveProfile.mutate()}
            disabled={saveProfile.isPending || !displayName.trim()}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {saveProfile.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            Save profile
          </button>
          {status && <span className="text-mono text-xs text-primary">{status}</span>}
        </div>
      </section>

      {/* Writer request */}
      {!isWriter && (
        <section className="mt-8 rounded-xl border border-border bg-card/40 p-6">
          <h2 className="text-lg font-semibold inline-flex items-center gap-2">
            <PenSquare className="h-4 w-4 text-primary" />
            Become a writer
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            As a writer you can create journeys and publish stories.
          </p>

          {requestQuery.isLoading ? (
            <div className="mt-4 text-mono text-xs text-muted-foreground inline-flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" /> loading…
            </div>
          ) : request?.status === "pending" ? (
            <div className="mt-4 flex items-center justify-between rounded-md border border-yellow-500/40 bg-yellow-500/10 px-4 py-3">
              <div className="text-sm text-yellow-400">
                Request pending review.
                {request.message && (
                  <div className="mt-1 text-xs text-muted-foreground">"{request.message}"</div>
                )}
              </div>
              <button
                onClick={() => cancel.mutate()}
                disabled={cancel.isPending}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <XCircle className="h-3.5 w-3.5" /> Cancel
              </button>
            </div>
          ) : request?.status === "approved" ? (
            <div className="mt-4 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
              You're a writer! Refresh to see the studio.
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {request?.status === "rejected" && (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  Your previous request was declined. You can submit a new one.
                </div>
              )}
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                maxLength={1000}
                placeholder="Tell the admins why you'd like to write for Rust Journey (optional)…"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary resize-none"
              />
              <button
                onClick={() => submit.mutate()}
                disabled={submit.isPending}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {submit.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <PenSquare className="h-3.5 w-3.5" />
                )}
                Request writer access
              </button>
              {submit.error && (
                <div className="text-xs text-destructive">{(submit.error as Error).message}</div>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-mono text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">
        {label}
      </div>
      {children}
    </label>
  );
}
