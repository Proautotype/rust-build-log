import { useEffect, useRef } from "react";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useAuth } from "@/hooks/useAuth";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

function ensureAdsScript(client: string) {
  if (typeof document === "undefined") return;
  const id = "adsense-script";
  if (document.getElementById(id)) return;
  const s = document.createElement("script");
  s.id = id;
  s.async = true;
  s.crossOrigin = "anonymous";
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}`;
  document.head.appendChild(s);
}

interface Props {
  className?: string;
  /** Optional override; falls back to global slot in site_settings. */
  slot?: string;
  format?: string;
}

export function AdSlot({ className, slot, format = "auto" }: Props) {
  const { data: settings } = useSiteSettings();
  const { profile } = useAuth();
  const ref = useRef<HTMLModElement | null>(null);

  const client = settings?.adsense_client ?? null;
  const resolvedSlot = slot ?? settings?.adsense_slot ?? null;
  const enabled = !!settings?.adsense_enabled && !!client && !!resolvedSlot;
  const isPro = !!profile?.is_pro;

  useEffect(() => {
    if (!enabled || isPro) return;
    ensureAdsScript(client!);
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      /* AdSense will retry */
    }
  }, [enabled, isPro, client, resolvedSlot]);

  if (!enabled || isPro) return null;

  return (
    <div className={className}>
      <div className="text-mono text-[10px] uppercase tracking-widest text-muted-foreground/60 mb-1">
        Advertisement
      </div>
      <ins
        ref={ref}
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={client!}
        data-ad-slot={resolvedSlot!}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
}
