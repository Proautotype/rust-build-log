import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Heart, Flag, Loader2, Check } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  getStoryLikeCount,
  getMyStorySocial,
  toggleStoryLike,
  flagStory,
} from "@/lib/social.functions";

interface Props {
  storyId: string;
  initialLikeCount: number;
}

export function StoryActions({ storyId, initialLikeCount }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const publicCountFn = useServerFn(getStoryLikeCount);
  const socialFn = useServerFn(getMyStorySocial);
  const likeFn = useServerFn(toggleStoryLike);
  const flagFn = useServerFn(flagStory);

  const [showFlag, setShowFlag] = useState(false);
  const [reason, setReason] = useState("");

  const publicCount = useQuery({
    queryKey: ["story-likes", storyId],
    queryFn: () => publicCountFn({ data: { storyId } }),
    enabled: !user,
  });

  const social = useQuery({
    queryKey: ["story-social", storyId],
    queryFn: () => socialFn({ data: { storyId } }),
    enabled: !!user,
  });

  const likeMut = useMutation({
    mutationFn: () => likeFn({ data: { storyId } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["story-social", storyId] });
      void qc.invalidateQueries({ queryKey: ["story-likes", storyId] });
    },
  });

  const flagMut = useMutation({
    mutationFn: () => flagFn({ data: { storyId, reason } }),
    onSuccess: () => {
      setShowFlag(false);
      setReason("");
      void qc.invalidateQueries({ queryKey: ["story-social", storyId] });
    },
  });

  const likeCount =
    social.data?.likeCount ?? publicCount.data?.likeCount ?? initialLikeCount ?? 0;
  const liked = social.data?.liked ?? false;
  const flagged = social.data?.flagged ?? false;

  return (
    <div className="mt-10 rounded-xl border border-border bg-card/40 p-5">
      <div className="flex flex-wrap items-center gap-3">
        {user ? (
          <button
            onClick={() => likeMut.mutate()}
            disabled={likeMut.isPending}
            aria-pressed={liked}
            className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition disabled:opacity-50 ${
              liked
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {likeMut.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} />
            )}
            {liked ? "Liked" : "Like"}
            <span className="text-mono text-xs opacity-70">{likeCount}</span>
          </button>
        ) : (
          <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <Heart className="h-4 w-4 text-primary" />
            <span className="text-mono text-xs">{likeCount} likes</span>
            <Link
              to="/auth"
              search={{ redirect: undefined }}
              className="text-primary hover:underline"
            >
              Sign in to like
            </Link>
          </div>
        )}

        {user ? (
          flagged ? (
            <span className="ml-auto inline-flex items-center gap-1.5 text-mono text-[11px] text-muted-foreground">
              <Check className="h-3.5 w-3.5 text-emerald-400" /> Reported — thanks
            </span>
          ) : (
            <button
              onClick={() => setShowFlag((s) => !s)}
              className="ml-auto inline-flex items-center gap-1.5 text-mono text-[11px] uppercase tracking-wider text-muted-foreground hover:text-destructive"
            >
              <Flag className="h-3.5 w-3.5" /> Report
            </button>
          )
        ) : null}
      </div>

      {showFlag && !flagged ? (
        <div className="mt-4 border-t border-border pt-4">
          <label className="text-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            Why are you reporting this story?
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Spam, harassment, misinformation…"
            className="mt-2 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={() => flagMut.mutate()}
              disabled={flagMut.isPending}
              className="inline-flex items-center gap-1.5 rounded-md bg-destructive px-3 py-1.5 text-xs font-medium text-destructive-foreground hover:opacity-90 disabled:opacity-50"
            >
              {flagMut.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Flag className="h-3.5 w-3.5" />
              )}
              Submit report
            </button>
            <button
              onClick={() => setShowFlag(false)}
              className="text-mono text-[11px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
          </div>
          {flagMut.isError ? (
            <div className="mt-2 text-xs text-destructive">
              {(flagMut.error as Error).message}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
