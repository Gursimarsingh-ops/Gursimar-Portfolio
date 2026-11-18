import { X } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  subtitle: string;
  imageUrl?: string | null;
  description?: string;
}

export function ProjectPreviewDialog({
  open,
  onOpenChange,
  title,
  subtitle,
  imageUrl,
  description,
}: Props) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-neutral-950/70 p-4 backdrop-blur-sm"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-neutral-800 bg-neutral-950 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-800 bg-neutral-950/95 px-5 py-3 backdrop-blur">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">{subtitle}</p>
            <p className="truncate text-sm font-medium text-white">{title}</p>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            aria-label="Close preview"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-neutral-700 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {imageUrl ? (
          <div className="bg-black">
            <img
              src={imageUrl}
              alt={title}
              loading="lazy"
              decoding="async"
              className="max-h-[68vh] w-full object-contain"
            />
          </div>
        ) : (
          <div className="relative aspect-video bg-neutral-900">
            <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(45deg,#fff_25%,transparent_25%,transparent_50%,#fff_50%,#fff_75%,transparent_75%)] [background-size:24px_24px]" />
            <div className="absolute inset-0 grid place-items-center text-neutral-600">
              <svg viewBox="0 0 24 24" className="h-12 w-12" fill="none" stroke="currentColor" strokeWidth="1.2">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </div>
          </div>
        )}

        {description ? (
          <p className="border-t border-neutral-800 px-5 py-4 text-sm leading-6 text-neutral-400">
            {description}
          </p>
        ) : null}
      </div>
    </div>
  );
}
