import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Software } from "@/data/software";
import { SoftwareAnimation } from "@/components/tools/SoftwareAnimation";

export function ToolCard({ software }: { software: Software }) {
  const [active, setActive] = useState(false);

  return (
    <article
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
      onClick={() => setActive((v) => !v)}
      onFocus={() => setActive(true)}
      onBlur={() => setActive(false)}
      tabIndex={0}
      aria-label={`${software.name}, ${software.tag}`}
      className={cn(
        "group relative cursor-pointer overflow-hidden rounded-[20px] p-[1px] outline-none transition-all duration-500 [perspective:900px]",
        active
          ? "-translate-y-1 bg-gradient-to-b from-neutral-400/80 via-neutral-200 to-neutral-300/60 shadow-[0_32px_64px_-34px_rgba(0,0,0,0.6)]"
          : "bg-gradient-to-b from-neutral-200 via-neutral-200/60 to-neutral-300/40 shadow-[0_12px_30px_-26px_rgba(0,0,0,0.45)] hover:shadow-[0_22px_46px_-30px_rgba(0,0,0,0.5)]",
        "focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
      )}
    >
      {/* metallic plate surface */}
      <div
        className={cn(
          "relative overflow-hidden rounded-[19px] bg-gradient-to-b from-white via-neutral-50 to-neutral-100 p-4 transition-transform duration-500 ease-out [transform-style:preserve-3d]",
          active && "[transform:rotateX(1.6deg)_rotateY(-1.4deg)]"
        )}
      >
        <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />
        <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_-20%,rgba(255,255,255,0.95),transparent_60%)]" />
        <span className="pointer-events-none absolute -left-1/3 top-0 h-full w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-0 transition-all duration-700 group-hover:left-[110%] group-hover:opacity-100" />
        <span
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{ background: `radial-gradient(70% 60% at 22% 0%, ${software.accent}22, transparent 60%)` }}
        />

        {/* plate screws */}
        {["left-1.5 top-1.5", "right-1.5 top-1.5", "left-1.5 bottom-1.5", "right-1.5 bottom-1.5"].map((pos) => (
          <span
            key={pos}
            className={cn(
              "pointer-events-none absolute h-1 w-1 rounded-full bg-neutral-400/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]",
              pos
            )}
          />
        ))}

        <div className="relative flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* logo with depth + entry motion */}
            <span className="relative grid h-11 w-11 shrink-0 place-items-center [transform-style:preserve-3d]">
              <span
                className="pointer-events-none absolute inset-0 rounded-xl opacity-0 blur-md transition-opacity duration-500 group-hover:opacity-70"
                style={{ background: software.accent }}
              />
              <span
                className="pointer-events-none absolute -inset-[3px] rounded-[13px] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                style={{
                  background: `conic-gradient(from 0deg, transparent 0deg, ${software.accent} 90deg, transparent 180deg, transparent 360deg)`,
                  animation: active ? "spin 4s linear infinite" : "none",
                }}
              />
              <span
                className={cn(
                  "relative grid h-11 w-11 place-items-center overflow-hidden rounded-xl border border-white/25 text-sm font-bold shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_10px_20px_-12px_rgba(0,0,0,0.9)] transition-all duration-500 ease-out will-change-transform",
                  active ? "[transform:translateZ(20px)_rotate(-5deg)_scale(1.07)]" : "[transform:translateZ(0)]"
                )}
                style={{ background: software.color, color: software.accent }}
              >
                <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent" />
                <span className="pointer-events-none absolute -left-full top-0 h-full w-1/2 skew-x-[-20deg] bg-white/40 opacity-0 transition-all duration-700 group-hover:left-full group-hover:opacity-60" />
                <span className="relative">{software.short}</span>
              </span>
            </span>
            <div>
              <h3 className="text-sm font-semibold leading-tight tracking-tight text-neutral-950">
                {software.name}
              </h3>
              <p className="mt-0.5 text-[10px] uppercase tracking-[0.18em] text-neutral-400">
                {software.tag}
              </p>
            </div>
          </div>

          <span
            className={cn(
              "flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.16em] transition-colors",
              active ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-200 bg-white/80 text-neutral-400"
            )}
          >
            <span className={cn("h-1 w-1 rounded-full", active ? "bg-emerald-400" : "bg-neutral-300")} />
            {active ? "Live" : "Idle"}
          </span>
        </div>

        {/* animation well */}
        <div
          className={cn(
            "relative mt-4 h-28 overflow-hidden rounded-xl border transition-all duration-500",
            active
              ? "border-neutral-800 shadow-[inset_0_2px_14px_rgba(0,0,0,0.55)]"
              : "border-neutral-300/80 shadow-[inset_0_2px_10px_rgba(0,0,0,0.18)]"
          )}
        >
          <SoftwareAnimation kind={software.id} active={active} />
          <span className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-inset ring-white/10" />
        </div>

        <div className="relative mt-3 flex items-center justify-between">
          <span className="flex items-center gap-1">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-[3px] w-[3px] rounded-full bg-neutral-300 transition-colors"
                style={{ background: active ? software.accent : undefined }}
              />
            ))}
          </span>
          <span className="text-[9px] uppercase tracking-[0.2em] text-neutral-400">
            {active ? "Playing" : "Hover / tap to run"}
          </span>
        </div>
      </div>
    </article>
  );
}
