import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Coins, Loader2, TrendingUp, TrendingDown, Sparkles } from "lucide-react";
import { getMyCoinState, purchaseCoins } from "@/lib/coins.functions";
import { formatDateLong } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/coins")({
  head: () => ({
    meta: [
      { title: "Coins — Rust Journey" },
      { name: "description", content: "Buy and manage your App Coins for unlocks and tips." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CoinsPage,
});

const PACKS = [
  { amount: 100, price: "$0.99" },
  { amount: 500, price: "$4.99", bonus: 50 },
  { amount: 1200, price: "$9.99", bonus: 200 },
  { amount: 3000, price: "$19.99", bonus: 700 },
];

function CoinsPage() {
  const getState = useServerFn(getMyCoinState);
  const buy = useServerFn(purchaseCoins);
  const qc = useQueryClient();

  const state = useQuery({ queryKey: ["coin-state"], queryFn: () => getState() });

  const purchase = useMutation({
    mutationFn: (amount: number) => buy({ data: { amount } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["coin-state"] });
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
  });

  const balance = state.data?.balance ?? 0;
  const tx = state.data?.transactions ?? [];

  return (
    <div className="container-page max-w-4xl py-10 md:py-14">
      <div className="text-mono text-[11px] uppercase tracking-widest text-primary">Wallet</div>
      <h1 className="mt-2 text-4xl md:text-5xl font-display tracking-tight">App Coins</h1>
      <p className="mt-3 text-muted-foreground max-w-2xl">
        Spend coins to unlock premium stories or tip writers you love. Writers earn coins directly
        from readers.
      </p>

      <div className="mt-8 rounded-xl border border-primary/40 bg-primary/5 p-6 flex items-center justify-between">
        <div>
          <div className="text-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            Balance
          </div>
          <div className="mt-1 text-4xl font-display flex items-center gap-2">
            <Coins className="h-8 w-8 text-primary" /> {balance}
          </div>
        </div>
        {purchase.isError ? (
          <div className="text-xs text-destructive">{(purchase.error as Error).message}</div>
        ) : null}
      </div>

      <h2 className="mt-10 text-xl font-display">Top up</h2>
      <p className="mt-1 text-sm text-muted-foreground">Mock purchase — instantly adds coins.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {PACKS.map((p) => {
          const total = p.amount + (p.bonus ?? 0);
          return (
            <button
              key={p.amount}
              disabled={purchase.isPending}
              onClick={() => purchase.mutate(total)}
              className="rounded-xl border border-border bg-card p-5 text-left hover:border-primary/50 transition disabled:opacity-50"
            >
              <div className="flex items-center gap-2 text-2xl font-display">
                <Coins className="h-5 w-5 text-primary" /> {total}
              </div>
              {p.bonus ? (
                <div className="mt-1 text-mono text-[10px] uppercase tracking-widest text-primary inline-flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> +{p.bonus} bonus
                </div>
              ) : null}
              <div className="mt-3 text-sm text-muted-foreground">{p.price}</div>
              <div className="mt-3 inline-flex items-center text-mono text-[11px] text-primary">
                {purchase.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                ) : null}
                Buy
              </div>
            </button>
          );
        })}
      </div>

      <h2 className="mt-12 text-xl font-display">Recent activity</h2>
      <div className="mt-4 rounded-xl border border-border bg-card/40 divide-y divide-border">
        {state.isLoading ? (
          <div className="p-6 text-sm text-muted-foreground">
            <Loader2 className="inline h-4 w-4 animate-spin mr-2" /> Loading…
          </div>
        ) : tx.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">No transactions yet.</div>
        ) : (
          tx.map((t) => (
            <div key={t.id} className="flex items-center justify-between p-4">
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{t.note ?? t.kind}</div>
                <div className="text-mono text-[11px] text-muted-foreground">
                  {formatDateLong(t.created_at)} · {t.kind}
                </div>
              </div>
              <div
                className={`inline-flex items-center gap-1 text-mono text-sm ${
                  t.amount >= 0 ? "text-emerald-400" : "text-destructive"
                }`}
              >
                {t.amount >= 0 ? (
                  <TrendingUp className="h-3.5 w-3.5" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5" />
                )}
                {t.amount >= 0 ? "+" : ""}
                {t.amount}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
