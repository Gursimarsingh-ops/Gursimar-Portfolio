import { useState } from "react";
import { X } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  subtitle: string;
  videoUrl?: string | null;
  posterUrl?: string | null;
  description?: string;
  /** Optional stored aspect ratio, e.g. "9/16" from the dashboard. */
  ratio?: string | null;
}

export function VideoPlayerDialog({
  open,
  onOpenChange,
  title,
  subtitle,
  videoUrl,
  posterUrl,
  description,
  ratio,
}: Props) {
  const [detected, setDetected] = useState<number | null>(null);
  if (!open) return null;

  const pinned = ratio && ratio !== "auto" ? ratio.replace("/", " / ") : null;
  const aspect = pinned ?? (detected ? `${detected}` : "16 / 9");

  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-neutral-950/80 p-4 backdrop-blur-sm"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="relative max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-neutral-800 bg-neutral-950 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-800 bg-neutral-950/95 px-5 py-3 backdrop-blur">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">{subtitle}</p>
            <p className="truncate text-sm font-medium text-white">{title}</p>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            aria-label="Close player"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-neutral-700 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {videoUrl ? (
          <div className="grid place-items-center bg-black">
            <video
              src={videoUrl}
              poster={posterUrl ?? undefined}
              controls
              playsInline
              preload="metadata"
              onLoadedMetadata={(event) => {
                const element = event.currentTarget;
                if (element.videoWidth && element.videoHeight) {
                  setDetected(element.videoWidth / element.videoHeight);
                }
              }}
              style={{ aspectRatio: aspect }}
              className="max-h-[76vh] w-full bg-black object-contain"
            />
          </div>
        ) : (
          <div className="relative aspect-video bg-black">
            <div className="absolute inset-0 grid place-items-center text-neutral-600">
              <div className="flex flex-col items-center gap-3">
                <span className="grid h-16 w-16 place-items-center rounded-full border border-neutral-700 bg-white/5 text-neutral-300">
                  <svg viewBox="0 0 24 24" className="h-6 w-6 translate-x-px" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </span>
                <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">
                  Track preview · publish a video to play it here
                </p>
              </div>
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
