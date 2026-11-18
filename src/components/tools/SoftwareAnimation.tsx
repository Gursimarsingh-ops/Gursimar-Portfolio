import { cn } from "@/lib/utils";

type AnimProps = { active: boolean };

/** Interactive mini-simulations shown inside each software plate. */
export function SoftwareAnimation({ kind, active }: { kind: string; active: boolean }) {
  const body = (() => {
    switch (kind) {
      case "photoshop":
        return <PhotoshopAnim active={active} />;
      case "premiere":
        return <PremiereAnim active={active} />;
      case "resolve":
        return <ResolveAnim active={active} />;
      case "aftereffects":
        return <AfterEffectsAnim active={active} />;
      case "canva":
        return <CanvaAnim active={active} />;
      default:
        return <PhotoshopAnim active={active} />;
    }
  })();

  return (
    <div
      className={cn(
        "relative h-full w-full overflow-hidden",
        !active && "anim-paused"
      )}
    >
      {body}
    </div>
  );
}

/* ------------------------------- Photoshop ------------------------------- */

function PhotoshopAnim({ active }: AnimProps) {
  return (
    <>
      <div className="absolute inset-0 bg-[radial-gradient(120%_120%_at_20%_0%,#262626_0%,#101010_60%,#050505_100%)]" />
      <div className="absolute inset-0 opacity-[0.14] [background-image:linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] [background-size:12px_12px]" />

      {/* canvas artwork */}
      <div className="absolute left-3 top-3 h-[62px] w-[92px] overflow-hidden rounded-sm border border-white/15 bg-gradient-to-br from-sky-400/70 via-indigo-500/50 to-fuchsia-500/40">
        <div className="absolute -left-2 top-2 h-10 w-10 rounded-full bg-white/30 blur-sm" />
        <div className="absolute bottom-0 right-0 h-8 w-12 bg-white/20 [clip-path:polygon(0_100%,50%_0,100%_100%)]" />
      </div>

      {/* marching-ants selection */}
      <svg className="absolute left-[30px] top-4 h-[52px] w-[78px]" viewBox="0 0 78 52" aria-hidden="true">
        <rect
          x="1"
          y="1"
          width="76"
          height="50"
          fill="none"
          stroke="#ffffff"
          strokeWidth="1"
          strokeDasharray="4 4"
          style={{ animation: "marquee-ants 1.2s linear infinite" }}
          opacity="0.9"
        />
        {[
          [1, 1],
          [76, 1],
          [1, 50],
          [76, 50],
        ].map(([x, y], i) => (
          <rect key={i} x={x - 1.5} y={y - 1.5} width="3" height="3" fill="#ffffff" opacity="0.9" />
        ))}
      </svg>

      {/* brush stroke */}
      <span
        className="absolute left-[52px] top-[36px] h-1.5 w-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)]"
        style={{ animation: "cursor 5s ease-in-out infinite" }}
      />

      {/* layers panel */}
      <div className="absolute right-2 top-3 w-[58px] rounded-sm border border-white/15 bg-neutral-900/80 p-1 backdrop-blur">
        <span className="mb-1 block h-[3px] w-6 rounded-full bg-white/50" />
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="mb-0.5 flex items-center gap-1 rounded-[2px] bg-white/[0.07] px-1 py-0.5"
            style={{ animation: `clip-in 3s ease-out ${i * 0.18}s infinite` }}
          >
            <span className="h-1.5 w-1.5 rounded-[1px] bg-white/40" />
            <span className="h-[2px] flex-1 rounded-full bg-white/25" />
          </div>
        ))}
      </div>

      {/* toolbar */}
      <div className="absolute bottom-2 left-3 flex items-center gap-1 rounded-sm border border-white/10 bg-black/60 px-1.5 py-1 backdrop-blur">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={cn(
              "h-1.5 w-1.5 rounded-[1px]",
              i === 1 ? "bg-white/90" : "bg-white/25"
            )}
          />
        ))}
        <span className="ml-1 text-[6px] font-semibold uppercase tracking-[0.16em] text-white/60">
          Select
        </span>
      </div>
      <div className="absolute bottom-2 right-2 text-[6px] uppercase tracking-[0.2em] text-white/30">
        12.4 · RGB
      </div>
      {active && <span className="sr-only">Photoshop layers animating</span>}
    </>
  );
}

/* -------------------------------- Premiere ------------------------------- */

function PremiereAnim({ active }: AnimProps) {
  return (
    <>
      <div className="absolute inset-0 bg-[radial-gradient(120%_120%_at_80%_0%,#1e1b4b_0%,#0d0d1f_60%,#05050c_100%)]" />

      {/* program monitor */}
      <div className="absolute left-3 top-3 h-[46px] w-[76px] overflow-hidden rounded-sm border border-white/15 bg-black">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/50 via-neutral-800 to-neutral-900" />
        <div
          className="absolute inset-y-0 w-1/2 bg-white/10"
          style={{ animation: "pan 3.6s ease-in-out infinite" }}
        />
        <span className="absolute bottom-1 left-1 rounded-[1px] bg-black/60 px-1 text-[6px] font-medium tracking-wider text-white/70">
          00:00:12:08
        </span>
      </div>

      {/* audio meters */}
      <div className="absolute right-2 top-3 flex h-[46px] items-end gap-0.5 rounded-sm border border-white/10 bg-black/50 p-1">
        {[0, 1, 2].map((c) => (
          <span key={c} className="flex h-full items-end gap-[1px]">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <span
                key={i}
                className="w-[2px] rounded-[1px] bg-indigo-300/80"
                style={{
                  height: 3 + i * 3.5,
                  animation: `bar ${0.9 + c * 0.15}s ease-in-out ${i * 0.05}s infinite`,
                  transformOrigin: "bottom",
                }}
              />
            ))}
          </span>
        ))}
      </div>

      {/* timeline */}
      <div className="absolute inset-x-3 bottom-2 rounded-sm border border-white/10 bg-black/55 p-1 backdrop-blur">
        <div className="mb-1 flex items-center gap-1">
          <span className="text-[6px] uppercase tracking-[0.2em] text-white/40">V1</span>
          <div className="relative h-2 flex-1 overflow-hidden rounded-[1px] bg-white/[0.06]">
            {[46, 32, 40].map((w, i) => (
              <span
                key={i}
                className="absolute top-0 h-full rounded-[1px] bg-gradient-to-b from-indigo-400/80 to-indigo-600/80"
                style={{
                  width: `${w}%`,
                  left: `${i * 30 + 2}%`,
                  animation: `clip-in 3.2s ease-out ${i * 0.2}s infinite`,
                }}
              />
            ))}
          </div>
        </div>
        <div className="mb-1 flex items-center gap-1">
          <span className="text-[6px] uppercase tracking-[0.2em] text-white/40">A1</span>
          <div className="relative flex h-1.5 flex-1 items-center gap-[1px] overflow-hidden rounded-[1px] bg-white/[0.06] px-1">
            {Array.from({ length: 26 }).map((_, i) => (
              <span
                key={i}
                className="w-[1.5px] flex-none rounded-full bg-emerald-300/60"
                style={{
                  height: `${30 + ((i * 37) % 60)}%`,
                  animation: `bar ${1 + (i % 4) * 0.12}s ease-in-out ${i * 0.04}s infinite`,
                  transformOrigin: "bottom",
                }}
              />
            ))}
          </div>
        </div>
        <div className="relative h-9">
          <span
            className="absolute top-0 h-full w-px bg-red-400"
            style={{ animation: "sweep 3.4s linear infinite", left: "6%" }}
          />
          <span
            className="absolute top-0 h-1.5 w-1.5 -translate-x-1/2 rotate-45 bg-red-400"
            style={{ animation: "sweep 3.4s linear infinite", left: "6%" }}
          />
        </div>
      </div>
      {active && <span className="sr-only">Premiere Pro timeline animating</span>}
    </>
  );
}

/* -------------------------------- Resolve -------------------------------- */

function ResolveAnim({ active }: AnimProps) {
  const wheels = [
    "conic-gradient(from 0deg, #f97316, #ef4444, #0f172a, #f97316)",
    "conic-gradient(from 120deg, #22d3ee, #2563eb, #0f172a, #22d3ee)",
    "conic-gradient(from 240deg, #4ade80, #facc15, #0f172a, #4ade80)",
  ];
  return (
    <>
      <div className="absolute inset-0 bg-[radial-gradient(120%_120%_at_50%_0%,#262626_0%,#111111_55%,#060606_100%)]" />
      <div className="absolute inset-0 opacity-[0.1] [background-image:linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] [background-size:14px_14px]" />

      <div className="absolute inset-x-4 top-4 flex items-center justify-between">
        {wheels.map((bg, i) => (
          <div key={i} className="relative grid h-11 w-11 place-items-center">
            <span
              className="absolute inset-0 rounded-full opacity-80 blur-[0.5px]"
              style={{ background: bg, animation: `wheel ${14 + i * 4}s linear infinite` }}
            />
            <span className="absolute inset-1 rounded-full border border-white/20" />
            <span className="absolute inset-0 rounded-full border border-dashed border-white/25" style={{ animation: `wheel ${8 + i * 2}s linear infinite reverse` }} />
            <span className="relative h-1 w-1 rounded-full bg-white/90" />
            <span
              className="absolute left-1/2 top-0 h-[3px] w-[3px] -translate-x-1/2 rounded-full bg-white"
              style={{ animation: `wheel ${10 + i * 3}s linear infinite reverse` }}
            />
          </div>
        ))}
      </div>

      {/* grade slider */}
      <div className="absolute inset-x-4 bottom-9">
        <div className="flex items-center gap-1.5">
          <span className="text-[6px] uppercase tracking-[0.18em] text-white/40">Lift</span>
          <span className="h-1 flex-1 rounded-full bg-white/10">
            <span className="block h-full w-1/3 rounded-full bg-gradient-to-r from-orange-400 to-amber-300" style={{ animation: "gradebar 4s ease-in-out infinite" }} />
          </span>
        </div>
        <div className="mt-1 flex items-center gap-1.5">
          <span className="text-[6px] uppercase tracking-[0.18em] text-white/40">Gamma</span>
          <span className="h-1 flex-1 rounded-full bg-white/10">
            <span className="block h-full w-1/2 rounded-full bg-gradient-to-r from-sky-400 to-cyan-300" style={{ animation: "gradebar 4s ease-in-out 0.5s infinite" }} />
          </span>
        </div>
      </div>

      {/* scopes */}
      <div className="absolute bottom-2 left-3 flex h-5 items-end gap-[2px] rounded-sm border border-white/10 bg-black/50 px-1 py-0.5">
        {[3, 5, 8, 12, 9, 14, 11, 7, 4, 6, 10, 5].map((h, i) => (
          <span
            key={i}
            className="w-[2px] rounded-[1px] bg-orange-300/70"
            style={{
              height: h,
              animation: `bar ${1.2 + (i % 3) * 0.2}s ease-in-out ${i * 0.06}s infinite`,
              transformOrigin: "bottom",
            }}
          />
        ))}
      </div>
      <span className="absolute bottom-2 right-3 text-[6px] uppercase tracking-[0.2em] text-white/35">
        Node 03 · Grade
      </span>
      {active && <span className="sr-only">Resolve color wheels animating</span>}
    </>
  );
}

/* ------------------------------ After Effects ----------------------------- */

function AfterEffectsAnim({ active }: AnimProps) {
  return (
    <>
      <div className="absolute inset-0 bg-[radial-gradient(120%_120%_at_30%_0%,#2a1b3d_0%,#150e21_58%,#07040c_100%)]" />
      <div className="absolute inset-0 opacity-[0.18] [background-image:linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] [background-size:16px_16px]" />

      {/* comp frame */}
      <div className="absolute inset-2 rounded-sm border border-white/12">
        <span className="absolute -left-px -top-px h-2 w-2 border-l border-t border-white/60" />
        <span className="absolute -right-px -top-px h-2 w-2 border-r border-t border-white/60" />
        <span className="absolute -bottom-px -left-px h-2 w-2 border-b border-l border-white/60" />
        <span className="absolute -bottom-px -right-px h-2 w-2 border-b border-r border-white/60" />
      </div>

      {/* morphing shape */}
      <div
        className="absolute left-4 top-4 h-12 w-12 bg-gradient-to-br from-fuchsia-400/80 to-violet-600/80"
        style={{ animation: "morph 5s ease-in-out infinite" }}
      />
      <span
        className="absolute left-[76px] top-6 h-8 w-8 rounded-full border-2 border-dashed border-fuchsia-200/60"
        style={{ animation: "spin 6s linear infinite" }}
      />

      {/* motion path with keyframes */}
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 200 112" aria-hidden="true">
        <path
          d="M28 84 C 70 84, 96 46, 148 34"
          fill="none"
          stroke="#e9d5ff"
          strokeOpacity="0.45"
          strokeWidth="1"
          strokeDasharray="3 3"
        />
        {[
          [28, 84],
          [72, 66],
          [116, 44],
          [148, 34],
        ].map(([x, y], i) => (
          <rect
            key={i}
            x={x - 2.5}
            y={y - 2.5}
            width="5"
            height="5"
            fill="#e9d5ff"
            opacity={0.9}
            transform={`rotate(45 ${x} ${y})`}
            style={{ animation: `fade 2.4s ease-in-out ${i * 0.3}s infinite` }}
          />
        ))}
        <g style={{ animation: "keyframe-move 4s ease-in-out infinite" }}>
          <circle cx="30" cy="82" r="3.5" fill="#ffffff" />
        </g>
      </svg>

      {/* timeline ruler */}
      <div className="absolute inset-x-3 bottom-2 rounded-sm border border-white/10 bg-black/50 px-1.5 py-1 backdrop-blur">
        <div className="flex items-center justify-between">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <span key={i} className="h-1.5 w-px bg-white/25" />
          ))}
        </div>
        <div className="mt-1 flex items-center gap-1">
          <span className="rounded-[1px] bg-fuchsia-400/80 px-1 py-[1px] text-[6px] font-semibold uppercase tracking-[0.16em] text-white">
            0 – 4s
          </span>
          <span className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
            <span className="block h-full w-1/3 rounded-full bg-fuchsia-300/80" style={{ animation: "gradebar 4s ease-in-out infinite" }} />
          </span>
        </div>
      </div>
      {active && <span className="sr-only">After Effects motion graphics animating</span>}
    </>
  );
}

/* ---------------------------------- Canva -------------------------------- */

function CanvaAnim({ active }: AnimProps) {
  return (
    <>
      <div className="absolute inset-0 bg-gradient-to-br from-neutral-100 via-neutral-50 to-neutral-200" />

      {/* template cards fanned behind */}
      <div className="absolute left-9 top-4 h-[54px] w-[40px] -rotate-6 rounded-sm border border-neutral-300 bg-white shadow-sm" />
      <div className="absolute left-[52px] top-3 h-[58px] w-[42px] rotate-3 rounded-sm border border-neutral-300 bg-white shadow-sm" />

      {/* main design board */}
      <div className="absolute left-[66px] top-4 h-[62px] w-[58px] rounded-sm border border-neutral-300 bg-white p-1.5 shadow-md">
        <span className="block h-[3px] w-full rounded-full bg-neutral-900" style={{ animation: "wipe 3s ease-in-out infinite" }} />
        <span className="mt-1 block h-[2px] w-3/4 rounded-full bg-neutral-300" />
        <span className="mt-1 block h-[2px] w-2/3 rounded-full bg-neutral-300" />
        <div className="mt-1.5 flex gap-1">
          <span className="h-4 flex-1 rounded-[1px] bg-gradient-to-br from-violet-400/80 to-teal-400/70" />
          <span className="h-4 w-3 rounded-[1px] border border-neutral-300 bg-neutral-100" />
        </div>
        <span
          className="mt-1 block h-1.5 w-8 rounded-full bg-neutral-900/85"
          style={{ animation: "drift 2.8s ease-in-out infinite" }}
        />
      </div>

      {/* type + palette panel */}
      <div className="absolute right-2 top-4 w-[46px] rounded-sm border border-neutral-300 bg-white/90 p-1 shadow-sm backdrop-blur">
        <span className="block text-[6px] font-semibold uppercase tracking-[0.16em] text-neutral-500">Type</span>
        <span className="mt-0.5 block text-[8px] font-bold leading-none text-neutral-900">Aa</span>
        <div className="mt-1 flex gap-0.5">
          {["#7c3aed", "#0d9488", "#111111"].map((c, i) => (
            <span
              key={c}
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: c, animation: `pop 2.4s ease-in-out ${i * 0.2}s infinite` }}
            />
          ))}
        </div>
      </div>

      {/* floating select chip */}
      <span
        className="absolute bottom-9 left-[84px] rounded-[2px] bg-neutral-900 px-1.5 py-0.5 text-[6px] font-semibold uppercase tracking-[0.14em] text-white"
        style={{ animation: "drift-slow 3.6s ease-in-out infinite" }}
      >
        Resize
      </span>

      {/* bottom toolbar */}
      <div className="absolute inset-x-3 bottom-2 flex items-center justify-between rounded-sm border border-neutral-300 bg-white/90 px-1.5 py-1 backdrop-blur">
        <div className="flex items-center gap-1">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className="h-1.5 w-1.5 rounded-[1px] bg-neutral-400"
              style={{ animation: `fade 2.6s ease-in-out ${i * 0.2}s infinite` }}
            />
          ))}
        </div>
        <span className="text-[6px] uppercase tracking-[0.18em] text-neutral-500">Template</span>
      </div>
      {active && <span className="sr-only">Canva layout animating</span>}
    </>
  );
}
