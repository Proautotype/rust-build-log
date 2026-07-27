import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LayoutTemplate, Coins, Check, Trash2, Globe, Lock } from "lucide-react";
import {
  listMyTemplates,
  listSharedTemplates,
  acquireTemplate,
  deleteTemplate,
} from "@/lib/templates.functions";
import { cardVariantLabels } from "@/components/story/StoryCards";
import type { CardVariant } from "@/data/stories";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/templates")({
  component: TemplatesPage,
  head: () => ({
    meta: [
      { title: "Story & Card Templates — Right2Read" },
      {
        name: "description",
        content:
          "Browse, buy and reuse story layouts and card templates shared by Right2Read creators.",
      },
      { property: "og:title", content: "Story & Card Templates — Right2Read" },
      {
        property: "og:description",
        content: "Reusable story layouts, themes and card styles from the R2R creator community.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function TemplatesPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"shared" | "mine">("shared");

  const shared = useServerFn(listSharedTemplates);
  const mine = useServerFn(listMyTemplates);
  const acquire = useServerFn(acquireTemplate);
  const remove = useServerFn(deleteTemplate);

  const sharedQ = useQuery({ queryKey: ["templates", "shared"], queryFn: () => shared() });
  const mineQ = useQuery({ queryKey: ["templates", "mine"], queryFn: () => mine() });

  const acquireM = useMutation({
    mutationFn: (id: string) => acquire({ data: { id } }),
    onSuccess: (res) => {
      toast.success(
        res.charged > 0 ? `Unlocked for ${res.charged} coins` : "Template added to your library",
      );
      qc.invalidateQueries({ queryKey: ["templates"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteM = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      toast.success("Template deleted");
      qc.invalidateQueries({ queryKey: ["templates"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = tab === "shared" ? (sharedQ.data ?? []) : (mineQ.data ?? []);
  const loading = tab === "shared" ? sharedQ.isLoading : mineQ.isLoading;

  const tabBtn = (active: boolean) =>
    `rounded-md px-3 py-1.5 text-mono text-[11px] transition ${
      active ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"
    }`;

  return (
    <main className="container-page py-10">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-border bg-surface-2">
            <LayoutTemplate className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-display tracking-tight md:text-3xl">Templates</h1>
            <p className="truncate text-sm text-muted-foreground">
              Reusable story layouts, themes and card styles.
            </p>
          </div>
        </div>
        <div className="inline-flex shrink-0 rounded-md border border-border bg-background p-0.5">
          <button className={tabBtn(tab === "shared")} onClick={() => setTab("shared")}>
            Marketplace
          </button>
          <button className={tabBtn(tab === "mine")} onClick={() => setTab("mine")}>
            My templates
          </button>
        </div>
      </header>

      {loading ? (
        <p className="mt-10 text-sm text-muted-foreground">Loading templates…</p>
      ) : rows.length === 0 ? (
        <p className="mt-10 text-sm text-muted-foreground">
          {tab === "shared"
            ? "No shared templates yet — publish one from the Studio."
            : "You haven't saved any templates yet. Save one from the Studio."}
        </p>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((t) => {
            const unlocked = "unlocked" in t ? (t.unlocked as boolean) : true;
            return (
              <article
                key={t.id}
                className="flex flex-col rounded-xl border border-border bg-card p-5 transition hover:border-primary/40"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-mono text-[10px] uppercase tracking-widest text-primary/80">
                    {t.kind === "card" ? "Card template" : "Story template"}
                  </span>
                  <span className="inline-flex items-center gap-1 text-mono text-[10px] text-muted-foreground">
                    {t.visibility === "public" ? (
                      <>
                        <Globe className="h-3 w-3" /> Shared
                      </>
                    ) : (
                      <>
                        <Lock className="h-3 w-3" /> Private
                      </>
                    )}
                  </span>
                </div>
                <h2 className="mt-2 text-lg font-semibold leading-snug text-foreground">{t.name}</h2>
                {t.description ? (
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{t.description}</p>
                ) : null}
                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-mono text-[10px] text-muted-foreground">
                  <span>{cardVariantLabels[(t.card_variant as CardVariant) ?? "poster"]} card</span>
                  <span>{t.uses} uses</span>
                  {t.price > 0 ? (
                    <span className="inline-flex items-center gap-1 text-primary">
                      {t.price} <Coins className="h-3 w-3" />
                    </span>
                  ) : (
                    <span>Free</span>
                  )}
                </div>

                <div className="mt-auto pt-5">
                  {tab === "mine" ? (
                    <button
                      onClick={() => deleteM.mutate(t.id)}
                      className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-mono text-[11px] text-muted-foreground transition hover:border-destructive/50 hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </button>
                  ) : unlocked ? (
                    <span className="inline-flex items-center gap-1.5 text-mono text-[11px] text-primary">
                      <Check className="h-3.5 w-3.5" /> In your library
                    </span>
                  ) : (
                    <button
                      disabled={acquireM.isPending}
                      onClick={() => acquireM.mutate(t.id)}
                      className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-mono text-[11px] text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
                    >
                      <Coins className="h-3.5 w-3.5" />
                      {t.price > 0 ? `Unlock for ${t.price}` : "Add to library"}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
