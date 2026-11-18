import { useState } from "react";
import { VIDEO_CATEGORIES } from "@/data/video-editing";
import { ScreenFrame } from "@/components/portfolio/ScreenFrame";
import { VideoPlayerDialog } from "@/components/portfolio/VideoPlayerDialog";
import { usePublishedProjects } from "@/lib/portfolio";
import { cn } from "@/lib/utils";

interface Playing {
  title: string;
  category: string;
  videoUrl?: string | null;
  posterUrl?: string | null;
  description?: string;
}

export function VideoPortfolio() {
  const [active, setActive] = useState(VIDEO_CATEGORIES[0].id);
  const [playing, setPlaying] = useState<Playing | null>(null);
  const current = VIDEO_CATEGORIES.find((c) => c.id === active)!;
  const { projects } = usePublishedProjects();

  const uploaded = projects.filter((project) => project.kind === "video");
  const inCategory = uploaded.filter((project) => project.category === current.id);
  const total = uploaded.length;

  return (
    <section id="video" className="relative scroll-mt-24 border-t border-neutral-200 bg-white py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-500">
              Portfolio · 03
            </p>
            <h2 className="mt-3 font-serif text-4xl leading-[1.04] tracking-tight text-neutral-950 sm:text-5xl md:text-6xl">
              Video Editing
            </h2>
            <p className="mt-4 max-w-md text-[13px] leading-7 text-neutral-600 md:text-sm">
              Edits shaped around pacing, rhythm and a clean final grade, from
              long-form narrative to short-form cutdowns.
            </p>
            <span className="mt-5 block h-px w-24 bg-gradient-to-r from-neutral-900 via-neutral-400 to-transparent" />
          </div>
          <div className="flex items-end gap-6 border-l border-neutral-200 pl-5 md:border-l-0 md:pl-0">
            <div>
              <p className="font-serif text-2xl tracking-tight text-neutral-950">{total}</p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-neutral-400">
                Projects
              </p>
            </div>
            <div>
              <p className="font-serif text-2xl tracking-tight text-neutral-950">
                {VIDEO_CATEGORIES.length}
              </p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-neutral-400">
                Categories
              </p>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap gap-2">
          {VIDEO_CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => setActive(c.id)}
              aria-pressed={active === c.id}
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

        {inCategory.length === 0 && (
          <div className="mt-10 rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 px-6 py-14 text-center">
            <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">No videos in this category yet</p>
            <p className="mt-2 text-[13px] text-neutral-500">
              New work added from the security dashboard appears here automatically.
            </p>
          </div>
        )}

        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
          {inCategory.map((project) => (
            <ScreenFrame
              key={project.id}
              ratio={project.ratio ?? "auto"}
              variant="video"
              label={project.title}
              posterUrl={project.thumbUrl}
              onClick={() =>
                setPlaying({
                  title: project.title,
                  category: current.label,
                  videoUrl: project.mediaUrl,
                  posterUrl: project.thumbUrl,
                  description: project.description,
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
        videoUrl={playing?.videoUrl}
        posterUrl={playing?.posterUrl}
        description={playing?.description}
      />
    </section>
  );
}
