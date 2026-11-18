import { useState } from "react";
import { VIDEO_CATEGORIES } from "@/data/video-editing";
import { ScreenFrame } from "@/components/portfolio/ScreenFrame";
import { VideoPlayerDialog } from "@/components/portfolio/VideoPlayerDialog";
import { cn } from "@/lib/utils";

export function VideoPortfolio() {
  const [active, setActive] = useState(VIDEO_CATEGORIES[0].id);
  const [playing, setPlaying] = useState<{ title: string; category: string } | null>(null);
  const current = VIDEO_CATEGORIES.find((c) => c.id === active)!;

  return (
    <section id="video" className="relative border-t border-neutral-200 bg-white py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-500">
              Portfolio · 03
            </p>
            <h2 className="mt-3 font-serif text-4xl tracking-tight text-neutral-950 md:text-5xl">
              Video Editing
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-neutral-500">
            Video projects presented on premium monitor frames. Click a screen to
            open the integrated player.
          </p>
        </div>

        <div className="mt-10 flex flex-wrap gap-2">
          {VIDEO_CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => setActive(c.id)}
              className={cn(
                "rounded-full border px-4 py-2 text-xs font-medium uppercase tracking-[0.14em] transition-all active:scale-95",
                active === c.id
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : "border-neutral-300 bg-white text-neutral-500 hover:border-neutral-900 hover:text-neutral-950"
              )}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
          {Array.from({ length: current.count }).map((_, i) => (
            <ScreenFrame
              key={`${current.id}-${i}`}
              ratio="16/9"
              variant="video"
              label={`${current.label} · ${String(i + 1).padStart(2, "0")}`}
              onClick={() =>
                setPlaying({
                  title: `${current.label} · Project ${String(i + 1).padStart(2, "0")}`,
                  category: current.label,
                })
              }
            />
          ))}
        </div>
      </div>

      <VideoPlayerDialog
        open={!!playing}
        onOpenChange={(v) => !v && setPlaying(null)}
        title={playing?.title ?? ""}
        subtitle={playing?.category ?? ""}
      />
    </section>
  );
}