import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SkillCardProps {
  index: number;
  title: string;
  desc: string;
  animation: (active: boolean) => ReactNode;
}

export function SkillCard({ index, title, desc, animation }: SkillCardProps) {
  const [active, setActive] = useState(false);

  return (
    <article
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
      onClick={() => setActive((v) => !v)}
      className={cn(
        "group relative cursor-pointer overflow-hidden rounded-2xl border bg-white p-5 transition-all duration-300",
        active
          ? "-translate-y-1 border-neutral-900 shadow-lg"
          : "border-neutral-200 shadow-sm hover:border-neutral-400"
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-neutral-300/70 to-transparent" />
      <div className="flex items-start justify-between">
        <span
          className={cn(
            "grid h-9 w-9 place-items-center rounded-lg border text-xs font-semibold transition-colors",
            active
              ? "border-neutral-900 bg-neutral-900 text-white"
              : "border-neutral-200 bg-neutral-50 text-neutral-500"
          )}
        >
          {String(index).padStart(2, "0")}
        </span>
        <span
          className={cn(
            "text-[10px] uppercase tracking-[0.18em] transition-colors",
            active ? "text-neutral-900" : "text-neutral-400"
          )}
        >
          {active ? "Live" : "Hover"}
        </span>
      </div>

      <div
        className={cn(
          "mt-4 h-32 overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50 transition-all",
          active && "border-neutral-900"
        )}
      >
        {animation(active)}
      </div>

      <h3 className="mt-5 text-base font-semibold tracking-tight text-neutral-950">
        {title}
      </h3>
      <p className="mt-1.5 text-sm leading-relaxed text-neutral-500">{desc}</p>

      <p
        className={cn(
          "mt-4 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] transition-colors",
          active ? "text-neutral-900" : "text-neutral-400"
        )}
      >
        <span
          className={cn(
            "h-1 w-1 rounded-full transition-colors",
            active ? "bg-neutral-900" : "bg-neutral-300"
          )}
        />
        Hover to explore / Tap to explore
      </p>
    </article>
  );
}
