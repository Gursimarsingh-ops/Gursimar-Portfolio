import { useState } from "react";
import { GRAPHIC_CATEGORIES } from "@/data/graphic-design";
import { ScreenFrame } from "@/components/portfolio/ScreenFrame";
import { ProjectPreviewDialog } from "@/components/portfolio/ProjectPreviewDialog";
import { cn } from "@/lib/utils";

export function GraphicPortfolio() {
  const [active, setActive] = useState(GRAPHIC_CATEGORIES[0].id);
  const [preview, setPreview] = useState<{ title: string; category: string } | null>(null);
  const current = GRAPHIC_CATEGORIES.find((c) => c.id === active)!;

  return (
    <section id="graphic" className="relative border-t border-neutral-200 bg-neutral-50 py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-500">
              Portfolio · 02
            </p>
            <h2 className="mt-3 font-serif text-4xl tracking-tight text-neutral-950 md:text-5xl">
              Graphic Design
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-neutral-500">
            Independent galleries per category, presented on premium LED-screen
            frames. Click a screen to open a larger preview.
          </p>
        </div>

        <div className="mt-10 flex flex-wrap gap-2">
          {GRAPHIC_CATEGORIES.map((c) => (
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

        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: current.count }).map((_, i) => (
            <ScreenFrame
              key={`${current.id}-${i}`}
              ratio={current.ratio}
              label={`${current.label} · ${String(i + 1).padStart(2, "0")}`}
              onClick={() =>
                setPreview({
                  title: `${current.label} · Project ${String(i + 1).padStart(2, "0")}`,
                  category: current.label,
                })
              }
            />
          ))}
        </div>
      </div>

      <ProjectPreviewDialog
        open={!!preview}
        onOpenChange={(v) => !v && setPreview(null)}
        title={preview?.title ?? ""}
        subtitle={preview?.category ?? ""}
      />
    </section>
  );
}