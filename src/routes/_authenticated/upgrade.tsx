import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, Loader2, Sparkles, Undo2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { downgradeFromPro, upgradeToPro } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/upgrade")({
  head: () => ({
    meta: [
      { title: "Upgrade to Pro — Rust Journey" },
      {
        name: "description",
        content: "Go ad-free and unlock premium features on Rust Journey.",
      },
    ],
  }),
  component: UpgradePage,
});

const perks = [
  "Ad-free reading across the whole site",
  "Support the writers you follow",
  "Early access to premium stories (coming soon)",
  "Priority experimental features",
];

function UpgradePage() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const upgrade = useServerFn(upgradeToPro);
  const downgrade = useServerFn(downgradeFromPro);

  const isPro = !!profile?.is_pro;

  const upgradeMut = useMutation({
    mutationFn: () => upgrade({}),
    onSuccess: () => qc.invalidateQueries(),
  });
  const downgradeMut = useMutation({
    mutationFn: () => downgrade({}),
    onSuccess: () => qc.invalidateQueries(),
  });

  return (
    <div className="container-page py-14 md:py-20 max-w-3xl">
      <div className="text-mono text-[11px] uppercase tracking-widest text-primary">
        rust.journey / pro
      </div>
      <h1 className="mt-2 text-4xl md:text-5xl font-display tracking-tight">
        {isPro ? "You're a Pro member" : "Upgrade to Pro"}
      </h1>
      <p className="mt-3 text-muted-foreground max-w-xl">
        {isPro
          ? "Thanks for supporting Rust Journey. Ads are off and premium features are unlocked for you."
          : "Support the site, remove all ads, and unlock premium features."}
      </p>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-card/40 p-6">
          <div className="text-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            Free
          </div>
          <div className="mt-1 text-3xl font-display">$0</div>
          <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
            <li>All public stories</li>
            <li>Read on any device</li>
            <li>Comments & community</li>
            <li>Displays ads</li>
          </ul>
        </div>

        <div className="rounded-xl border border-primary/50 bg-primary/5 p-6 relative">
          <div className="absolute -top-3 left-4 text-mono text-[10px] uppercase tracking-widest text-primary bg-background border border-primary/50 rounded px-2 py-0.5">
            Pro
          </div>
          <div className="text-mono text-[11px] uppercase tracking-wider text-primary">
            Rust Journey Pro
          </div>
          <div className="mt-1 text-3xl font-display inline-flex items-center gap-2">
            $5<span className="text-sm text-muted-foreground">/mo</span>
          </div>
          <ul className="mt-5 space-y-2 text-sm">
            {perks.map((p) => (
              <li key={p} className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 text-primary shrink-0" />
                <span>{p}</span>
              </li>
            ))}
          </ul>

          <div className="mt-6">
            {isPro ? (
              <button
                onClick={() => downgradeMut.mutate()}
                disabled={downgradeMut.isPending}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-4 py-2 text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
              >
                {downgradeMut.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Undo2 className="h-3.5 w-3.5" />
                )}
                Cancel Pro
              </button>
            ) : (
              <button
                onClick={() => upgradeMut.mutate()}
                disabled={upgradeMut.isPending}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {upgradeMut.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                Activate Pro
              </button>
            )}
          </div>

          <p className="mt-4 text-mono text-[11px] text-muted-foreground">
            Payments aren't wired up yet — activating flips your account to Pro instantly for
            testing.
          </p>
        </div>
      </div>

      <div className="mt-10 text-sm text-muted-foreground">
        <Link to="/profile" className="hover:text-primary">
          ← Back to profile
        </Link>
      </div>
    </div>
  );
}
