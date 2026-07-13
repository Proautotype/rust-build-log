import { FileText, Download } from "lucide-react";

interface Props {
  title: string;
  description?: string;
  sizeKb: number;
  href: string;
}

export function PDFViewer({ title, description, sizeKb, href }: Props) {
  const size = sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="my-6 group flex items-center gap-4 rounded-lg border border-border bg-surface-2 p-4 transition-colors hover:border-primary/40"
    >
      <span className="flex h-12 w-12 flex-none items-center justify-center rounded-md bg-primary/10 text-primary ring-1 ring-primary/25">
        <FileText className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-mono text-[10px] uppercase tracking-wider text-primary/80">PDF</span>
          <span className="text-mono text-[10px] text-muted-foreground">· {size}</span>
        </div>
        <div className="font-medium text-foreground truncate">{title}</div>
        {description ? (
          <div className="text-sm text-muted-foreground truncate">{description}</div>
        ) : null}
      </div>
      <Download className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
    </a>
  );
}
