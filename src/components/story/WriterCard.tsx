import { User as UserIcon } from "lucide-react";

export interface WriterInfo {
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
}

export function WriterCard({ writer }: { writer: WriterInfo }) {
  return (
    <div className="mt-12 rounded-xl border border-border bg-card/40 p-5 flex items-start gap-4">
      {writer.avatar_url ? (
        <img
          src={writer.avatar_url}
          alt=""
          className="h-12 w-12 rounded-full object-cover ring-1 ring-border"
        />
      ) : (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary ring-1 ring-primary/30">
          <UserIcon className="h-5 w-5" />
        </div>
      )}
      <div className="min-w-0">
        <div className="text-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Written by
        </div>
        <div className="mt-0.5 font-medium text-foreground">
          {writer.display_name ?? "Anonymous"}
        </div>
        {writer.bio && (
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{writer.bio}</p>
        )}
      </div>
    </div>
  );
}
