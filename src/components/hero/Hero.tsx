import { ArrowRight, Play } from "lucide-react";
import { AssistantStage } from "@/components/character/AssistantStage";
import { AnimatedName } from "@/components/hero/AnimatedName";
import { AvailabilityBadge } from "@/components/common/AvailabilityBadge";

const STATS = [
  { k: "Editing", v: "Specialist" },
  { k: "4K", v: "Cinematic Grade" },
  { k: "26", v: "Graphic Designs" },
  { k: "3+", v: "Years Video Editing" },
  { k: "1", v: "Year Graphic Design" },
];

export function Hero() {
  return (
    <section id="top" className="relative scroll-mt-24 overflow-hidden bg-white pb-16 pt-32 md:pb-20 md:pt-40">
      <div className="pointer-events-none absolute inset-0 opacity-[0.5] [background-image:linear-gradient(to_right,#e5e5e5_1px,transparent_1px),linear-gradient(to_bottom,#e5e5e5_1px,transparent_1px)] [background-size:72px_72px]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-full bg-gradient-to-b from-white via-white/60 to-white" />

      <div className="relative mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 flex justify-center">
            <AvailabilityBadge />
          </div>

          <AnimatedName />

          <div className="mt-7 flex justify-center">
            <div className="relative overflow-hidden rounded-full border border-neutral-200/90 bg-white/60 px-5 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_18px_44px_-32px_rgba(0,0,0,0.65)] backdrop-blur-md">
              <span className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />
              <span className="pointer-events-none absolute -left-8 top-0 h-full w-16 -skew-x-12 bg-white/50 blur-md" />
              <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_120%_at_20%_-20%,rgba(255,255,255,0.9),transparent_60%)]" />
              <p className="relative bg-gradient-to-b from-neutral-900 via-neutral-800 to-neutral-500 bg-clip-text text-[11px] font-semibold uppercase tracking-[0.14em] text-transparent min-[380px]:text-[12px] min-[380px]:tracking-[0.18em] md:text-sm md:tracking-[0.22em]">
                Video Editor &amp; Graphic Designer
              </p>
            </div>
          </div>

          <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-neutral-500 md:text-base">
            Video editing, graphic design and motion work that give every
            project a clear story and a polished finish.
          </p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
            <a
              href="#graphic"
              className="group relative isolate inline-flex items-center gap-2 overflow-hidden rounded-full border border-neutral-900 bg-neutral-900 px-6 py-3 text-sm font-semibold text-white shadow-[0_14px_32px_-22px_rgba(0,0,0,0.9)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-neutral-800 hover:shadow-[0_22px_44px_-20px_rgba(0,0,0,0.75)] active:translate-y-0 active:scale-[0.97] active:shadow-[0_10px_22px_-18px_rgba(0,0,0,0.9)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
            >
              <span className="pointer-events-none absolute inset-0 -translate-x-[130%] skew-x-[-14deg] bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[130%]" />
              <span className="pointer-events-none absolute inset-x-7 top-0 h-px bg-gradient-to-r from-transparent via-white/45 to-transparent" />
              <span className="relative z-10">View My Work</span>
              <ArrowRight className="relative z-10 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </a>
            <a
              href="#contact"
              className="group relative isolate inline-flex items-center gap-2 overflow-hidden rounded-full border border-neutral-300 bg-white/70 px-6 py-3 text-sm font-semibold text-neutral-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_12px_28px_-24px_rgba(0,0,0,0.7)] backdrop-blur-sm transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-neutral-900 hover:bg-neutral-900 hover:text-white hover:shadow-[0_22px_44px_-22px_rgba(0,0,0,0.8)] active:translate-y-0 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
            >
              <span className="pointer-events-none absolute inset-0 -translate-x-[130%] skew-x-[-14deg] bg-gradient-to-r from-transparent via-neutral-900/15 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[130%] group-hover:via-white/25" />
              <span className="pointer-events-none absolute inset-x-7 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent opacity-80 transition-opacity duration-300 group-hover:opacity-40" />
              <Play className="relative z-10 h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
              <span className="relative z-10">Contact Me</span>
            </a>
          </div>
        </div>

        <div className="mt-14 md:mt-16">
          <AssistantStage />
        </div>

        <dl className="mx-auto mt-14 grid max-w-4xl grid-cols-2 gap-3 border-t border-neutral-200 pt-8 sm:grid-cols-3 lg:grid-cols-5">
          {STATS.map((s) => (
            <div
              key={s.v}
              className="group relative overflow-hidden rounded-xl border border-neutral-200/90 bg-white/60 px-3 py-4 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_10px_28px_-24px_rgba(0,0,0,0.5)] backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-neutral-400 hover:bg-white"
            >
              <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-neutral-300 to-transparent" />
              <dt className="font-serif text-xl tracking-tight text-neutral-950 md:text-2xl">
                {s.k}
              </dt>
              <dd className="mt-1 text-[10px] uppercase leading-relaxed tracking-[0.16em] text-neutral-400 transition-colors group-hover:text-neutral-600">
                {s.v}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
