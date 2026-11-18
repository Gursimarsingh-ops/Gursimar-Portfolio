import { X } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  subtitle: string;
}

export function VideoPlayerDialog({ open, onOpenChange, title, subtitle }: Props) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-neutral-950/80 p-4 backdrop-blur-sm"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="relative w-full max-w-4xl overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-neutral-800 px-5 py-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">
              {subtitle}
            </p>
            <p className="text-sm font-medium text-white">{title}</p>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="grid h-8 w-8 place-items-center rounded-md border border-neutral-700 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="relative aspect-video bg-black">
          <div className="absolute inset-0 grid place-items-center text-neutral-600">
            <div className="flex flex-col items-center gap-3">
              <span className="grid h-16 w-16 place-items-center rounded-full border border-neutral-700 bg-white/5 text-neutral-300">
                <svg viewBox="0 0 24 24" className="h-6 w-6 translate-x-px" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </span>
              <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">
                Player ready · Cloudflare R2 integration point
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}