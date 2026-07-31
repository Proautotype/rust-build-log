import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Headphones, Loader2, Pause, Play, Coins, Square } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/backend/client";
import { getListenState, purchaseListen } from "@/lib/tts.functions";

interface Props {
  storyId: string;
  storyTitle: string;
}

export function ListenBar({ storyId, storyTitle }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const stateFn = useServerFn(getListenState);
  const purchaseFn = useServerFn(purchaseListen);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);
  const [chunk, setChunk] = useState(0);
  const [chunkCount, setChunkCount] = useState<number | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "playing" | "paused">("idle");
  const [error, setError] = useState<string | null>(null);

  const state = useQuery({
    queryKey: ["listen-state", storyId],
    queryFn: () => stateFn({ data: { storyId } }),
    enabled: !!user,
  });

  const cleanup = useCallback(() => {
    audioRef.current?.pause();
    audioRef.current = null;
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const playChunk = useCallback(
    async (index: number) => {
      setStatus("loading");
      setError(null);
      try {
        const { data: session } = await supabase.auth.getSession();
        const token = session.session?.access_token;
        const res = await fetch("/api/tts", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ storyId, chunkIndex: index }),
        });
        if (!res.ok) {
          throw new Error(
            res.status === 402
              ? "Narration not unlocked yet."
              : `Couldn't load narration (${res.status}).`,
          );
        }
        const total = Number(res.headers.get("X-Chunk-Count") ?? "1");
        setChunkCount(Number.isFinite(total) ? total : 1);

        const blob = await res.blob();
        cleanup();
        const url = URL.createObjectURL(blob);
        urlRef.current = url;
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => {
          const next = index + 1;
          if (next < total) {
            setChunk(next);
            void playChunk(next);
          } else {
            setStatus("idle");
            setChunk(0);
          }
        };
        audio.onerror = () => {
          setStatus("idle");
          setError("Playback failed.");
        };
        await audio.play();
        setStatus("playing");
      } catch (e) {
        setStatus("idle");
        setError(e instanceof Error ? e.message : "Narration failed.");
      }
    },
    [cleanup, storyId],
  );

  const purchaseMut = useMutation({
    mutationFn: () => purchaseFn({ data: { storyId } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["listen-state", storyId] });
      void qc.invalidateQueries({ queryKey: ["coin-state"] });
      void playChunk(0);
    },
  });

  const price = state.data?.price ?? 1;

  const toggle = () => {
    if (status === "playing") {
      audioRef.current?.pause();
      setStatus("paused");
      return;
    }
    if (status === "paused" && audioRef.current) {
      void audioRef.current.play();
      setStatus("playing");
      return;
    }
    void playChunk(chunk);
  };

  const stop = () => {
    cleanup();
    setChunk(0);
    setStatus("idle");
  };

  return (
    <div className="mt-8 rounded-xl border border-border bg-card/40 p-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center gap-2">
          <Headphones className="h-4 w-4 text-primary" />
          <div className="font-medium">Listen to this story</div>
        </div>

        {!user ? (
          <Link
            to="/auth"
            search={{ redirect: undefined }}
            className="ml-auto inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            Sign in to listen
          </Link>
        ) : state.isLoading ? (
          <Loader2 className="ml-auto h-4 w-4 animate-spin text-muted-foreground" />
        ) : state.data?.canListen ? (
          <div className="ml-auto flex items-center gap-2">
            {status !== "idle" ? (
              <button
                onClick={stop}
                className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                <Square className="h-3.5 w-3.5" /> Stop
              </button>
            ) : null}
            <button
              onClick={toggle}
              disabled={status === "loading"}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {status === "loading" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : status === "playing" ? (
                <Pause className="h-3.5 w-3.5" />
              ) : (
                <Play className="h-3.5 w-3.5" />
              )}
              {status === "playing" ? "Pause" : status === "paused" ? "Resume" : "Play"}
            </button>
          </div>
        ) : (
          <div className="ml-auto flex items-center gap-2">
            <span className="text-mono text-[11px] text-muted-foreground">
              Balance: {state.data?.balance ?? 0} ·{" "}
              <Link to="/coins" className="text-primary hover:underline">
                top up
              </Link>
            </span>
            <button
              onClick={() => purchaseMut.mutate()}
              disabled={purchaseMut.isPending}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {purchaseMut.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Coins className="h-3.5 w-3.5" />
              )}
              Listen for {price} {price === 1 ? "coin" : "coins"}
            </button>
          </div>
        )}
      </div>

      <p className="mt-2 text-sm text-muted-foreground">
        {state.data?.canListen
          ? `Audio narration of "${storyTitle}"${
              chunkCount && chunkCount > 1 ? ` — part ${chunk + 1} of ${chunkCount}` : ""
            }.`
          : `AI narration costs ${price} ${price === 1 ? "coin" : "coins"} and goes straight to the writer. One-time — replay any time.`}
      </p>

      {purchaseMut.isError ? (
        <div className="mt-2 text-xs text-destructive">
          {(purchaseMut.error as Error).message}
        </div>
      ) : null}
      {error ? <div className="mt-2 text-xs text-destructive">{error}</div> : null}
    </div>
  );
}
