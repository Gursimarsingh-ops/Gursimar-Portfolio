import { useState } from "react";

interface ScreenFrameProps {
  /** "auto" (or omitted) follows the uploaded file's real dimensions. */
  ratio?: string;
  label: string;
  onClick?: () => void;
  variant?: "image" | "video";
  /** Full image for uploaded graphic projects. */
  imageUrl?: string | null;
  /** Poster/cover image for uploaded video projects. */
  posterUrl?: string | null;
}

export function ScreenFrame({
  ratio,
  label,
  onClick,
  variant = "image",
  imageUrl,
  posterUrl,
}: ScreenFrameProps) {
  const media = imageUrl ?? posterUrl;
  const [detected, setDetected] = useState<number | null>(null);

  // The LED monitor takes the real aspect ratio of the uploaded asset unless a
  // layout was pinned in the dashboard. Nothing is stretched or pre-cropped.
  const explicit = ratio && ratio !== "auto" ? ratio.replace("/", " / ") : null;
  const effective = explicit ?? (detected ? `${detected}` : "16 / 9");

  return (
    <button
      onClick={onClick}
      className="group relative w-full text-left transition-transform duration-300 hover:-translate-y-1.5"
    >
      <div className="absolute -inset-4 -z-10 rounded-3xl bg-neutral-900/0 blur-2xl transition-all duration-500 group-hover:bg-neutral-900/15" />

      <div className="rounded-2xl border border-neutral-300 bg-gradient-to-b from-neutral-800 via-neutral-900 to-black p-2.5 shadow-xl transition-shadow duration-300 group-hover:shadow-2xl">
        <div className="rounded-xl border border-neutral-700 bg-black p-1.5">
          <div
            className="relative overflow-hidden rounded-lg bg-neutral-900"
            style={{ aspectRatio: effective }}
          >
            {media ? (
              <>
                <img
                  src={media}
                  alt={label}
                  loading="lazy"
                  decoding="async"
                  onLoad={(event) => {
                    const { naturalWidth, naturalHeight } = event.currentTarget;
                    if (naturalWidth && naturalHeight) setDetected(naturalWidth / naturalHeight);
                  }}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent opacity-70" />
                {variant === "video" && (
                  <div className="absolute inset-0 grid place-items-center">
                    <span className="grid h-11 w-11 place-items-center rounded-full border border-white/60 bg-black/45 text-white/90 backdrop-blur transition-all duration-300 group-hover:scale-110 group-hover:bg-white group-hover:text-neutral-950">
                      <svg viewBox="0 0 24 24" className="h-4 w-4 translate-x-px" fill="currentColor">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </span>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(45deg,#fff_25%,transparent_25%,transparent_50%,#fff_50%,#fff_75%,transparent_75%)] [background-size:20px_20px]" />
                <div className="absolute inset-0 bg-gradient-to-br from-neutral-800/60 to-neutral-950" />
                <div className="absolute inset-0 grid place-items-center">
                  {variant === "image" ? (
                    <svg viewBox="0 0 24 24" className="h-8 w-8 text-neutral-600 transition-colors group-hover:text-neutral-300" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="3" y="5" width="18" height="14" rx="2" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  ) : (
                    <span className="grid h-12 w-12 place-items-center rounded-full border border-neutral-600 bg-white/5 text-neutral-300 backdrop-blur transition-all duration-300 group-hover:scale-110 group-hover:bg-white group-hover:text-neutral-950">
                      <svg viewBox="0 0 24 24" className="h-5 w-5 translate-x-px" fill="currentColor">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </span>
                  )}
                </div>
              </>
            )}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-white/0 to-white/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          </div>
        </div>
        <div className="mt-2 flex items-center justify-center gap-1.5" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-1 w-1 rounded-full bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.85)] transition-all duration-500 group-hover:bg-emerald-500 group-hover:shadow-[0_0_7px_rgba(16,185,129,0.9)] group-hover:animate-pulse"
              style={{ animationDelay: `${i * 180}ms` }}
            />
          ))}
        </div>
      </div>

      <div className="mx-auto mt-0 h-3 w-16 rounded-b-md bg-gradient-to-b from-neutral-800 to-neutral-900" />
      <div className="mx-auto h-1.5 w-28 rounded-full bg-gradient-to-b from-neutral-700 to-neutral-900 shadow-md" />

      <div className="mt-3 flex items-center justify-between gap-3 px-1">
        <span className="truncate text-xs text-neutral-500">{label}</span>
        <span className="shrink-0 text-[10px] uppercase tracking-[0.16em] text-neutral-400">
          {variant === "image" ? "Preview" : "Play"}
        </span>
      </div>
    </button>
  );
}
