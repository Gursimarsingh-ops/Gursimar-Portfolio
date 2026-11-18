import { SKILLS } from "@/data/skills";
import { SkillCard } from "@/components/skills/SkillCard";
import { SkillAnimation } from "@/components/skills/SkillAnimation";

export function Skills() {
  return (
    <section id="skills" className="relative scroll-mt-24 overflow-hidden border-t border-neutral-200 bg-white py-24">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(70%_100%_at_50%_0%,#f4f4f5_0%,transparent_75%)]" />

      <div className="relative mx-auto max-w-6xl px-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-500">
              Capabilities
            </p>
            <h2 className="mt-3 font-serif text-4xl leading-[1.04] tracking-tight text-neutral-950 sm:text-5xl md:text-6xl">
              Skills <span className="text-neutral-300">&amp;</span> Services
            </h2>
            <span className="mt-5 block h-px w-24 bg-gradient-to-r from-neutral-900 via-neutral-400 to-transparent" />
          </div>
          <div className="flex items-center gap-2.5 md:pb-1">
            <span className="h-1.5 w-1.5 rounded-full bg-neutral-900" style={{ animation: "pulse 2.6s ease-in-out infinite" }} />
            <span className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">
              Hover to explore / Tap to explore
            </span>
          </div>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SKILLS.map((s, i) => (
            <SkillCard
              key={s.id}
              index={i + 1}
              title={s.title}
              desc={s.desc}
              animation={(active) => <SkillAnimation kind={s.id} active={active} />}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
