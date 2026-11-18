import { useState } from "react";
import { Play } from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { id: "gaming", label: "Gaming Video Editing", count: 4 },
  { id: "doc", label: "Documentary Editing", count: 3 },
  { id: "corp", label: "Corporate Videos", count: 3 },
  { id: "motion", label: "Motion Graphics", count: 4 },
  { id: "estate", label: "Real Estate Videos", count: 3 },
  { id: "saas", label: "SaaS Animations", count: 3 },
];

export function VideoPortfolio() {
  const [active, setActive] = useState(CATEGORIES[0].id);
  const current = CATEGORIES.find((c) => c.id === active)!;

  return (
    <section id="video" className="relative border-t border-white/10 bg-neutral-950 py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-500">
              Portfolio · 02
            </p>
            <h2 className="mt-3 font-serif text-4xl tracking-tight text-white md:text-5xl">
              Video Editing
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-neutral-400">
            Layout prepared for thumbnails and in-page playback. Videos will be
            hosted separately and embedded here.
          </p>
        </div>

        <div className="mt-10 flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => setActive(c.id)}
              className={cn(
                "rounded-full border px-4 py-2 text-xs font-medium uppercase tracking-[0.14em] transition-all",
                active === c.id
                  ? "border-white bg-white text-neutral-950"
                  : "border-white/15 text-neutral-400 hover:border-white/35 hover:text-white"
              )}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2">
          {Array.from({ length: current.count }).map((_, i) => (
            <div
              key={`${current.id}-${i}`}
              className="group relative aspect-video overflow-hidden rounded-2xl border border-white/10 bg-neutral-900/50"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-neutral-800/40 to-neutral-950" />
              <div className="absolute inset-0 grid place-items-center">
                <span className="grid h-14 w-14 place-items-center rounded-full border border-white/20 bg-white/5 text-neutral-300 backdrop-blur transition-all group-hover:scale-105 group-hover:bg-white group-hover:text-neutral-950">
                  <Play className="h-5 w-5 translate-x-px" />
                </span>
              </div>
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between border-t border-white/10 bg-neutral-950/70 px-4 py-3 backdrop-blur">
                <span className="text-xs text-neutral-400">
                  {current.label} · Slot {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-[10px] uppercase tracking-[0.16em] text-neutral-600">
                  Embed ready
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}