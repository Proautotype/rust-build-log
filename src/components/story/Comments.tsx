import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Loader2, Trash2, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatDateLong } from "@/lib/format";

interface CommentRow {
  id: string;
  body: string;
  created_at: string;
  user_id: string;
  profile: {
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

export function Comments({ storySlug }: { storySlug: string }) {
  const { user, profile } = useAuth();
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("comments")
      .select("id, body, created_at, user_id")
      .eq("story_slug", storySlug)
      .order("created_at", { ascending: false });
    if (error || !data) {
      setLoading(false);
      return;
    }
    // No FK from comments -> profiles, so fetch profiles separately.
    const ids = Array.from(new Set(data.map((c) => c.user_id)));
    let profileMap: Record<string, { display_name: string | null; avatar_url: string | null }> = {};
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", ids);
      profileMap = Object.fromEntries(
        (profs ?? []).map((p) => [p.id, { display_name: p.display_name, avatar_url: p.avatar_url }]),
      );
    }
    setComments(
      data.map((c) => ({ ...c, profile: profileMap[c.user_id] ?? null })) as CommentRow[],
    );
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storySlug]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !body.trim()) return;
    setPosting(true);
    setError(null);
    const { error } = await supabase.from("comments").insert({
      story_slug: storySlug,
      user_id: user.id,
      body: body.trim(),
    });
    if (error) setError(error.message);
    else {
      setBody("");
      await load();
    }
    setPosting(false);
  }

  async function remove(id: string) {
    const { error } = await supabase.from("comments").delete().eq("id", id);
    if (!error) setComments((c) => c.filter((x) => x.id !== id));
  }

  return (
    <section className="mt-16 border-t border-border pt-12">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-primary" />
        <div className="text-mono text-[11px] uppercase tracking-widest text-primary">
          Discussion
        </div>
      </div>
      <h2 className="mt-2 text-2xl md:text-3xl font-display tracking-tight">
        Reader comments {comments.length > 0 && <span className="text-muted-foreground">({comments.length})</span>}
      </h2>

      {user ? (
        <form onSubmit={submit} className="mt-6 rounded-lg border border-border/70 bg-card/40 p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            Commenting as{" "}
            <span className="text-foreground font-medium">
              {profile?.display_name ?? user.email}
            </span>
          </div>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Share your thoughts…"
            rows={3}
            maxLength={4000}
            className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
          />
          {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
          <div className="mt-3 flex justify-end">
            <button
              type="submit"
              disabled={posting || !body.trim()}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {posting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Post comment
            </button>
          </div>
        </form>
      ) : (
        <div className="mt-6 rounded-lg border border-border/70 bg-card/40 p-4 text-sm text-muted-foreground">
          <Link
            to="/auth"
            search={{ redirect: typeof window !== "undefined" ? window.location.pathname : undefined }}
            className="text-primary hover:underline"
          >
            Sign in
          </Link>{" "}
          to leave a comment.
        </div>
      )}

      <div className="mt-6 space-y-4">
        {loading ? (
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading comments…
          </div>
        ) : comments.length === 0 ? (
          <div className="text-sm text-muted-foreground">Be the first to comment.</div>
        ) : (
          comments.map((c) => (
            <div key={c.id} className="rounded-lg border border-border/60 bg-card/30 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  {c.profile?.avatar_url ? (
                    <img
                      src={c.profile.avatar_url}
                      alt=""
                      className="h-8 w-8 rounded-full object-cover ring-1 ring-border"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-semibold ring-1 ring-primary/30">
                      {(c.profile?.display_name ?? "?").slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="text-sm font-medium">
                      {c.profile?.display_name ?? "Anonymous"}
                    </div>
                    <div className="text-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      {formatDateLong(c.created_at)}
                    </div>
                  </div>
                </div>
                {user?.id === c.user_id && (
                  <button
                    onClick={() => remove(c.id)}
                    aria-label="Delete comment"
                    className="text-muted-foreground hover:text-destructive p-1 rounded"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <p className="mt-3 text-sm leading-relaxed whitespace-pre-wrap">{c.body}</p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
