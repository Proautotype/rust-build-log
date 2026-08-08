/**
 * Writer social links.
 *
 * Stored on `profiles.socials` as { [key]: { url, visible } } and gated
 * globally by `profiles.show_socials`.
 */

export const SOCIAL_PLATFORMS = [
  { key: "x", label: "X (Twitter)", placeholder: "https://x.com/username" },
  { key: "github", label: "GitHub", placeholder: "https://github.com/username" },
  { key: "linkedin", label: "LinkedIn", placeholder: "https://linkedin.com/in/username" },
  { key: "instagram", label: "Instagram", placeholder: "https://instagram.com/username" },
  { key: "youtube", label: "YouTube", placeholder: "https://youtube.com/@channel" },
  { key: "tiktok", label: "TikTok", placeholder: "https://tiktok.com/@username" },
  { key: "website", label: "Website", placeholder: "https://yoursite.com" },
] as const;

export type SocialKey = (typeof SOCIAL_PLATFORMS)[number]["key"];

export interface SocialLink {
  url: string;
  visible: boolean;
}

export type SocialMap = Partial<Record<SocialKey, SocialLink>>;

const KEYS = SOCIAL_PLATFORMS.map((p) => p.key) as SocialKey[];

/** Coerce arbitrary jsonb into a clean SocialMap. */
export function parseSocials(raw: unknown): SocialMap {
  const out: SocialMap = {};
  if (!raw || typeof raw !== "object") return out;
  for (const key of KEYS) {
    const value = (raw as Record<string, unknown>)[key];
    if (!value) continue;
    if (typeof value === "string") {
      if (value.trim()) out[key] = { url: value.trim(), visible: true };
      continue;
    }
    if (typeof value === "object") {
      const url = String((value as Record<string, unknown>).url ?? "").trim();
      if (!url) continue;
      out[key] = { url, visible: (value as Record<string, unknown>).visible !== false };
    }
  }
  return out;
}

/** Only the links a writer chose to show publicly. */
export function visibleSocials(raw: unknown, showSocials = true): { key: SocialKey; url: string }[] {
  if (!showSocials) return [];
  const map = parseSocials(raw);
  return KEYS.filter((k) => map[k]?.visible && map[k]?.url).map((k) => ({
    key: k,
    url: map[k]!.url,
  }));
}

export function socialLabel(key: SocialKey): string {
  return SOCIAL_PLATFORMS.find((p) => p.key === key)?.label ?? key;
}
