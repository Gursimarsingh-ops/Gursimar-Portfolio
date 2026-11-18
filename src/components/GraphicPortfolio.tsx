import { useState } from "react";
import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { id: "irl", label: "IRL Thumbnails", count: 6 },
  { id: "gaming", label: "Gaming Thumbnails", count: 6 },
  { id: "doc", label: "Documentary Thumbnails", count: 4 },
  { id: "other", label: "Other Graphic Design", count: 4 },
];

export function GraphicPortfolio() {
  const [active, setActive] = useState(CATEGORIES[0].id);
  const current = CATEGORIES.find((c) => c.id === active)!;

  return (
    <section id="graphic" className="relative border-t border-white/10 bg-neutral-900/30 py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-500">
              Portfolio · 01
            </p>
            <h2 className="mt-3 font-serif text-4xl tracking-tight text-white md:text-5xl">
              Graphic Design
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-neutral-400">
            Independent galleries per category. Placeholder cards — real client
            work will be added as it is released.
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

        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: current.count }).map((_, i) => (
            <div
              key={`${current.id}-${i}`}
              className="group relative aspect-video overflow-hidden rounded-2xl border border-white/10 bg-neutral-950"
            >
              <div className="absolute inset-0 opacity-[0.05] [background-image:linear-gradient(45deg,white_25%,transparent_25%,transparent_50%,white_50%,white_75%,transparent_75%)] [background-size:20px_20px]" />
              <div className="absolute inset-0 grid place-items-center">
                <div className="flex flex-col items-center gap-2 text-neutral-600 transition-colors group-hover:text-neutral-300">
                  <ImageIcon className="h-6 w-6" />
                  <span className="text-[10px] uppercase tracking-[0.2em]">
                    {current.label}
                  </span>
                </div>
              </div>
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between border-t border-white/10 bg-neutral-950/70 px-4 py-3 backdrop-blur">
                <span className="text-xs text-neutral-400">
                  Project slot {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-[10px] uppercase tracking-[0.16em] text-neutral-600">
                  Placeholder
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}