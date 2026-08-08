import { Github, Twitter, Linkedin, Instagram, Youtube, Globe, Music2 } from "lucide-react";
import { visibleSocials, socialLabel, type SocialKey } from "@/lib/socials";

const ICONS: Record<SocialKey, React.ComponentType<{ className?: string }>> = {
  x: Twitter,
  github: Github,
  linkedin: Linkedin,
  instagram: Instagram,
  youtube: Youtube,
  tiktok: Music2,
  website: Globe,
};

export function WriterSocials({
  socials,
  showSocials,
  className = "",
}: {
  socials: unknown;
  showSocials?: boolean | null;
  className?: string;
}) {
  const links = visibleSocials(socials, showSocials !== false);
  if (!links.length) return null;

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {links.map(({ key, url }) => {
        const Icon = ICONS[key];
        return (
          <a
            key={key}
            href={url}
            target="_blank"
            rel="noreferrer nofollow"
            title={socialLabel(key)}
            aria-label={socialLabel(key)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition hover:text-primary hover:border-primary/40"
          >
            <Icon className="h-3.5 w-3.5" />
          </a>
        );
      })}
    </div>
  );
}
