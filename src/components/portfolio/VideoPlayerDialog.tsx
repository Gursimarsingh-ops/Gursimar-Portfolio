import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { parseVideoSource } from "@/lib/video";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  subtitle: string;
  videoUrl?: string | null;
  /** Externally hosted video (YouTube/Vimeo/direct file). */
  sourceUrl?: string | null;
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
  sourceUrl,
  posterUrl,
  description,
  ratio,
}: Props) {
  const [detected, setDetected] = useState<number | null>(null);
  if (!open) return null;

  const pinned = ratio && ratio !== "auto" ? ratio.replace("/", " / ") : null;
  const aspect = pinned ?? (detected ? `${detected}` : "16 / 9");
  const source = parseVideoSource(sourceUrl);
  const ratioValue = (() => {
    const [width, height] = aspect.split("/").map((part) => Number(part.trim()));
    return width > 0 && height > 0 ? width / height : 16 / 9;
  })();
  const screenStyle =
    ratioValue >= 1
      ? { width: "100%", aspectRatio: String(ratioValue) }
      : { height: "min(76vh, 640px)", maxWidth: "100%", aspectRatio: String(ratioValue) };

  const external =
    source.provider === "youtube" || source.provider === "vimeo"
      ? source.embedUrl
      : source.provider === "file"
        ? source.embedUrl
        : null;

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

        {sourceUrl ? (
          external && source.provider !== "file" ? (
            <div className="grid place-items-center bg-black p-2">
              <div className="relative mx-auto overflow-hidden rounded-md bg-black" style={screenStyle}>
                <iframe
                  src={external}
                  title={title || "Video"}
                  className="absolute inset-0 h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                  loading="lazy"
                />
              </div>
            </div>
          ) : external ? (
            <div className="grid place-items-center bg-black p-2">
              <div className="relative mx-auto overflow-hidden rounded-md bg-black" style={screenStyle}>
                <video
                  src={external}
                  poster={posterUrl ?? undefined}
                  controls
                  playsInline
                  preload="metadata"
                  className="absolute inset-0 h-full w-full bg-black object-contain"
                />
              </div>
            </div>
          ) : (
            <div className="grid place-items-center bg-black px-6 py-16">
              <div className="flex max-w-md flex-col items-center gap-2 text-center">
                <AlertTriangle className="h-5 w-5 text-amber-300" />
                <p className="text-sm text-white/80">This video link cannot be embedded.</p>
                <p className="text-[11px] leading-relaxed text-white/45">
                  Use a YouTube, Vimeo or direct MP4/WebM/MOV link. The stored address is:{" "}
                  <span className="break-all font-mono text-[10px]">{sourceUrl}</span>
                </p>
              </div>
            </div>
          )
        ) : videoUrl ? (
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
