import { SOFTWARE } from "@/data/software";
import { ToolCard } from "@/components/tools/ToolCard";

export function Tools() {
  return (
    <section id="tools" className="relative scroll-mt-24 overflow-hidden border-t border-neutral-200 bg-neutral-50 py-24">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(110%_90%_at_50%_-10%,#ffffff_0%,#f5f5f6_42%,#ececee_100%)]" />
      <div className="pointer-events-none absolute left-1/2 top-10 h-40 w-[34rem] -translate-x-1/2 rounded-full bg-white/80 blur-3xl" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-neutral-300 to-transparent" />

      <div className="relative mx-auto max-w-6xl px-6">
        <div className="relative overflow-hidden rounded-[26px] border border-neutral-200/90 bg-white/50 px-6 py-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_34px_80px_-64px_rgba(0,0,0,0.65)] backdrop-blur-xl sm:px-9 sm:py-10">
          <span className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />
          <span className="pointer-events-none absolute -left-16 -top-24 h-56 w-56 rounded-full bg-neutral-300/35 blur-[80px]" />
          <span className="pointer-events-none absolute -right-12 -bottom-20 h-52 w-52 rounded-full bg-neutral-200/60 blur-[80px]" />

          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.26em] text-neutral-500">
                Toolkit
              </p>
              <h2 className="mt-3 font-serif text-4xl leading-[1.05] tracking-tight text-neutral-950 sm:text-5xl md:text-[3.4rem]">
                Tools <span className="text-neutral-300">&amp;</span> Software
              </h2>
              <span className="mt-5 block h-px w-24 bg-gradient-to-r from-neutral-900 via-neutral-400 to-transparent" />
            </div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-neutral-400">
              Industry standard suite
            </p>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SOFTWARE.map((s) => (
            <ToolCard key={s.id} software={s} />
          ))}
        </div>
      </div>
    </section>
  );
}
