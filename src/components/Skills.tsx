import { SkillCard } from "@/components/SkillCard";
import { SkillAnimation } from "@/components/SkillAnimation";

const SKILLS = [
  { id: "video", title: "Video Editing", desc: "Narrative pacing, transitions and rhythm." },
  { id: "graphic", title: "Graphic Designing", desc: "Thumbnails, layouts and visual identity." },
  { id: "motion", title: "Motion Graphics", desc: "Animated shapes, type and kinetic motion." },
  { id: "color", title: "Color Grading", desc: "Flat footage into cinematic color." },
  { id: "cut", title: "Cutting Artist", desc: "Long-form into sharp short-form cuts." },
  { id: "gaming", title: "Gaming Content", desc: "High-energy edits and highlight reels." },
  { id: "corp", title: "Corporate Video", desc: "Clean, credible brand storytelling." },
  { id: "estate", title: "Real Estate Video", desc: "Spaces told with cinematic movement." },
  { id: "saas", title: "SaaS Animation", desc: "Product stories through motion design." },
] as const;

export function Skills() {
  return (
    <section id="skills" className="relative border-t border-neutral-200 bg-white py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-500">
              Capabilities
            </p>
            <h2 className="mt-3 font-serif text-4xl tracking-tight text-neutral-950 md:text-5xl">
              Skills &amp; Services
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-neutral-500">
            Nine disciplines, each with its own animated demonstration. Hover or
            tap a card to activate.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SKILLS.map((s, i) => (
            <SkillCard
              key={s.id}
              index={i + 1}
              title={s.title}
              desc={s.desc}
              animation={<SkillAnimation kind={s.id} />}
            />
          ))}
        </div>
      </div>
    </section>
  );
}