import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, KeyRound, Loader2, TriangleAlert } from "lucide-react";
import {
  connectMyXToken,
  disconnectMyXToken,
  getMyXAccess,
  requestXSetup,
} from "@/lib/x-access.functions";

const input =
  "mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none";
const label = "text-mono text-[10px] uppercase tracking-widest text-muted-foreground";

/** Per-writer X API access: bring your own token, or pay R2R to set it up. */
export function XAccessCard() {
  const qc = useQueryClient();
  const getFn = useServerFn(getMyXAccess);
  const connectFn = useServerFn(connectMyXToken);
  const disconnectFn = useServerFn(disconnectMyXToken);
  const requestFn = useServerFn(requestXSetup);

  const accessQ = useQuery({ queryKey: ["my-x-access"], queryFn: () => getFn({}) });
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showConcierge, setShowConcierge] = useState(false);
  const [email, setEmail] = useState("");
  const [handle, setHandle] = useState("");
  const [notes, setNotes] = useState("");

  const refresh = () => qc.invalidateQueries({ queryKey: ["my-x-access"] });

  const connect = useMutation({
    mutationFn: () => connectFn({ data: { token: token.trim() } }),
    onSuccess: (a) => {
      console.log("X, Connected ", a);
      setToken("");
      setError(null);
      refresh();
    },
    onError: (e: unknown) => {
      console.log("X, Connection error ", e);
      return setError(e instanceof Error ? e.message : "Could not save token");
    },
  });

  const disconnect = useMutation({
    mutationFn: () => disconnectFn({}),
    onSuccess: refresh,
  });

  const concierge = useMutation({
    mutationFn: () =>
      requestFn({
        data: { contactEmail: email.trim(), xHandle: handle.trim(), notes: notes.trim() },
      }),
    onSuccess: () => {
      setShowConcierge(false);
      setNotes("");
      refresh();
    },
    onError: (e: unknown) => setError(e instanceof Error ? e.message : "Could not send request"),
  });

  const a = accessQ.data;

  return (
    <div className="mt-8 rounded-xl border border-border bg-card p-5">
      <h2 className="text-lg font-semibold inline-flex items-center gap-2">
        <KeyRound className="h-4 w-4 text-primary" /> Your X access
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        X trends run on your own X API token, so R2R never bills you for someone else's usage.
        Create a free app at{" "}
        <a
          href="https://developer.x.com/en/portal/dashboard"
          target="_blank"
          rel="noreferrer"
          className="text-primary underline underline-offset-2"
        >
          developer.x.com
        </a>{" "}
        and paste its Bearer Token below.
      </p>

      {accessQ.isLoading ? (
        <div className="mt-4 text-sm text-muted-foreground inline-flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Checking…
        </div>
      ) : a?.connected ? (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {a.status === "invalid" ? (
            <span className="inline-flex items-center gap-1.5 rounded-md bg-destructive/10 px-2.5 py-1 text-mono text-xs text-destructive">
              <TriangleAlert className="h-3.5 w-3.5" /> Token rejected — reconnect
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2.5 py-1 text-mono text-xs text-primary">
              <CheckCircle2 className="h-3.5 w-3.5" /> Connected ••••{a.last4}
            </span>
          )}
          {a.verifiedAt ? (
            <span className="text-xs text-muted-foreground">
              Verified {new Date(a.verifiedAt).toLocaleDateString()}
            </span>
          ) : null}
          <button
            onClick={() => disconnect.mutate()}
            className="rounded-md border border-border px-3 py-1.5 text-mono text-xs hover:bg-muted"
          >
            Disconnect
          </button>
        </div>
      ) : (
        <p className="mt-4 text-mono text-xs text-muted-foreground">
          Not connected — your agents will skip X trends until you add a token.
        </p>
      )}

      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
        <label className="block">
          <span className={label}>{a?.connected ? "Replace token" : "X API bearer token"}</span>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="AAAAAAAAAA…"
            className={input}
          />
        </label>
        <button
          disabled={token.trim().length < 20 || connect.isPending}
          onClick={() => connect.mutate()}
          className="h-[38px] rounded-md bg-primary px-4 text-mono text-xs text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {connect.isPending ? "Verifying…" : "Verify & save"}
        </button>
      </div>

      {error ? <div className="mt-2 text-xs text-destructive">{error}</div> : null}

      {/* Concierge */}
      <div className="mt-5 rounded-lg border border-dashed border-border p-4">
        {a?.request && ["paid", "in_progress"].includes(a.request.status) ? (
          <p className="text-sm text-muted-foreground">
            R2R is setting up your X access ({a.request.status.replace("_", " ")}). We'll email you
            when it's live.
          </p>
        ) : (
          <>
            <p className="text-sm">
              Don't want to deal with X's developer portal?{" "}
              <span className="text-muted-foreground">
                R2R will set it up for you for {a?.setupPriceCoins ?? 500} coins.
              </span>
            </p>
            {showConcierge ? (
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <label className="block">
                  <span className={label}>Contact email</span>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={input}
                  />
                </label>
                <label className="block">
                  <span className={label}>Your X handle</span>
                  <input
                    value={handle}
                    onChange={(e) => setHandle(e.target.value)}
                    placeholder="@yourhandle"
                    className={input}
                  />
                </label>
                <label className="block md:col-span-2">
                  <span className={label}>Anything we should know</span>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className={input}
                  />
                </label>
                <div className="md:col-span-2 flex gap-2">
                  <button
                    disabled={!email.includes("@") || concierge.isPending}
                    onClick={() => concierge.mutate()}
                    className="rounded-md bg-primary px-3 py-1.5 text-mono text-xs text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  >
                    {concierge.isPending
                      ? "Sending…"
                      : `Pay ${a?.setupPriceCoins ?? 500} coins & request`}
                  </button>
                  <button
                    onClick={() => setShowConcierge(false)}
                    className="rounded-md border border-border px-3 py-1.5 text-mono text-xs hover:bg-muted"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowConcierge(true)}
                className="mt-2 rounded-md border border-border px-3 py-1.5 text-mono text-xs hover:bg-muted"
              >
                Request setup help
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
