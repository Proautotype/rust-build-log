import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, UserPlus, UserCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  getWriterFollowerCount,
  getMyFollowState,
  toggleFollowWriter,
} from "@/lib/follows.functions";

export function FollowButton({ writerId }: { writerId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const countFn = useServerFn(getWriterFollowerCount);
  const stateFn = useServerFn(getMyFollowState);
  const toggleFn = useServerFn(toggleFollowWriter);

  const publicCount = useQuery({
    queryKey: ["writer-followers", writerId],
    queryFn: () => countFn({ data: { writerId } }),
    enabled: !user,
  });

  const state = useQuery({
    queryKey: ["writer-follow-state", writerId],
    queryFn: () => stateFn({ data: { writerId } }),
    enabled: !!user,
  });

  const mut = useMutation({
    mutationFn: () => toggleFn({ data: { writerId } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["writer-follow-state", writerId] });
      void qc.invalidateQueries({ queryKey: ["writer-followers", writerId] });
    },
  });

  const followers = state.data?.followers ?? publicCount.data?.followers ?? 0;
  const following = state.data?.following ?? false;
  const isSelf = state.data?.isSelf ?? false;

  return (
    <div className="flex flex-col items-start gap-1">
      {!user ? (
        <Link
          to="/auth"
          search={{ redirect: undefined }}
          className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <UserPlus className="h-3.5 w-3.5" /> Sign in to follow
        </Link>
      ) : isSelf ? null : (
        <button
          onClick={() => mut.mutate()}
          disabled={mut.isPending}
          aria-pressed={following}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition disabled:opacity-50 ${
            following
              ? "border-primary bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          {mut.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : following ? (
            <UserCheck className="h-3.5 w-3.5" />
          ) : (
            <UserPlus className="h-3.5 w-3.5" />
          )}
          {following ? "Following" : "Follow"}
        </button>
      )}
      <span className="text-mono text-[10px] text-muted-foreground">
        {followers} {followers === 1 ? "follower" : "followers"}
      </span>
      {mut.isError ? (
        <span className="text-[10px] text-destructive">{(mut.error as Error).message}</span>
      ) : null}
    </div>
  );
}
