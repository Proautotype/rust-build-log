import { useState } from "react";
import { Play } from "lucide-react";

interface Props {
  youtubeId: string;
  title: string;
}

export function VideoEmbed({ youtubeId, title }: Props) {
  const [loaded, setLoaded] = useState(false);
  const thumb = `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`;

  return (
    <figure className="my-6 overflow-hidden rounded-lg border border-border bg-surface-2">
      <div className="relative aspect-video">
        {loaded ? (
          <iframe
            className="absolute inset-0 h-full w-full"
            src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1`}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <button
            onClick={() => setLoaded(true)}
            className="group absolute inset-0 flex items-center justify-center"
            aria-label={`Play ${title}`}
          >
            <img
              src={thumb}
              alt=""
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover opacity-70 group-hover:opacity-90 transition"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
              }}
            />
            <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-primary/20 transition group-hover:scale-105">
              <Play className="h-6 w-6 translate-x-0.5" fill="currentColor" />
            </span>
          </button>
        )}
      </div>
      <figcaption className="border-t border-border/80 bg-surface px-4 py-2 text-mono text-xs text-muted-foreground">
        <span className="text-primary">▶</span> {title}
      </figcaption>
    </figure>
  );
}
