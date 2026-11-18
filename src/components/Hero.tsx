import { ArrowRight, Play } from "lucide-react";
import { AssistantStage } from "@/components/AssistantStage";

export function Hero() {
  return (
    <section id="top" className="relative overflow-hidden bg-white pt-32 pb-16 md:pt-40 md:pb-20">
      <div className="pointer-events-none absolute inset-0 opacity-[0.5] [background-image:linear-gradient(to_right,#e5e5e5_1px,transparent_1px),linear-gradient(to_bottom,#e5e5e5_1px,transparent_1px)] [background-size:72px_72px]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-full bg-gradient-to-b from-white via-white/60 to-white" />

      <div className="relative mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.22em] text-neutral-500">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            Available for collaborations
          </div>

          <h1 className="font-serif text-5xl leading-[0.95] tracking-tight text-neutral-950 sm:text-6xl md:text-7xl">
            GURSIMAR
            <br />
            <span className="text-neutral-400">SINGH</span>
          </h1>

          <p className="mt-6 text-lg font-medium tracking-tight text-neutral-800 md:text-xl">
            Video Editor &amp; Graphic Designer
          </p>

          <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-neutral-500 md:text-base">
            Creating cinematic visuals, powerful stories and impactful digital
            experiences through video editing, graphic design and motion.
          </p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
            <a
              href="#graphic"
              className="group inline-flex items-center gap-2 rounded-full bg-neutral-900 px-6 py-3 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-neutral-700 active:translate-y-0"
            >
              View My Work
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </a>
            <a
              href="#contact"
              className="inline-flex items-center gap-2 rounded-full border border-neutral-300 px-6 py-3 text-sm font-semibold text-neutral-800 transition-all hover:-translate-y-0.5 hover:border-neutral-900 hover:text-neutral-950 active:translate-y-0"
            >
              <Play className="h-4 w-4" />
              Contact Me
            </a>
          </div>
        </div>

        <div className="mt-14 md:mt-16">
          <AssistantStage />
        </div>

        <dl className="mx-auto mt-14 grid max-w-2xl grid-cols-3 gap-6 border-t border-neutral-200 pt-8">
          {[
            { k: "10+", v: "Specializations" },
            { k: "4K", v: "Cinematic Grade" },
            { k: "24/7", v: "Creative Flow" },
          ].map((s) => (
            <div key={s.v} className="text-center">
              <dt className="font-serif text-2xl text-neutral-950">{s.k}</dt>
              <dd className="mt-1 text-[11px] uppercase tracking-[0.16em] text-neutral-400">
                {s.v}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}