import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Save, ShieldAlert } from "lucide-react";
import { useRole } from "@/hooks/useRole";
import { getSiteSettings, updateSiteSettings } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  head: () => ({
    meta: [
      { title: "Site settings — Right2Read" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { isAdmin, loading } = useRole();
  const qc = useQueryClient();
  const fetchSettings = useServerFn(getSiteSettings);
  const saveSettings = useServerFn(updateSiteSettings);

  const settingsQuery = useQuery({
    queryKey: ["site-settings"],
    queryFn: () => fetchSettings(),
  });

  const [enabled, setEnabled] = useState(false);
  const [globalEnabled, setGlobalEnabled] = useState(true);
  const [client, setClient] = useState("");
  const [slot, setSlot] = useState("");
  const [bucketPublic, setBucketPublic] = useState(false);
  const [maxMb, setMaxMb] = useState(25);
  const [allowedTypes, setAllowedTypes] = useState("image/*,video/mp4,video/webm,application/pdf");
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    const s = settingsQuery.data as
      | {
          adsense_enabled?: boolean;
          adsense_global_enabled?: boolean;
          adsense_client?: string | null;
          adsense_slot?: string | null;
          media_bucket_public?: boolean | null;
          media_max_mb?: number | null;
          media_allowed_types?: string | null;
        }
      | null
      | undefined;
    if (s) {
      setEnabled(!!s.adsense_enabled);
      setGlobalEnabled(s.adsense_global_enabled ?? true);
      setClient(s.adsense_client ?? "");
      setSlot(s.adsense_slot ?? "");
      setBucketPublic(!!s.media_bucket_public);
      setMaxMb(s.media_max_mb ?? 25);
      setAllowedTypes(s.media_allowed_types ?? "image/*,video/mp4,video/webm,application/pdf");
    }
  }, [settingsQuery.data]);

  const save = useMutation({
    mutationFn: () =>
      saveSettings({
        data: {
          adsense_enabled: enabled,
          adsense_global_enabled: globalEnabled,
          adsense_client: client.trim() || null,
          adsense_slot: slot.trim() || null,
          media_bucket_public: bucketPublic,
          media_max_mb: maxMb,
          media_allowed_types: allowedTypes.trim(),
        },
      }),
    onSuccess: () => {
      setStatus("Saved ✓");
      setTimeout(() => setStatus(null), 2000);
      qc.invalidateQueries({ queryKey: ["site-settings"] });
    },
    onError: (err: Error) => setStatus(err.message),
  });

  if (loading) {
    return (
      <div className="container-page py-20 text-mono text-sm text-muted-foreground">
        <Loader2 className="inline h-4 w-4 animate-spin" /> loading…
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container-page py-20 max-w-md text-center">
        <ShieldAlert className="mx-auto h-10 w-10 text-destructive" />
        <h1 className="mt-4 text-2xl font-display">Admins only</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You need admin access to change site settings.
        </p>
        <Link to="/" className="mt-6 inline-block text-primary text-sm hover:underline">
          Go home
        </Link>
      </div>
    );
  }

  return (
    <div className="container-page py-10 md:py-14 max-w-2xl">
      <div className="text-mono text-[11px] uppercase tracking-widest text-primary">
        Admin · Site settings
      </div>
      <h1 className="mt-2 text-4xl md:text-5xl font-display tracking-tight">Ads & monetization</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Toggle Google AdSense across the site. Pro users never see ads.
      </p>

      <section className="mt-10 rounded-xl border border-border bg-card/40 p-6 space-y-5">
        <label className="flex items-center justify-between gap-4">
          <div>
            <div className="font-medium">Enable Google AdSense</div>
            <div className="text-xs text-muted-foreground">
              When off, no ad markup or scripts are loaded anywhere.
            </div>
          </div>
          <button
            role="switch"
            aria-checked={enabled}
            onClick={() => setEnabled((v) => !v)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
              enabled ? "bg-primary" : "bg-surface-2"
            }`}
          >
            <span
              className={`inline-block h-5 w-5 rounded-full bg-background shadow transition ${
                enabled ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
        </label>

        <label className="flex items-center justify-between gap-4">
          <div>
            <div className="font-medium">Show ads on every page</div>
            <div className="text-xs text-muted-foreground">
              When on, a banner ad appears at the bottom of every page (not just story pages). Pro users still see no ads.
            </div>
          </div>
          <button
            role="switch"
            aria-checked={globalEnabled}
            onClick={() => setGlobalEnabled((v) => !v)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
              globalEnabled ? "bg-primary" : "bg-surface-2"
            }`}
          >
            <span
              className={`inline-block h-5 w-5 rounded-full bg-background shadow transition ${
                globalEnabled ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
        </label>

        <Field label="AdSense publisher ID (data-ad-client)">
          <input
            value={client}
            onChange={(e) => setClient(e.target.value)}
            placeholder="ca-pub-XXXXXXXXXXXXXXXX"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-mono outline-none focus:ring-1 focus:ring-primary"
          />
        </Field>

        <Field label="Default ad slot ID">
          <input
            value={slot}
            onChange={(e) => setSlot(e.target.value)}
            placeholder="1234567890"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-mono outline-none focus:ring-1 focus:ring-primary"
          />
        </Field>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={() => save.mutate()}
            disabled={save.isPending}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {save.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            Save settings
          </button>
          {status && <span className="text-mono text-xs text-primary">{status}</span>}
        </div>
      </section>

      <section className="mt-8 rounded-xl border border-border bg-card/40 p-6 space-y-5">
        <div>
          <h2 className="text-lg font-display">Media bucket</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Controls the media library used by the Studio for images, videos and PDFs.
          </p>
        </div>

        <label className="flex items-center justify-between gap-4">
          <div>
            <div className="font-medium">Public media URLs</div>
            <div className="text-xs text-muted-foreground">
              When on, uploaded files are served via long-lived public URLs. Turn off to use signed URLs only.
            </div>
          </div>
          <button
            role="switch"
            aria-checked={bucketPublic}
            onClick={() => setBucketPublic((v) => !v)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
              bucketPublic ? "bg-primary" : "bg-surface-2"
            }`}
          >
            <span
              className={`inline-block h-5 w-5 rounded-full bg-background shadow transition ${
                bucketPublic ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
        </label>

        <Field label="Max upload size (MB)">
          <input
            type="number"
            min={1}
            max={1024}
            value={maxMb}
            onChange={(e) => setMaxMb(Math.max(1, Math.min(1024, Number(e.target.value) || 25)))}
            className="w-32 rounded-md border border-border bg-background px-3 py-2 text-sm text-mono outline-none focus:ring-1 focus:ring-primary"
          />
        </Field>

        <Field label="Allowed MIME types (comma separated)">
          <input
            value={allowedTypes}
            onChange={(e) => setAllowedTypes(e.target.value)}
            placeholder="image/*,video/mp4,application/pdf"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-mono outline-none focus:ring-1 focus:ring-primary"
          />
        </Field>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={() => save.mutate()}
            disabled={save.isPending}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {save.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            Save all settings
          </button>
        </div>
      </section>
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
