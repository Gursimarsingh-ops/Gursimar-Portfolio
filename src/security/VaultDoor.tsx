import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type VaultState = "sealed" | "unlocking" | "open";

interface VaultDoorProps {
  state: VaultState;
  onTurnWheel: () => void;
  children: ReactNode;
  className?: string;
}

/** Eight bolts at 45° intervals around the lock ring. */
const BOLTS = Array.from({ length: 8 }, (_, i) => {
  const angle = (i * Math.PI) / 4;
  return {
    x: Math.cos(angle) * 118,
    y: Math.sin(angle) * 118,
    rotate: (i * 45) % 180,
  };
});

export function VaultDoor({ state, onTurnWheel, children, className }: VaultDoorProps) {
  const unlocked = state !== "sealed";

  return (
    <div className={cn("relative [perspective:1800px]", className)}>
      <div className="relative overflow-hidden rounded-[26px] border border-white/10 bg-[#07090c] shadow-[0_50px_120px_-60px_rgba(0,0,0,0.95)]">
        {/* safe interior */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_120%_at_50%_0%,#1a1f27_0%,#0c0f14_55%,#05060a_100%)]" />
        <div className="pointer-events-none absolute inset-3 rounded-[20px] border border-white/[0.06] [background-image:linear-gradient(to_right,rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.045)_1px,transparent_1px)] [background-size:34px_34px]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />

        {/* content revealed by the door */}
        <div className="relative min-h-[430px] px-4 py-6 sm:px-7 sm:py-8">{children}</div>

        {/* swinging door */}
        <div
          className="absolute inset-0 z-20 origin-left transition-transform duration-[1700ms] ease-[cubic-bezier(0.3,0.85,0.2,1)]"
          style={{
            transformStyle: "preserve-3d",
            willChange: "transform",
            transform: state === "open" ? "rotateY(-108deg)" : "rotateY(0deg)",
          }}
          aria-hidden={state === "open"}
        >
          <div
            className="relative h-full w-full overflow-hidden border-r border-white/15"
            style={{
              background:
                "radial-gradient(120% 110% at 30% 10%, #3c434d 0%, #262c34 38%, #14181e 72%, #0a0d11 100%)",
              boxShadow: "inset 0 0 60px rgba(0,0,0,0.75), inset 0 1px 0 rgba(255,255,255,0.18)",
            }}
          >
            {/* brushed metal grain */}
            <div className="pointer-events-none absolute inset-0 opacity-[0.16] [background-image:repeating-linear-gradient(115deg,rgba(255,255,255,0.14)_0px,rgba(255,255,255,0.14)_1px,transparent_1px,transparent_4px)]" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_60%_at_20%_0%,rgba(255,255,255,0.16),transparent_60%)]" />
            {/* slow specular sweep across the polished door */}
            <div
              className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.10),rgba(255,255,255,0.02),transparent)]"
              style={{ animation: "vault-status-sweep 12s ease-in-out infinite" }}
            />

            {/* outer rim + inner plate */}
            <div className="absolute inset-4 rounded-[22px] border border-white/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.22),inset_0_0_40px_rgba(0,0,0,0.6)]" />
            <div className="absolute inset-9 rounded-[18px] border border-white/10 [background:radial-gradient(80%_80%_at_40%_20%,#313842_0%,#1d232b_55%,#10141a_100%)] shadow-[inset_0_0_30px_rgba(0,0,0,0.7)]" />

            {/* rim rivets */}
            {Array.from({ length: 22 }).map((_, i) => {
              const a = (i / 22) * Math.PI * 2;
              return (
                <span
                  key={i}
                  className="absolute h-[5px] w-[5px] rounded-full bg-gradient-to-b from-white/45 to-black/60 shadow-[0_1px_1px_rgba(0,0,0,0.8)]"
                  style={{
                    left: `calc(50% + ${Math.cos(a) * 46.5}% - 2.5px)`,
                    top: `calc(50% + ${Math.sin(a) * 45}% - 2.5px)`,
                  }}
                />
              );
            })}

            {/* bolt housing ring */}
            <div className="absolute left-1/2 top-1/2 h-[268px] w-[268px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10 sm:h-[316px] sm:w-[316px]">
              <div className="absolute inset-3 rounded-full border border-white/[0.07]" />

              {/* retracting bolts */}
              {BOLTS.map((bolt, i) => (
                <span
                  key={i}
                  className="absolute left-1/2 top-1/2 origin-center rounded-[3px] bg-gradient-to-b from-neutral-300 via-neutral-500 to-neutral-800 shadow-[0_2px_4px_rgba(0,0,0,0.7)] transition-transform duration-700 ease-out"
                  style={{
                    width: 16,
                    height: 34,
                    marginLeft: -8,
                    marginTop: -17,
                    transform: `translate(${bolt.x}px, ${bolt.y}px) rotate(${bolt.rotate}deg) ${
                      unlocked ? "translateY(0) scale(0.86)" : "translateY(-6px)"
                    }`,
                    opacity: unlocked ? 0.55 : 1,
                  }}
                >
                  <span className="absolute inset-x-1 top-1 h-[2px] rounded-full bg-white/40" />
                </span>
              ))}
            </div>

            {/* status plate */}
            <div className="absolute left-1/2 top-5 -translate-x-1/2 rounded-full border border-white/10 bg-black/40 px-3 py-1 backdrop-blur">
              <span className="flex items-center gap-1.5 text-[8px] uppercase tracking-[0.28em] text-white/50">
                <span
                  className={cn(
                    "h-1 w-1 rounded-full",
                    state === "sealed" ? "bg-amber-400" : "bg-emerald-400"
                  )}
                  style={{ animation: "vault-led 2s ease-in-out infinite" }}
                />
                {state === "sealed" ? "Locked" : state === "unlocking" ? "Unbolting" : "Open"}
              </span>
            </div>

            {/* the wheel */}
            <button
              type="button"
              onClick={onTurnWheel}
              aria-label={state === "sealed" ? "Turn the vault wheel to unlock" : "Vault is unlocked"}
              className={cn(
                "group absolute left-1/2 top-1/2 grid h-[152px] w-[152px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full outline-none sm:h-[176px] sm:w-[176px]",
                "focus-visible:ring-2 focus-visible:ring-amber-300/70 focus-visible:ring-offset-4 focus-visible:ring-offset-[#0a0d11]"
              )}
            >
              {/* wheel chrome body */}
              <span
                className="absolute inset-0 rounded-full border border-white/20 shadow-[0_18px_38px_-16px_rgba(0,0,0,0.95),inset_0_1px_2px_rgba(255,255,255,0.4),inset_0_-10px_24px_rgba(0,0,0,0.6)] transition-transform duration-500 group-hover:scale-[1.03] group-active:scale-[0.98]"
                style={{
                  background:
                    "conic-gradient(from 210deg, #6f7885, #d7dde5 12%, #8c96a3 26%, #454d58 44%, #c7ced8 62%, #7c8592 78%, #3b424b 92%, #6f7885)",
                }}
              />
              <span className="absolute inset-[13%] rounded-full border border-black/40 bg-[radial-gradient(90%_90%_at_40%_20%,#3b434d_0%,#1e242c_60%,#0d1116_100%)] shadow-[inset_0_2px_6px_rgba(0,0,0,0.8)]" />

              {/* rotating spoke assembly */}
              <span
                className="absolute inset-[13%]"
                style={{
                  animation:
                    state === "unlocking" ? "vault-wheel-turn 1.8s cubic-bezier(0.25,0.8,0.3,1) forwards" : undefined,
                  transform: state === "open" ? "rotate(720deg)" : undefined,
                }}
              >
                <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden="true">
                  <defs>
                    <linearGradient id="spoke-steel" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#e7ecf2" />
                      <stop offset="55%" stopColor="#9aa3b0" />
                      <stop offset="100%" stopColor="#4d555f" />
                    </linearGradient>
                  </defs>
                  {[0, 72, 144, 216, 288].map((deg) => (
                    <g key={deg} transform={`rotate(${deg} 50 50)`}>
                      <rect x="46.5" y="9" width="7" height="33" rx="3.5" fill="url(#spoke-steel)" />
                      <circle cx="50" cy="12" r="4.6" fill="url(#spoke-steel)" stroke="#2c3239" strokeWidth="0.8" />
                    </g>
                  ))}
                  <circle cx="50" cy="50" r="15" fill="url(#spoke-steel)" stroke="#2c3239" strokeWidth="1" />
                  <circle cx="50" cy="50" r="8" fill="#141a21" />
                  <circle cx="50" cy="50" r="3" fill="#aeb7c3" />
                </svg>
              </span>

              {/* hub ring light */}
              <span
                className="pointer-events-none absolute inset-[9%] rounded-full border border-amber-200/20"
                style={{ animation: state === "sealed" ? "vault-led 3.4s ease-in-out infinite" : undefined }}
              />
            </button>

            {/* hinges */}
            {[26, 50, 74].map((top) => (
              <span
                key={top}
                className="absolute left-1 h-7 w-3 rounded-sm bg-gradient-to-b from-neutral-400 via-neutral-600 to-neutral-900 shadow-[0_2px_4px_rgba(0,0,0,0.7)]"
                style={{ top: `${top}%` }}
              />
            ))}

            {/* base label */}
            <div className="absolute inset-x-0 bottom-4 text-center">
              <p className="text-[8px] uppercase tracking-[0.34em] text-white/30">
                {state === "sealed" ? "Turn the wheel" : "Access channel open"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
