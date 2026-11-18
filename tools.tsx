import { SOFTWARE } from "@/data/software";
import { ToolCard } from "@/components/tools/ToolCard";

export function Tools() {
  return (
    <section id="tools" className="relative border-t border-neutral-200 bg-neutral-50 py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-500">
              Toolkit
            </p>
            <h2 className="mt-3 font-serif text-4xl tracking-tight text-neutral-950 md:text-5xl">
              Tools &amp; Software
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-neutral-500">
            The professional creative stack behind every edit, grade and design.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SOFTWARE.map((s) => (
            <ToolCard key={s.id} software={s} />
          ))}
        </div>
      </div>
    </section>
  );
}