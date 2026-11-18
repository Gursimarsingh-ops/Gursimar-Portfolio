import { cn } from "@/lib/utils";

interface ScreenFrameProps {
  ratio: string;
  label: string;
  onClick?: () => void;
  variant?: "image" | "video";
}

export function ScreenFrame({ ratio, label, onClick, variant = "image" }: ScreenFrameProps) {
  return (
    <button
      onClick={onClick}
      className="group relative w-full text-left transition-transform duration-300 hover:-translate-y-1"
    >
      <div className="rounded-2xl border border-neutral-300 bg-gradient-to-b from-neutral-800 to-neutral-950 p-2 shadow-lg transition-shadow group-hover:shadow-2xl">
        <div className="rounded-xl border border-neutral-700 bg-black p-1">
          <div
            className="relative overflow-hidden rounded-lg bg-neutral-900"
            style={{ aspectRatio: ratio }}
          >
            <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(45deg,#fff_25%,transparent_25%,transparent_50%,#fff_50%,#fff_75%,transparent_75%)] [background-size:20px_20px]" />
            <div className="absolute inset-0 bg-gradient-to-br from-neutral-800/60 to-neutral-950" />
            <div className="absolute inset-0 grid place-items-center">
              {variant === "image" ? (
                <svg viewBox="0 0 24 24" className="h-8 w-8 text-neutral-600 transition-colors group-hover:text-neutral-300" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              ) : (
                <span className="grid h-12 w-12 place-items-center rounded-full border border-neutral-600 bg-white/5 text-neutral-300 backdrop-blur transition-all group-hover:scale-110 group-hover:bg-white group-hover:text-neutral-950">
                  <svg viewBox="0 0 24 24" className="h-5 w-5 translate-x-px" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </span>
              )}
            </div>
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-white/0 to-white/10 opacity-0 transition-opacity group-hover:opacity-100" />
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between px-1">
        <span className="text-xs text-neutral-500">{label}</span>
        <span className="text-[10px] uppercase tracking-[0.16em] text-neutral-400">
          {variant === "image" ? "Preview" : "Play"}
        </span>
      </div>
      <span className="absolute -bottom-1 left-1/2 h-1 w-16 -translate-x-1/2 rounded-full bg-neutral-900/10 blur-sm" />
    </button>
  );
}