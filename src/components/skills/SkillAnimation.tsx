import { cn } from "@/lib/utils";
import type { SkillId } from "@/data/skills";

export function SkillAnimation({ kind, active = true }: { kind: SkillId; active?: boolean }) {
  const base = "h-full w-full";
  switch (kind) {
    case "video":
      return <VideoAnim active={active} className={base} />;
    case "graphic":
      return <GraphicAnim active={active} className={base} />;
    case "motion":
      return <MotionAnim active={active} className={base} />;
    case "color":
      return <ColorAnim active={active} className={base} />;
    case "cut":
      return <CutAnim active={active} className={base} />;
    case "gaming":
      return <GamingAnim active={active} className={base} />;
    case "corp":
      return <CorpAnim active={active} className={base} />;
    case "estate":
      return <EstateAnim active={active} className={base} />;
    case "saas":
      return <SaasAnim active={active} className={base} />;
  }
}

type AnimProps = { className?: string; active?: boolean };

function Frame({ children, className, active }: { children: React.ReactNode; className?: string; active?: boolean }) {
  return (
    <div className={cn("relative h-full w-full overflow-hidden", !active && "anim-paused", className)}>
      {children}
    </div>
  );
}

/**
 * Miniature presenter used by the corporate and property scenes.
 *
 * Built as a real limb chain: shoulder → upper arm → elbow → forearm → hand.
 * Each child hangs from its parent's joint, so rotation can never separate the
 * arm. The microphone is parented to the right hand, which keeps the grip
 * attached through every frame of the loop.
 */
function Presenter({
  className,
  suit = "#1c1917",
  shirt = "#fafaf9",
  skin = "#d6c2b0",
  hair = "#171412",
  micro = true,
}: {
  className?: string;
  suit?: string;
  shirt?: string;
  skin?: string;
  hair?: string;
  micro?: boolean;
}) {
  return (
    <div
      className={cn("relative h-[92px] w-[52px]", className)}
      style={{ animation: "presenter-breathe 5.4s ease-in-out infinite" }}
    >
      {/* contact shadow */}
      <span className="absolute bottom-0 left-[9px] h-[5px] w-[34px] rounded-full bg-black/20 blur-[2px]" />

      {/* legs, shoes */}
      <span className="absolute bottom-[3px] left-[19px] h-[29px] w-[7px] rounded-b-[2px]" style={{ background: suit }} />
      <span className="absolute bottom-[3px] left-[26px] h-[29px] w-[7px] rounded-b-[2px]" style={{ background: suit }} />
      <span className="absolute bottom-0 left-[15px] h-[4px] w-[12px] rounded-[2px] bg-neutral-900" />
      <span className="absolute bottom-0 left-[26px] h-[4px] w-[12px] rounded-[2px] bg-neutral-900" />

      {/* torso */}
      <span
        className="absolute left-[12px] top-[30px] h-[31px] w-[28px] rounded-t-[9px]"
        style={{ background: suit, clipPath: "polygon(4% 0, 96% 0, 100% 100%, 0 100%)" }}
      />
      {/* shirt + lapels + tie */}
      <span className="absolute left-[24px] top-[30px] h-[13px] w-[4px]" style={{ background: shirt }} />
      <span
        className="absolute left-[18px] top-[31px] h-[13px] w-[7px] rounded-[1px] bg-black/15"
        style={{ clipPath: "polygon(0 0, 100% 0, 30% 100%, 0 82%)" }}
      />
      <span
        className="absolute left-[31px] top-[31px] h-[13px] w-[7px] rounded-[1px] bg-black/15"
        style={{ clipPath: "polygon(0 0, 100% 0, 100% 82%, 70% 100%)" }}
      />
      <span className="absolute left-[25px] top-[33px] h-[9px] w-[2px] bg-neutral-900/80" />

      {/* neck + head */}
      <span className="absolute left-[23px] top-[25px] h-[7px] w-[6px] rounded-t-[1px]" style={{ background: skin }} />
      <span
        className="absolute left-[18px] top-[9px] h-[17px] w-[16px] rounded-[45%]"
        style={{ background: skin, transformOrigin: "50% 90%", animation: "nod 4.2s ease-in-out infinite" }}
      >
        <span className="absolute inset-x-[-1px] top-[-3px] h-[8px] rounded-t-[9px]" style={{ background: hair }} />
        <span className="absolute left-[3px] top-[9px] h-[2px] w-[2px] rounded-full bg-neutral-900/60" />
        <span className="absolute right-[3px] top-[9px] h-[2px] w-[2px] rounded-full bg-neutral-900/60" />
        <span className="absolute bottom-[2px] left-1/2 h-[2px] w-[5px] -translate-x-1/2 rounded-full bg-neutral-900/25" />
      </span>

      {/* free arm — shoulder, upper arm, elbow, forearm, hand */}
      <span
        className="absolute left-[10px] top-[33px] h-[20px] w-[7px] rounded-full"
        style={{ background: suit, transformOrigin: "top center", animation: "gesture-a 3.6s ease-in-out infinite" }}
      >
        <span className="absolute left-0 top-[17px] h-[7px] w-[7px] rounded-full" style={{ background: suit }} />
        <span
          className="absolute left-[1px] top-[16px] h-[18px] w-[5px] rounded-full"
          style={{ background: suit, transformOrigin: "top center", animation: "gesture-fore-a 3.6s ease-in-out infinite" }}
        >
          <span className="absolute left-[-1px] top-[15px] h-[7px] w-[7px] rounded-full" style={{ background: skin }} />
          <span className="absolute left-[2px] top-[18px] h-[3px] w-[1px] rounded-full bg-neutral-900/25" />
          <span className="absolute left-[4px] top-[18px] h-[3px] w-[1px] rounded-full bg-neutral-900/25" />
        </span>
      </span>

      {/* microphone arm — bent, static, with the mic parented to the hand */}
      <span className="absolute left-[34px] top-[32px] h-[19px] w-[7px] rounded-full" style={{ background: suit }} />
      <span className="absolute left-[34px] top-[46px] h-[6px] w-[7px] rounded-full" style={{ background: suit }} />
      <span className="absolute left-[21px] top-[46px] h-[6px] w-[16px] rounded-full" style={{ background: suit }} />
      <span className="absolute left-[19px] top-[43px] h-[8px] w-[8px] rounded-[45%]" style={{ background: skin }} />
      {micro && (
        <span className="absolute left-[21px] top-[26px] h-[19px] w-[4px] origin-bottom rotate-[10deg] rounded-full bg-neutral-800 shadow-sm">
          <span className="absolute -top-[7px] left-[-2px] h-[9px] w-[8px] rounded-full bg-gradient-to-b from-neutral-500 to-neutral-800" />
          <span className="absolute -top-[6px] left-[-1px] h-[3px] w-[2px] rounded-full bg-white/40" />
        </span>
      )}
      <span className="absolute left-[21px] top-[58px] h-[2px] w-[4px] rounded-full bg-neutral-900/30" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 01 · Video editing — real editing application                        */
/* ------------------------------------------------------------------ */
function VideoAnim({ className, active }: AnimProps) {
  return (
    <Frame className={className} active={active}>
      <div className="absolute inset-0 bg-[radial-gradient(120%_120%_at_50%_0%,#1b2230_0%,#0d1117_55%,#05070a_100%)]" />

      {/* program monitor */}
      <div className="absolute left-2.5 top-2.5 w-[104px] overflow-hidden rounded-[3px] border border-white/15 bg-black shadow-lg">
        <div className="relative h-[44px] overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-sky-400/70 via-indigo-500/50 to-rose-500/30" />
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent" />
          <span className="absolute left-1 top-1 h-[3px] w-6 rounded-full bg-white/70" />
          <span className="absolute left-1 top-2.5 h-[2px] w-9 rounded-full bg-white/35" />
          <span className="absolute right-1 top-1 rounded-[2px] bg-black/60 px-1 text-[5px] font-medium tracking-wider text-white/80">
            00:04:12:06
          </span>
          <span className="absolute bottom-1 left-1 flex items-center gap-0.5">
            <span className="h-1 w-1 rounded-full bg-red-500" />
            <span className="text-[5px] font-semibold uppercase tracking-[0.16em] text-white/80">Program</span>
          </span>
          <span className="absolute inset-0 bg-white/10" style={{ animation: "flash 4s ease-in-out infinite" }} />
        </div>
      </div>

      {/* media bin */}
      <div className="absolute right-2 top-2.5 w-[46px] rounded-[3px] border border-white/10 bg-white/[0.05] p-1">
        <span className="mb-1 block text-[5px] font-semibold uppercase tracking-[0.16em] text-white/45">Bin</span>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="mb-0.5 flex items-center gap-1 rounded-[2px] bg-white/[0.07] p-0.5"
            style={{ animation: `clip-in 3.4s ease-out ${i * 0.25}s infinite` }}
          >
            <span
              className={cn(
                "h-2.5 w-4 rounded-[1px] bg-gradient-to-br",
                i === 0 ? "from-sky-400/70 to-indigo-500/50" : i === 1 ? "from-amber-300/70 to-rose-400/40" : "from-emerald-300/60 to-teal-500/40"
              )}
            />
            <span className="h-[2px] flex-1 rounded-full bg-white/25" />
          </div>
        ))}
      </div>

      {/* trim tool readout */}
      <div className="absolute right-2 top-[58px] flex items-center gap-1 rounded-[2px] border border-white/10 bg-black/50 px-1 py-0.5">
        <span className="text-[5px] uppercase tracking-[0.14em] text-white/40">Ripple</span>
        <span className="h-1.5 w-[2px] rounded-full bg-white/70" />
        <span className="text-[5px] uppercase tracking-[0.14em] text-white/60">Trim</span>
      </div>

      {/* timeline */}
      <div className="absolute inset-x-2 bottom-1.5 rounded-[3px] border border-white/10 bg-black/60 p-1">
        <div className="mb-0.5 flex items-center justify-between">
          {Array.from({ length: 22 }).map((_, i) => (
            <span key={i} className={cn("w-px", i % 5 === 0 ? "h-1 bg-white/35" : "h-[2px] bg-white/15")} />
          ))}
        </div>

        {/* V2 effects track */}
        <div className="mb-0.5 flex items-center gap-1">
          <span className="w-3 text-[5px] uppercase tracking-[0.1em] text-white/30">V2</span>
          <div className="relative h-1.5 flex-1 overflow-hidden rounded-[1px] bg-white/[0.05]">
            <span
              className="absolute left-[38%] top-0 h-full w-[26%] rounded-[1px] bg-gradient-to-b from-fuchsia-300/80 to-fuchsia-500/60"
              style={{ animation: "clip-in 4s ease-out infinite" }}
            />
          </div>
        </div>

        {/* V1 clips: selected, trimmed, moved */}
        <div className="mb-0.5 flex items-center gap-1">
          <span className="w-3 text-[5px] uppercase tracking-[0.1em] text-white/40">V1</span>
          <div className="relative flex h-3 flex-1 items-center gap-[2px] overflow-hidden rounded-[1px] bg-white/[0.05] px-[2px]">
            <span className="h-full rounded-[1px] border border-white/25 bg-sky-500/60" style={{ width: "24%", animation: "trim 5s ease-in-out infinite" }} />
            <span className="h-full w-[18%] rounded-[1px] bg-indigo-500/60" />
            <span
              className="h-full w-[14%] rounded-[1px] border border-dashed border-white/50 bg-white/10"
              style={{ animation: "ripple-move 5s ease-in-out infinite" }}
            />
            <span className="h-full flex-1 rounded-[1px] bg-sky-500/40" />
            <span className="absolute -top-1.5 left-[24%] h-2 w-2 rotate-45 rounded-[1px] border border-white bg-sky-300" />
          </div>
        </div>

        {/* A1 audio */}
        <div className="mb-0.5 flex items-center gap-1">
          <span className="w-3 text-[5px] uppercase tracking-[0.1em] text-white/30">A1</span>
          <div className="relative flex h-1.5 flex-1 items-center gap-[1px] overflow-hidden rounded-[1px] bg-white/[0.05] px-1">
            {Array.from({ length: 30 }).map((_, i) => (
              <span
                key={i}
                className="w-[1.5px] flex-none rounded-full bg-emerald-300/60"
                style={{
                  height: `${35 + ((i * 37) % 55)}%`,
                  transformOrigin: "bottom",
                  animation: `bar ${1 + (i % 4) * 0.1}s ease-in-out ${i * 0.03}s infinite`,
                }}
              />
            ))}
          </div>
        </div>

        {/* playhead */}
        <span
          className="absolute bottom-0 top-1 w-px bg-red-400 shadow-[0_0_6px_rgba(248,113,113,0.9)]"
          style={{ animation: "sweep 4.4s linear infinite", left: "6%" }}
        />
      </div>
      {active && <span className="sr-only">Video editing timeline demonstration</span>}
    </Frame>
  );
}

/* ------------------------------------------------------------------ */
/* 02 · Graphic design — designer assembling a layout                   */
/* ------------------------------------------------------------------ */
function GraphicAnim({ className, active }: AnimProps) {
  return (
    <Frame className={className} active={active}>
      <div className="absolute inset-0 bg-gradient-to-b from-neutral-200 via-neutral-100 to-neutral-300" />
      <div className="absolute inset-0 bg-[radial-gradient(90%_70%_at_50%_0%,rgba(255,255,255,0.9),transparent_70%)]" />

      {/* monitor */}
      <div className="absolute left-1/2 top-2 h-[74px] w-[122px] -translate-x-1/2 rounded-[3px] border border-neutral-500 bg-gradient-to-b from-neutral-800 to-neutral-900 p-1 shadow-[0_10px_24px_-14px_rgba(0,0,0,0.6)]">
        <div className="relative h-full w-full overflow-hidden rounded-[1px] bg-white">
          {/* canvas guides */}
          <div className="absolute inset-0 opacity-[0.5] [background-image:linear-gradient(to_right,#e5e5e5_1px,transparent_1px),linear-gradient(to_bottom,#e5e5e5_1px,transparent_1px)] [background-size:9px_9px]" />

          {/* assembling artwork */}
          <div className="absolute inset-1.5 overflow-hidden rounded-[1px] bg-gradient-to-br from-amber-50 to-neutral-100">
            <span
              className="absolute left-1.5 top-1.5 h-6 w-6 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-sm"
              style={{ animation: "clip-in 4s ease-out infinite" }}
            />
            <span
              className="absolute right-1.5 top-2 h-7 w-5 rotate-6 rounded-[1px] bg-gradient-to-br from-sky-400/80 to-indigo-500/70"
              style={{ animation: "card-in 4s ease-out 0.3s infinite" }}
            />
            <span
              className="absolute bottom-4 left-1.5 h-[3px] w-12 rounded-full bg-neutral-900"
              style={{ animation: "wipe 4s ease-in-out infinite" }}
            />
            <span
              className="absolute bottom-2 left-1.5 h-[2px] w-9 rounded-full bg-neutral-400"
              style={{ animation: "wipe 4s ease-in-out 0.25s infinite" }}
            />
            <span
              className="absolute bottom-6 right-2 h-5 w-5 rounded-[2px] bg-gradient-to-br from-rose-400/80 to-fuchsia-500/60"
              style={{ animation: "pop 3.4s ease-in-out 0.4s infinite" }}
            />
            {/* selection outline */}
            <span
              className="absolute left-1 top-1 h-7 w-7 border border-dashed border-neutral-900/70"
              style={{ animation: "fade 2.6s ease-in-out infinite" }}
            />
            {/* finished badge */}
            <span
              className="absolute bottom-1 right-1 flex items-center gap-0.5 rounded-[2px] bg-neutral-900 px-1 py-[1px] text-[5px] font-semibold uppercase tracking-[0.14em] text-white"
              style={{ animation: "badge-pop 4s ease-out infinite" }}
            >
              Export ✓
            </span>
          </div>
        </div>
        <span className="absolute -bottom-[3px] left-1/2 h-[3px] w-8 -translate-x-1/2 rounded-b-sm bg-neutral-700" />
      </div>

      {/* layers panel */}
      <div className="absolute right-2 top-3 w-[38px] rounded-[2px] border border-neutral-300 bg-white/90 p-1 shadow-sm">
        <span className="mb-0.5 block text-[5px] uppercase tracking-[0.12em] text-neutral-400">Layers</span>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="mb-0.5 flex items-center gap-0.5 rounded-[1px] px-0.5 py-[1px]"
            style={{
              background: i === 0 ? "#171717" : "#f5f5f5",
              animation: `clip-in 3.6s ease-out ${i * 0.18}s infinite`,
            }}
          >
            <span className={cn("h-1 w-1 rounded-[1px]", i === 0 ? "bg-white/70" : "bg-neutral-400")} />
            <span className={cn("h-[1.5px] flex-1 rounded-full", i === 0 ? "bg-white/50" : "bg-neutral-300")} />
          </div>
        ))}
      </div>

      {/* tool strip */}
      <div className="absolute left-2 top-3 flex flex-col gap-1 rounded-[2px] border border-neutral-300 bg-white/90 p-1 shadow-sm">
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className={cn("h-1.5 w-1.5 rounded-[1px]", i === 1 ? "bg-neutral-900" : "bg-neutral-300")}
            style={{ animation: `fade 3s ease-in-out ${i * 0.15}s infinite` }}
          />
        ))}
      </div>

      {/* designer at the desk */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2">
        <div className="relative h-[26px] w-[34px]">
          <span className="absolute bottom-0 left-1/2 h-[13px] w-[30px] -translate-x-1/2 rounded-t-[10px] bg-neutral-800" />
          <span className="absolute bottom-[11px] left-1/2 h-[9px] w-[9px] -translate-x-1/2 rounded-full bg-gradient-to-b from-neutral-700 to-neutral-900" />
          <span
            className="absolute bottom-[4px] right-[2px] h-[10px] w-[3px] rounded-full bg-neutral-800"
            style={{ transformOrigin: "top center", animation: "gesture-a 1.4s ease-in-out infinite" }}
          />
        </div>
      </div>

      {/* desk */}
      <div className="absolute inset-x-0 bottom-0 h-[14px] bg-gradient-to-t from-neutral-400 to-neutral-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]" />
      <div className="absolute bottom-[13px] left-1/2 h-[5px] w-[64px] -translate-x-1/2 rounded-[1px] border border-neutral-400 bg-neutral-200" />
      <div className="absolute bottom-[11px] right-5 h-[3px] w-3 rounded-full bg-neutral-400" />

      <div className="absolute bottom-[2px] left-2 text-[5px] uppercase tracking-[0.2em] text-neutral-500">
        Artboard · 1080 × 1350
      </div>
      {active && <span className="sr-only">Graphic designer assembling a layout</span>}
    </Frame>
  );
}

/* ------------------------------------------------------------------ */
/* 03 · Motion graphics — logo build sequence                           */
/* ------------------------------------------------------------------ */
function MotionAnim({ className, active }: AnimProps) {
  return (
    <Frame className={className} active={active}>
      <div className="absolute inset-0 bg-[radial-gradient(120%_120%_at_50%_0%,#2a2233_0%,#141019_55%,#060409_100%)]" />
      <div className="absolute inset-0 opacity-[0.14] [background-image:linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] [background-size:12px_12px]" />

      {/* stage light */}
      <div className="absolute left-1/2 top-0 h-24 w-40 -translate-x-1/2 rounded-full bg-fuchsia-300/20 blur-2xl" style={{ animation: "stage-glow 4s ease-in-out infinite" }} />

      {/* orbiting guide */}
      <span className="absolute left-1/2 top-[44px] h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-white/20" style={{ animation: "spin 14s linear infinite" }} />

      {/* logo mark sequence */}
      <div className="absolute left-1/2 top-[44px] h-10 w-10 -translate-x-1/2 -translate-y-1/2">
        {/* mark A */}
        <span
          className="absolute inset-0 grid place-items-center rounded-[6px] bg-gradient-to-br from-white to-neutral-300 text-[13px] font-black text-neutral-900 shadow-[0_8px_18px_-8px_rgba(0,0,0,0.9)]"
          style={{ animation: "logo-a 6s ease-in-out infinite" }}
        >
          A
        </span>
        {/* mark B */}
        <span
          className="absolute inset-0 grid place-items-center rounded-full border-2 border-fuchsia-200/80 bg-white/5 text-[12px] font-black text-fuchsia-100"
          style={{ animation: "logo-b 6s ease-in-out infinite" }}
        >
          V
        </span>
        {/* final composite */}
        <span
          className="absolute inset-0 grid place-items-center bg-gradient-to-br from-white via-neutral-100 to-neutral-300 shadow-[0_10px_24px_-10px_rgba(255,255,255,0.5)]"
          style={{
            animation: "logo-final 6s ease-in-out infinite",
            clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
          }}
        >
          <span className="text-[11px] font-black tracking-tight text-neutral-950">GS</span>
        </span>
      </div>

      {/* wordmark resolving underneath */}
      <span
        className="absolute left-1/2 top-[70px] -translate-x-1/2 whitespace-nowrap text-[7px] font-semibold uppercase tracking-[0.34em] text-white/90"
        style={{ animation: "logo-final 6s ease-in-out infinite" }}
      >
        GurSimar
      </span>

      {/* keyframe timeline */}
      <div className="absolute inset-x-3 bottom-2 rounded-[2px] border border-white/10 bg-black/45 px-1.5 py-1 backdrop-blur">
        <div className="relative h-[6px]">
          <span className="absolute inset-y-0 left-0 right-0 top-1/2 h-px bg-white/15" />
          {[8, 30, 52, 74, 92].map((left, i) => (
            <span
              key={i}
              className="absolute top-1/2 h-[5px] w-[5px] -translate-y-1/2 rotate-45 rounded-[1px] border border-fuchsia-200/70 bg-fuchsia-300/80"
              style={{ left: `${left}%`, animation: `fade 2.4s ease-in-out ${i * 0.2}s infinite` }}
            />
          ))}
          <span
            className="absolute -top-[1px] h-[8px] w-px bg-white/80"
            style={{ animation: "sweep 3.4s linear infinite" }}
          />
        </div>
        <div className="mt-0.5 flex items-center justify-between text-[5px] uppercase tracking-[0.16em] text-white/35">
          <span>Logo build</span>
          <span>00:00 — 00:06</span>
        </div>
      </div>
      <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-1.5 py-0.5">
        <span className="h-1 w-1 rounded-full bg-fuchsia-300" style={{ animation: "pulse 1.6s ease-in-out infinite" }} />
        <span className="text-[5px] uppercase tracking-[0.16em] text-white/60">Motion</span>
      </div>
      {active && <span className="sr-only">Logo morph animation sequence</span>}
    </Frame>
  );
}

/* ------------------------------------------------------------------ */
/* 04 · Color grading — before / after on one frame                     */
/* ------------------------------------------------------------------ */
function Footage({ graded }: { graded?: boolean }) {
  return (
    <div className={cn("absolute inset-0 overflow-hidden", graded ? "bg-gradient-to-b from-[#2c3c52] via-[#8a5a3c] to-[#12181f]" : "bg-gradient-to-b from-[#c9c9c4] via-[#9b9b94] to-[#6f6f6a]")}>
      {/* sun / highlight */}
      <span
        className={cn(
          "absolute right-6 top-4 h-6 w-6 rounded-full blur-[2px]",
          graded ? "bg-orange-300/90 shadow-[0_0_18px_rgba(251,146,60,0.7)]" : "bg-white/50"
        )}
      />
      {/* horizon hills */}
      <span className={cn("absolute bottom-3 left-0 right-0 h-7 [clip-path:polygon(0_100%,18%_45%,40%_70%,62%_30%,84%_62%,100%_40%,100%_100%)]", graded ? "bg-[#0f1720]" : "bg-[#5f5f5b]")} />
      {/* foreground silhouette */}
      <span className={cn("absolute bottom-0 left-3 h-8 w-3 rounded-t-full", graded ? "bg-[#0b1016]" : "bg-[#4b4b47]")} />
      <span className={cn("absolute bottom-0 left-[22px] h-5 w-2 rounded-t-full", graded ? "bg-[#0b1016]" : "bg-[#4b4b47]")} />
      {/* light rays */}
      <span className={cn("absolute inset-0", graded ? "bg-[radial-gradient(70%_60%_at_78%_18%,rgba(251,191,36,0.35),transparent_70%)]" : "bg-[radial-gradient(70%_60%_at_78%_18%,rgba(255,255,255,0.25),transparent_70%)]")} />
      {graded && <span className="absolute inset-0 bg-[linear-gradient(120deg,rgba(56,189,248,0.18),transparent_45%,rgba(244,114,182,0.12))] mix-blend-screen" />}
    </div>
  );
}

function ColorAnim({ className, active }: AnimProps) {
  return (
    <Frame className={className} active={active}>
      <div className="absolute inset-0 bg-neutral-950" />

      <div className="absolute inset-x-2 top-2 h-[74px] overflow-hidden rounded-[3px] border border-white/15">
        <Footage />
        <div className="absolute inset-0" style={{ animation: "grade-sweep 6s ease-in-out infinite" }}>
          <Footage graded />
        </div>

        {/* split divider */}
        <span
          className="absolute inset-y-0 w-px bg-white/90 shadow-[0_0_10px_rgba(255,255,255,0.8)]"
          style={{ animation: "divider-sweep 6s ease-in-out infinite" }}
        >
          <span className="absolute left-1/2 top-1/2 grid h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/80 bg-black/50 backdrop-blur">
            <span className="text-[5px] font-bold text-white">↔</span>
          </span>
        </span>

        <span className="absolute left-1.5 top-1.5 rounded-[2px] bg-black/55 px-1 py-[1px] text-[5px] font-semibold uppercase tracking-[0.16em] text-white/80 backdrop-blur">
          Before
        </span>
        <span className="absolute right-1.5 top-1.5 rounded-[2px] bg-black/55 px-1 py-[1px] text-[5px] font-semibold uppercase tracking-[0.16em] text-amber-200/90 backdrop-blur">
          Graded
        </span>

        {/* scopes */}
        <div className="absolute bottom-1.5 right-1.5 flex h-5 items-end gap-[1.5px] rounded-[2px] border border-white/20 bg-black/45 px-1 py-0.5 backdrop-blur">
          {[3, 6, 9, 12, 8, 14, 10, 7, 12, 6, 9, 4].map((h, i) => (
            <span
              key={i}
              className="w-[1.5px] rounded-[1px] bg-amber-200/80"
              style={{
                height: h,
                transformOrigin: "bottom",
                animation: `bar ${1.1 + (i % 3) * 0.2}s ease-in-out ${i * 0.05}s infinite`,
              }}
            />
          ))}
        </div>
        <span className="absolute bottom-1.5 left-1.5 rounded-[2px] border border-white/15 bg-black/45 px-1 py-[1px] text-[5px] uppercase tracking-[0.16em] text-white/60 backdrop-blur">
          LUT · Kodak 2383
        </span>
      </div>

      {/* wheels + sliders */}
      <div className="absolute inset-x-2 bottom-1.5 flex items-center gap-1.5">
        {["#f97316", "#38bdf8", "#4ade80"].map((c, i) => (
          <span key={c} className="relative grid h-4 w-4 place-items-center rounded-full border border-white/15 bg-neutral-900">
            <span className="h-2.5 w-2.5 rounded-full border" style={{ borderColor: c, animation: `spin ${6 + i * 2}s linear infinite` }} />
            <span className="absolute h-[2px] w-[2px] rounded-full" style={{ background: c }} />
          </span>
        ))}
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-1">
            <span className="text-[5px] uppercase tracking-[0.14em] text-white/35">Lift</span>
            <span className="h-[3px] flex-1 rounded-full bg-white/10">
              <span className="block h-full w-1/3 rounded-full bg-gradient-to-r from-orange-400 to-amber-300" style={{ animation: "gradebar 5s ease-in-out infinite" }} />
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[5px] uppercase tracking-[0.14em] text-white/35">Gain</span>
            <span className="h-[3px] flex-1 rounded-full bg-white/10">
              <span className="block h-full w-1/2 rounded-full bg-gradient-to-r from-sky-400 to-cyan-300" style={{ animation: "gradebar 5s ease-in-out 0.4s infinite" }} />
            </span>
          </div>
        </div>
      </div>
      {active && <span className="sr-only">Color grading before and after</span>}
    </Frame>
  );
}

/* ------------------------------------------------------------------ */
/* 05 · Cutting artist — split, remove, ripple                          */
/* ------------------------------------------------------------------ */
function CutAnim({ className, active }: AnimProps) {
  return (
    <Frame className={className} active={active}>
      <div className="absolute inset-0 bg-[radial-gradient(120%_120%_at_20%_0%,#20242c_0%,#111419_55%,#06080b_100%)]" />

      {/* source monitor */}
      <div className="absolute left-2.5 top-2.5 w-[78px] overflow-hidden rounded-[3px] border border-white/15 bg-black">
        <div className="relative h-[34px]">
          <div className="absolute inset-0 bg-gradient-to-br from-teal-400/50 via-sky-600/40 to-neutral-900" />
          <span className="absolute left-1 top-1 h-[2px] w-5 rounded-full bg-white/70" />
          <span className="absolute bottom-1 left-1 text-[5px] tracking-wider text-white/70">IN 00:12:04</span>
          <span className="absolute inset-0 bg-white/10" style={{ animation: "flash 3.6s ease-in-out infinite" }} />
        </div>
      </div>

      {/* razor tool */}
      <div className="absolute right-2 top-2.5 flex items-center gap-1 rounded-[2px] border border-white/15 bg-white/[0.06] px-1.5 py-0.5">
        <span className="h-2 w-[2px] rounded-full bg-white/80" />
        <span className="text-[5px] font-semibold uppercase tracking-[0.16em] text-white/60">Razor</span>
      </div>
      <div className="absolute right-2 top-[30px] w-[70px] rounded-[2px] border border-white/10 bg-white/[0.04] p-1">
        <span className="mb-0.5 block text-[5px] uppercase tracking-[0.14em] text-white/35">Clip · 04</span>
        <span className="block h-[2px] w-full rounded-full bg-white/20" />
        <span className="mt-1 block h-[2px] w-2/3 rounded-full bg-white/10" />
      </div>

      {/* timeline */}
      <div className="absolute inset-x-2 bottom-2 rounded-[3px] border border-white/10 bg-black/60 p-1">
        <div className="mb-1 flex items-center justify-between text-[5px] uppercase tracking-[0.14em] text-white/30">
          <span>Sequence 01</span>
          <span>Ripple delete</span>
        </div>
        <div className="relative mb-1 flex h-4 items-stretch gap-[2px] overflow-hidden rounded-[1px] bg-white/[0.05] p-[2px]">
          <span className="w-[20%] rounded-[1px] bg-gradient-to-b from-sky-400/70 to-sky-600/60" />
          <span
            className="w-[18%] rounded-[1px] border border-red-400/70 bg-gradient-to-b from-red-500/40 to-red-700/40"
            style={{ transformOrigin: "right", animation: "cut-away 5.5s ease-in-out infinite" }}
          />
          <span className="w-[22%] rounded-[1px] bg-gradient-to-b from-indigo-400/70 to-indigo-600/60" style={{ animation: "ripple-move 5.5s ease-in-out infinite" }} />
          <span className="flex-1 rounded-[1px] bg-gradient-to-b from-sky-400/50 to-sky-700/50" style={{ animation: "ripple-move 5.5s ease-in-out infinite" }} />
          <span
            className="absolute inset-y-0 w-px bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.9)]"
            style={{ animation: "sweep 3.2s linear infinite", left: "6%" }}
          />
          <span
            className="absolute -top-1 h-2 w-2 rotate-45 bg-red-400"
            style={{ animation: "sweep 3.2s linear infinite", left: "6%" }}
          />
        </div>
        <div className="relative flex h-2 items-center gap-[1px] overflow-hidden rounded-[1px] bg-white/[0.05] px-1">
          {Array.from({ length: 26 }).map((_, i) => (
            <span
              key={i}
              className="w-[1.5px] flex-none rounded-full bg-teal-300/60"
              style={{
                height: `${30 + ((i * 41) % 60)}%`,
                transformOrigin: "bottom",
                animation: `bar ${1 + (i % 3) * 0.12}s ease-in-out ${i * 0.04}s infinite`,
              }}
            />
          ))}
        </div>
        <div className="mt-1 flex items-center justify-between text-[5px] uppercase tracking-[0.14em] text-white/25">
          <span>00:00:12</span>
          <span>00:00:19</span>
          <span className="text-white/50">Ripple · 12 frames</span>
        </div>
      </div>
      {active && <span className="sr-only">Cutting workflow rip delete demonstration</span>}
    </Frame>
  );
}

/* ------------------------------------------------------------------ */
/* 06 · Gaming content — gameplay edit                                  */
/* ------------------------------------------------------------------ */
function GamingAnim({ className, active }: AnimProps) {
  return (
    <Frame className={className} active={active}>
      <div className="absolute inset-0 bg-[radial-gradient(120%_120%_at_80%_0%,#241b4d_0%,#0f0d22_55%,#05040a_100%)]" />

      {/* gameplay viewport */}
      <div className="absolute inset-x-2 top-2 h-[72px] overflow-hidden rounded-[3px] border border-white/15 bg-neutral-950">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/40 via-purple-600/30 to-neutral-950" />
        <div className="absolute inset-0 opacity-[0.18] [background-image:linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] [background-size:14px_14px]" />
        <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/80 to-transparent" />
        <span className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/60">
          <span className="absolute left-1/2 top-1/2 h-[1px] w-4 -translate-x-1/2 -translate-y-1/2 bg-white/50" />
          <span className="absolute left-1/2 top-1/2 h-4 w-[1px] -translate-x-1/2 -translate-y-1/2 bg-white/50" />
        </span>
        <span className="absolute inset-0 bg-white/20" style={{ animation: "flash 2.2s ease-in-out infinite" }} />

        {/* health + ammo */}
        <div className="absolute bottom-1.5 left-1.5 w-14">
          <span className="block h-[3px] w-full rounded-full bg-white/20">
            <span className="block h-full w-2/3 rounded-full bg-emerald-400" style={{ animation: "gradebar 3s ease-in-out infinite" }} />
          </span>
          <span className="mt-0.5 block h-[3px] w-3/4 rounded-full bg-white/20">
            <span className="block h-full w-1/2 rounded-full bg-sky-400" />
          </span>
        </div>
        <span className="absolute bottom-1.5 right-1.5 text-[6px] font-bold tracking-wider text-white/80">24 / 90</span>
        <span className="absolute right-1.5 top-1.5 flex items-center gap-0.5 rounded-[2px] bg-black/50 px-1 py-[1px] backdrop-blur">
          <span className="h-1 w-1 rounded-full bg-red-500" style={{ animation: "pulse 1.2s ease-in-out infinite" }} />
          <span className="text-[5px] font-bold uppercase tracking-[0.16em] text-white">Live</span>
        </span>

        {/* kill feed */}
        <div className="absolute right-1.5 top-6 space-y-0.5">
          {[0, 1].map((i) => (
            <span
              key={i}
              className="block rounded-[1px] bg-black/50 px-1 py-[1px] text-[5px] font-medium tracking-wide text-white/85 backdrop-blur"
              style={{ animation: `clip-in 2.6s ease-out ${i * 0.6}s infinite` }}
            >
              xblade ▸ headshot
            </span>
          ))}
        </div>

        {/* final edit lower third */}
        <span
          className="absolute inset-x-1.5 bottom-[18px] flex items-center gap-1 rounded-[1px] bg-black/60 px-1 py-[2px] backdrop-blur"
          style={{ animation: "badge-pop 4s ease-out infinite" }}
        >
          <span className="h-[2px] w-4 rounded-full bg-rose-400" />
          <span className="text-[5px] font-semibold uppercase tracking-[0.18em] text-white/85">Highlight Reel</span>
        </span>
      </div>

      {/* timeline cuts */}
      <div className="absolute inset-x-2 bottom-2 rounded-[2px] border border-white/10 bg-black/55 p-1">
        <div className="flex h-2.5 items-stretch gap-[1px] overflow-hidden rounded-[1px] bg-white/[0.05] p-[1px]">
          {[14, 8, 18, 10, 22, 12, 16].map((w, i) => (
            <span
              key={i}
              className={cn(
                "rounded-[1px]",
                i % 3 === 0 ? "bg-gradient-to-b from-purple-400/80 to-fuchsia-600/60" : "bg-gradient-to-b from-indigo-400/70 to-indigo-700/60"
              )}
              style={{ width: `${w}%`, animation: `pop 1.6s ease-in-out ${i * 0.1}s infinite` }}
            />
          ))}
        </div>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-[5px] uppercase tracking-[0.16em] text-white/35">Cut on beat</span>
          <span className="flex items-center gap-1">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-[3px] w-[3px] rounded-full bg-fuchsia-300"
                style={{ animation: `bar 0.9s ease-in-out ${i * 0.12}s infinite` }}
              />
            ))}
          </span>
          <span className="text-[5px] uppercase tracking-[0.16em] text-white/50">120 BPM</span>
        </div>
      </div>
      {active && <span className="sr-only">Gaming video edit demonstration</span>}
    </Frame>
  );
}

/* ------------------------------------------------------------------ */
/* 07 · Corporate video                                                */
/* ------------------------------------------------------------------ */
function CorpAnim({ className, active }: AnimProps) {
  return (
    <Frame className={className} active={active}>
      {/* studio backdrop + stage */}
      <div className="absolute inset-0 bg-gradient-to-b from-neutral-200 via-neutral-100 to-neutral-200" />
      <div className="absolute inset-0 opacity-[0.35] [background-image:linear-gradient(to_right,#e3e3e3_1px,transparent_1px)] [background-size:16px_16px]" />
      <div className="absolute inset-x-0 bottom-0 h-[42%] bg-gradient-to-t from-neutral-300/80 to-transparent" />
      <div className="absolute inset-x-0 bottom-[34%] h-px bg-neutral-300/80" />
      <div
        className="absolute -left-6 top-1 h-28 w-28 rounded-full bg-white/80 blur-2xl"
        style={{ animation: "sheen 5s ease-in-out infinite" }}
      />
      <div className="absolute left-[46px] top-2 h-[110px] w-[70px] bg-gradient-to-b from-white/70 to-transparent [clip-path:polygon(50%_0,100%_100%,0_100%)] opacity-50" />

      {/* presentation wall */}
      <div className="absolute right-3 top-3 w-[128px] rounded-md border border-neutral-300 bg-white/95 p-1.5 shadow-[0_12px_26px_-18px_rgba(0,0,0,0.65)]">
        <div className="flex items-center justify-between">
          <span className="text-[5px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
            Quarterly review
          </span>
          <span className="h-1 w-1 rounded-full bg-emerald-500" style={{ animation: "pulse 2s ease-in-out infinite" }} />
        </div>
        <div className="mt-1.5 flex h-[34px] items-end gap-[3px]">
          {[10, 16, 13, 22, 19, 26].map((h, i) => (
            <span
              key={i}
              className="flex-1 rounded-t-[1px] bg-gradient-to-t from-neutral-900 to-neutral-500"
              style={{ height: h, transformOrigin: "bottom", animation: `rise 3.4s ease-in-out ${i * 0.14}s infinite` }}
            />
          ))}
        </div>
        <svg viewBox="0 0 100 26" className="mt-1.5 h-5 w-full" aria-hidden="true">
          <path
            d="M2 22 L20 16 L38 18 L56 10 L74 12 L96 3"
            fill="none"
            stroke="#171717"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeDasharray="130"
            style={{ animation: "draw 4.6s ease-in-out infinite" }}
          />
          <circle cx="96" cy="3" r="1.7" fill="#171717" />
        </svg>
        <div className="mt-0.5 flex items-center justify-between">
          <span className="text-[5px] uppercase tracking-[0.14em] text-neutral-400">Growth</span>
          <span className="text-[6px] font-semibold text-neutral-800">+24%</span>
        </div>
      </div>

      {/* KPI card */}
      <div
        className="absolute right-[136px] top-[26px] w-[64px] rounded-md border border-neutral-300 bg-white/90 p-1.5 shadow-sm"
        style={{ animation: "drift 5s ease-in-out infinite" }}
      >
        <span className="block text-[5px] uppercase tracking-[0.16em] text-neutral-400">Engagement</span>
        <span className="mt-0.5 block text-[10px] font-semibold leading-none tracking-tight text-neutral-900">92%</span>
        <div className="mt-1 h-[2px] w-full overflow-hidden rounded-full bg-neutral-200">
          <span className="block h-full rounded-full bg-neutral-900" style={{ animation: "gradebar 4s ease-in-out infinite" }} />
        </div>
      </div>

      {/* donut chart */}
      <div className="absolute right-[140px] top-[76px] grid h-[44px] w-[44px] place-items-center rounded-full border border-neutral-200 bg-white shadow-sm">
        <svg viewBox="0 0 36 36" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden="true">
          <circle cx="18" cy="18" r="14" fill="none" stroke="#e8e8e8" strokeWidth="4" />
          <circle
            cx="18"
            cy="18"
            r="14"
            fill="none"
            stroke="#171717"
            strokeWidth="4"
            strokeDasharray="88"
            strokeDashoffset="26"
            strokeLinecap="round"
            style={{ animation: "draw 5s ease-in-out infinite" }}
          />
        </svg>
        <span className="relative text-[6px] font-semibold text-neutral-700">70%</span>
      </div>

      {/* animated headline lines */}
      <div className="absolute left-[74px] top-[74px] space-y-1">
        {[26, 20, 14].map((w, i) => (
          <span
            key={w}
            className="block h-[3px] rounded-full bg-neutral-400/70"
            style={{ width: w, animation: `wipe 4s ease-in-out ${i * 0.3}s infinite` }}
          />
        ))}
      </div>

      {/* presenter with microphone */}
      <div className="absolute bottom-[20px] left-[14px] origin-bottom">
        <Presenter suit="#1f2937" shirt="#e5e7eb" skin="#d9c3ae" />
      </div>

      {/* lower third */}
      <div className="absolute inset-x-2 bottom-2 overflow-hidden rounded-sm">
        <div className="flex items-center gap-1.5 rounded-sm bg-neutral-900/90 px-2 py-1">
          <span className="h-1 w-1 rounded-full bg-red-500" style={{ animation: "pulse 1.6s ease-in-out infinite" }} />
          <span className="text-[6px] font-semibold uppercase tracking-[0.2em] text-white/90">
            Corporate Brief · Take 02
          </span>
        </div>
        <div className="mt-0.5 h-[2px] w-full overflow-hidden rounded-full bg-white/40">
          <div className="h-full w-full rounded-full bg-neutral-800" style={{ animation: "wipe 3.4s ease-in-out infinite" }} />
        </div>
      </div>
      <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/40" />
      {active && (
        <span className="sr-only">
          Corporate video scene: a presenter speaking into a microphone, with charts and motion graphics
        </span>
      )}
    </Frame>
  );
}

/* ------------------------------------------------------------------ */
/* 08 · Real estate video                                              */
/* ------------------------------------------------------------------ */
/** Small complete building: body, eaves, window grid and entrance. */
function Building({
  left,
  bottom,
  width,
  height,
  rows = 3,
  cols = 3,
  tone = "#eef1f4",
  roof = true,
}: {
  left: number;
  bottom: number;
  width: number;
  height: number;
  rows?: number;
  cols?: number;
  tone?: string;
  roof?: boolean;
}) {
  return (
    <div className="absolute" style={{ left, bottom, width, height }}>
      {roof && (
        <span
          className="absolute -left-[3px] -right-[3px] -top-[8px] h-[9px] bg-neutral-500"
          style={{ clipPath: "polygon(50% 0, 100% 100%, 0 100%)" }}
        />
      )}
      <span
        className="absolute inset-0 rounded-[2px] border border-neutral-300/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]"
        style={{ background: `linear-gradient(180deg, #ffffff 0%, ${tone} 100%)` }}
      />
      <span
        className="absolute inset-x-[3px] bottom-[11px] top-[4px] grid gap-[2px]"
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
        }}
      >
        {Array.from({ length: rows * cols }).map((_, i) => (
          <span
            key={i}
            className="rounded-[1px] border border-neutral-300/80"
            style={{
              background: i % 4 === 0 ? "#fbe7b4" : "#d9e8f6",
              animation: `porch-light 5s ease-in-out ${(i % 6) * 0.45}s infinite`,
            }}
          />
        ))}
      </span>
      <span className="absolute bottom-0 left-1/2 h-[9px] w-[6px] -translate-x-1/2 rounded-t-[1px] bg-neutral-600" />
    </div>
  );
}

function EstateAnim({ className, active }: AnimProps) {
  return (
    <Frame className={className} active={active}>
      <div className="absolute inset-0 bg-gradient-to-b from-sky-100 via-amber-50 to-neutral-100" />
      <div className="absolute -right-4 top-2 h-16 w-16 rounded-full bg-amber-200/50 blur-xl" style={{ animation: "sheen 6s ease-in-out infinite" }} />
      <div className="absolute inset-x-0 bottom-0 h-[38%] bg-gradient-to-t from-emerald-100/80 to-transparent" />

      {/* skyline */}
      <div className="absolute bottom-[44%] left-0 flex items-end gap-1 opacity-40">
        {[10, 16, 12, 20, 14].map((h, i) => (
          <span key={i} className="w-3 rounded-sm bg-neutral-400" style={{ height: h }} />
        ))}
      </div>

      {/* complete building row */}
      <Building left={96} bottom={46} width={38} height={62} rows={3} cols={3} tone="#e9edf1" />
      <Building left={140} bottom={46} width={44} height={78} rows={4} cols={3} tone="#dfe5ea" />
      <Building left={190} bottom={46} width={34} height={54} rows={2} cols={2} tone="#eef2f5" />

      {/* street */}
      <div className="absolute inset-x-0 bottom-[30px] h-[16px] bg-gradient-to-b from-neutral-300 to-neutral-400/80" />
      <div className="absolute inset-x-0 bottom-[37px] h-px bg-white/70" />
      <div className="absolute inset-x-0 bottom-[37px] h-[1px] overflow-hidden">
        <span className="block h-px w-[200%] bg-[repeating-linear-gradient(to_right,#ffffff_0px,#ffffff_8px,transparent_8px,transparent_18px)]" style={{ animation: "slide 6s linear infinite" }} />
      </div>

      {/* foreground property */}
      <div className="absolute bottom-[30px] right-[10px] h-[74px] w-[104px]">
        <span
          className="absolute -left-1 -right-1 top-[2px] h-[22px] bg-neutral-500"
          style={{ clipPath: "polygon(50% 0, 100% 100%, 0 100%)" }}
        />
        <span className="absolute inset-x-0 bottom-0 top-[18px] rounded-[2px] border border-neutral-300 bg-gradient-to-b from-white to-neutral-100 shadow-[0_10px_18px_-14px_rgba(0,0,0,0.55)]" />
        <span className="absolute left-[9px] top-[26px] h-[13px] w-[18px] rounded-[1px] border border-neutral-300 bg-sky-200/80 shadow-[inset_0_0_4px_rgba(255,255,255,0.9)] transition-all" style={{ animation: "porch-light 5s ease-in-out infinite" }} />
        <span className="absolute right-[9px] top-[26px] h-[13px] w-[18px] rounded-[1px] border border-neutral-300 bg-sky-200/80 shadow-[inset_0_0_4px_rgba(255,255,255,0.9)]" style={{ animation: "porch-light 5s ease-in-out 1.2s infinite" }} />
        <span className="absolute bottom-0 left-1/2 h-[22px] w-[16px] -translate-x-1/2 rounded-t-[2px] bg-neutral-700/85" />
        <span className="absolute bottom-0 left-1/2 h-[22px] w-[16px] -translate-x-1/2 rounded-t-[2px] border-t border-white/20" />
        <span className="absolute bottom-0 left-[4px] right-[4px] h-[3px] bg-neutral-300" />
        <span className="absolute right-[16px] top-[6px] h-[9px] w-[5px] bg-neutral-600" />
        {/* porch posts and step */}
        <span className="absolute bottom-[3px] left-[14px] h-[13px] w-[1px] bg-white/80" />
        <span className="absolute bottom-[3px] right-[14px] h-[13px] w-[1px] bg-white/80" />
      </div>

      {/* trees */}
      {[84, 232].map((left) => (
        <span key={left} className="absolute bottom-[30px] w-[14px]" style={{ left }}>
          <span className="mx-auto block h-[8px] w-[2px] bg-neutral-500" />
          <span className="block h-[14px] w-[14px] rounded-full bg-emerald-200/80" />
        </span>
      ))}

      {/* property pin over the house */}
      <div className="absolute right-[48px] top-[14px]">
        <span className="grid h-4 w-4 place-items-center rounded-full bg-neutral-900/85 text-[6px] font-semibold text-white shadow">
          ⌂
        </span>
        <span className="mt-0.5 block h-[6px] w-[1px] bg-neutral-900/60" style={{ marginLeft: 7 }} />
      </div>

      {/* presenter on camera */}
      <div className="absolute bottom-[26px] left-[12px] origin-bottom scale-[0.98]">
        <Presenter suit="#334155" shirt="#f8fafc" skin="#e0c7ae" micro={false} />
      </div>

      {/* property tour card + floor plan */}
      <div className="absolute left-[72px] top-[10px] w-[92px] rounded-md border border-white/70 bg-white/85 p-1.5 shadow-[0_10px_20px_-16px_rgba(0,0,0,0.6)] backdrop-blur">
        <span className="block text-[5px] uppercase tracking-[0.18em] text-neutral-500">Property tour</span>
        <span className="mt-0.5 block text-[7px] font-semibold leading-none text-neutral-900">Open house</span>
        <svg viewBox="0 0 54 26" className="mt-1 h-4 w-full" aria-hidden="true">
          <path
            d="M2 3 H28 V23 H2 Z M28 3 H52 V14 H28 Z"
            fill="none"
            stroke="#0f766e"
            strokeWidth="0.8"
            strokeDasharray="160"
            style={{ animation: "draw 4.6s ease-in-out infinite" }}
            opacity="0.65"
          />
          <path d="M9 3 V12 H2" fill="none" stroke="#0f766e" strokeWidth="0.6" opacity="0.5" />
        </svg>
      </div>

      <div className="absolute inset-x-2 bottom-2 flex items-center justify-between rounded-sm bg-white/85 px-2 py-1 backdrop-blur">
        <span className="text-[6px] font-semibold uppercase tracking-[0.2em] text-neutral-700">
          Open House · Listing Tour
        </span>
        <span className="flex items-center gap-0.5">
          <span className="h-1 w-1 rounded-full bg-red-500" style={{ animation: "pulse 1.5s ease-in-out infinite" }} />
          <span className="text-[5px] uppercase tracking-[0.16em] text-neutral-500">REC</span>
        </span>
      </div>
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent"
        style={{ animation: "pan 6s ease-in-out infinite" }}
      />
      {active && <span className="sr-only">Real estate scene: agent presenting a property with buildings and a tour graphic</span>}
    </Frame>
  );
}

/* ------------------------------------------------------------------ */
/* 09 · SaaS animation                                                 */
/* ------------------------------------------------------------------ */
function SaasAnim({ className, active }: AnimProps) {
  return (
    <Frame className={className} active={active}>
      <div className="absolute inset-0 bg-gradient-to-br from-neutral-900 via-neutral-950 to-black" />
      <div className="absolute inset-0 opacity-[0.12] [background-image:linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] [background-size:14px_14px]" />
      <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-sky-400/20 blur-2xl" style={{ animation: "sheen 5s ease-in-out infinite" }} />

      <div className="absolute left-2.5 top-3 w-[126px] overflow-hidden rounded-md border border-white/15 bg-neutral-900/90 shadow-lg backdrop-blur">
        <div className="flex items-center gap-1 border-b border-white/10 px-1.5 py-1">
          <span className="h-1 w-1 rounded-full bg-white/40" />
          <span className="h-1 w-1 rounded-full bg-white/25" />
          <span className="h-1 w-1 rounded-full bg-white/15" />
          <span className="ml-1 h-[3px] w-10 rounded-full bg-white/15" />
        </div>
        <div className="flex">
          <div className="w-4 space-y-1 border-r border-white/10 p-1">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className="block h-1 w-full rounded-full bg-white/20" style={{ animation: `fade 2.8s ease-in-out ${i * 0.2}s infinite` }} />
            ))}
          </div>
          <div className="flex-1 p-1.5">
            <span className="block h-[3px] w-8 rounded-full bg-white/60" />
            <div className="mt-1 flex gap-1">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-4 flex-1 rounded-sm border border-white/10 bg-white/[0.06]" style={{ animation: `card-in 3s ease-out ${i * 0.25}s infinite` }} />
              ))}
            </div>
            <svg viewBox="0 0 70 26" className="mt-1 h-6 w-full" aria-hidden="true">
              <polyline points="2,20 12,15 22,17 32,9 42,12 54,5 68,7" fill="none" stroke="#7dd3fc" strokeWidth="1.4" strokeLinecap="round" strokeDasharray="260" style={{ animation: "board-line 3.6s ease-in-out infinite" }} />
              <polyline points="2,23 12,21 22,22 32,18 42,20 54,16 68,17" fill="none" stroke="#ffffff" strokeOpacity="0.25" strokeWidth="1.2" strokeDasharray="260" style={{ animation: "board-line 3.6s ease-in-out 0.3s infinite" }} />
            </svg>
          </div>
        </div>
      </div>

      <div className="absolute right-2 top-4 w-[56px] rounded-md border border-white/15 bg-white/95 p-1.5 shadow-lg" style={{ animation: "drift 3.4s ease-in-out infinite" }}>
        <span className="block text-[9px] font-semibold leading-none text-neutral-900">+42%</span>
        <span className="mt-1 block h-[3px] w-full rounded-full bg-neutral-200">
          <span className="block h-full w-2/3 rounded-full bg-neutral-900" style={{ animation: "gradebar 3s ease-in-out infinite" }} />
        </span>
        <span className="mt-1 block text-[5px] uppercase tracking-[0.12em] text-neutral-400">Activation</span>
      </div>

      <div className="absolute bottom-8 right-3 flex w-[66px] items-center gap-1 rounded-md border border-white/15 bg-neutral-800/90 p-1.5 shadow-lg backdrop-blur" style={{ animation: "drift-slow 4.2s ease-in-out 0.4s infinite" }}>
        <span className="grid h-3 w-3 place-items-center rounded-full bg-emerald-400/90 text-[6px] font-bold text-neutral-950">✓</span>
        <span className="flex-1 space-y-0.5">
          <span className="block h-[2px] w-full rounded-full bg-white/60" />
          <span className="block h-[2px] w-2/3 rounded-full bg-white/25" />
        </span>
      </div>

      {/* feature tooltip + click ripple */}
      <span className="absolute left-[46%] top-[52%] flex items-center gap-1 rounded-[2px] border border-white/15 bg-white/90 px-1 py-[1px] text-[5px] font-semibold uppercase tracking-[0.12em] text-neutral-800" style={{ animation: "badge-pop 4s ease-out infinite" }}>
        New feature
      </span>
      <span className="absolute left-[46%] top-[62%] h-2 w-2 rounded-full border border-white/60 bg-white/90 shadow" style={{ animation: "pulse 2s ease-in-out infinite" }} />
      <span className="absolute left-[46%] top-[62%] h-6 w-6 -translate-x-[10px] -translate-y-[10px] rounded-full border border-sky-300/50" style={{ animation: "pop 3s ease-in-out infinite" }} />

      <span className="absolute bottom-2 left-2.5 rounded-sm border border-white/15 bg-black/60 px-1.5 py-0.5 text-[5px] font-semibold uppercase tracking-[0.2em] text-white/70 backdrop-blur">
        Product Tour
      </span>
      {active && <span className="sr-only">SaaS product animation</span>}
    </Frame>
  );
}
