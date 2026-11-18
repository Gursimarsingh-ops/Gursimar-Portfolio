import { cn } from "@/lib/utils";

type Kind =
  | "video"
  | "graphic"
  | "motion"
  | "color"
  | "cut"
  | "gaming"
  | "corp"
  | "estate"
  | "saas";

export function SkillAnimation({ kind }: { kind: Kind }) {
  const base = "h-full w-full";
  switch (kind) {
    case "video":
      return <VideoEditAnim className={base} />;
    case "graphic":
      return <GraphicAnim className={base} />;
    case "motion":
      return <MotionAnim className={base} />;
    case "color":
      return <ColorAnim className={base} />;
    case "cut":
      return <CutAnim className={base} />;
    case "gaming":
      return <GamingAnim className={base} />;
    case "corp":
      return <CorpAnim className={base} />;
    case "estate":
      return <EstateAnim className={base} />;
    case "saas":
      return <SaasAnim className={base} />;
  }
}

function Frame({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("relative h-full w-full overflow-hidden", className)}>
      {children}
    </div>
  );
}

function VideoEditAnim({ className }: { className?: string }) {
  return (
    <Frame className={className}>
      <div className="absolute inset-x-3 top-3 h-10 rounded-md bg-neutral-900" />
      <div className="absolute inset-x-3 top-3 h-10 overflow-hidden rounded-md">
        <div className="flex h-full w-[200%] animate-[slide_4s_linear_infinite]">
          {["#3b82f6", "#a855f7", "#f97316", "#22c55e"].map((c, i) => (
            <div key={i} className="h-full w-1/4 border-r border-white/20" style={{ background: c, opacity: 0.85 }} />
          ))}
        </div>
      </div>
      <div className="absolute inset-x-3 bottom-3 h-8 rounded-md border border-neutral-300 bg-white">
        <div className="flex h-full items-center gap-1 px-2">
          {[10, 18, 12, 22, 14, 20, 16].map((w, i) => (
            <div key={i} className="h-4 rounded-sm bg-neutral-400" style={{ width: w }} />
          ))}
        </div>
        <div className="absolute top-0 h-full w-0.5 animate-[scan_3s_ease-in-out_infinite] bg-red-500" />
      </div>
    </Frame>
  );
}

function GraphicAnim({ className }: { className?: string }) {
  return (
    <Frame className={className}>
      <svg viewBox="0 0 200 100" className="h-full w-full">
        <rect x="20" y="20" width="60" height="60" rx="6" fill="#fde68a" stroke="#f59e0b" strokeWidth="1.5"
          className="animate-[pulse_3s_ease-in-out_infinite]" />
        <circle cx="130" cy="50" r="22" fill="#bfdbfe" stroke="#3b82f6" strokeWidth="1.5"
          className="animate-[pulse_3s_ease-in-out_infinite_0.6s]" />
        <path d="M160 70 L180 30 L200 70 Z" fill="#fecaca" stroke="#ef4444" strokeWidth="1.5"
          className="animate-[pulse_3s_ease-in-out_infinite_1.2s]" />
        <path d="M20 90 L180 90" stroke="#a3a3a3" strokeWidth="1" strokeDasharray="4 4" />
      </svg>
    </Frame>
  );
}

function MotionAnim({ className }: { className?: string }) {
  return (
    <Frame className={className}>
      <div className="absolute inset-0 grid place-items-center">
        <div className="flex items-end gap-1.5">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="w-3 rounded-sm bg-gradient-to-t from-neutral-900 to-neutral-500"
              style={{ animation: `bar 1.4s ease-in-out ${i * 0.12}s infinite`, height: 20 }}
            />
          ))}
        </div>
      </div>
      <div className="absolute left-4 top-4 h-2 w-16 rounded-full bg-neutral-900" />
      <div className="absolute right-4 bottom-4 h-2 w-10 rounded-full bg-neutral-400" />
      <div className="absolute right-4 top-4 h-6 w-6 animate-[spin_4s_linear_infinite] rounded-md border-2 border-neutral-900" />
    </Frame>
  );
}

function ColorAnim({ className }: { className?: string }) {
  return (
    <Frame className={className}>
      <div className="absolute inset-0 bg-gradient-to-br from-neutral-300 to-neutral-500" />
      <div className="absolute inset-0 animate-[grade_4s_ease-in-out_infinite] bg-gradient-to-br from-orange-400 via-rose-500 to-indigo-600" />
      <div className="absolute inset-x-3 bottom-3 flex items-center gap-2">
        <div className="h-1.5 flex-1 rounded-full bg-white/40">
          <div className="h-full w-1/2 animate-[gradebar_4s_ease-in-out_infinite] rounded-full bg-white" />
        </div>
        <span className="text-[9px] font-semibold uppercase tracking-widest text-white/90">
          Grade
        </span>
      </div>
    </Frame>
  );
}

function CutAnim({ className }: { className?: string }) {
  return (
    <Frame className={className}>
      <div className="absolute inset-x-3 top-6 h-8 rounded-md bg-neutral-900" />
      <div className="absolute inset-x-3 top-6 flex h-8 overflow-hidden rounded-md">
        <div className="h-full w-full bg-gradient-to-r from-blue-500 to-blue-700" />
      </div>
      <div className="absolute inset-x-3 top-20 flex h-8 gap-1">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-full flex-1 rounded-sm bg-gradient-to-r from-blue-500 to-blue-700"
            style={{ animation: `pop 2.4s ease-in-out ${i * 0.25}s infinite` }}
          />
        ))}
      </div>
      <div className="absolute inset-x-3 top-16 h-0.5 bg-red-500" />
    </Frame>
  );
}

function GamingAnim({ className }: { className?: string }) {
  return (
    <Frame className={className}>
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 via-purple-600 to-fuchsia-600" />
      <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] [background-size:16px_16px]" />
      <div className="absolute inset-x-3 bottom-3 h-6 rounded-md bg-black/40 backdrop-blur">
        <div className="flex h-full items-center gap-1 px-2">
          {[14, 22, 10, 26, 18, 12, 20].map((w, i) => (
            <div
              key={i}
              className="h-3 rounded-sm bg-white/80"
              style={{ width: w, animation: `bar 1.2s ease-in-out ${i * 0.1}s infinite` }}
            />
          ))}
        </div>
      </div>
      <div className="absolute left-3 top-3 rounded-md bg-black/50 px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-white">
        LIVE
      </div>
    </Frame>
  );
}

function CorpAnim({ className }: { className?: string }) {
  return (
    <Frame className={className}>
      <div className="absolute inset-x-3 top-3 h-12 rounded-md bg-gradient-to-r from-slate-700 to-slate-900" />
      <div className="absolute left-5 top-6 h-2 w-20 rounded-full bg-white/80" />
      <div className="absolute left-5 top-10 h-1.5 w-32 rounded-full bg-white/40" />
      <div className="absolute inset-x-3 bottom-3 flex gap-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-8 flex-1 rounded-md border border-neutral-300 bg-white"
            style={{ animation: `fade 3s ease-in-out ${i * 0.4}s infinite` }}
          />
        ))}
      </div>
    </Frame>
  );
}

function EstateAnim({ className }: { className?: string }) {
  return (
    <Frame className={className}>
      <div className="absolute inset-0 bg-gradient-to-b from-sky-200 to-amber-100" />
      <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-emerald-200 to-transparent" />
      <svg viewBox="0 0 200 100" className="absolute inset-0 h-full w-full">
        <rect x="60" y="40" width="80" height="50" fill="#f5f5f4" stroke="#a8a29e" />
        <path d="M55 42 L100 18 L145 42 Z" fill="#dc2626" />
        <rect x="90" y="60" width="20" height="30" fill="#78350f" />
        <rect x="70" y="50" width="12" height="12" fill="#7dd3fc" />
        <rect x="118" y="50" width="12" height="12" fill="#7dd3fc" />
      </svg>
      <div className="absolute inset-0 animate-[pan_5s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/30 to-transparent" />
    </Frame>
  );
}

function SaasAnim({ className }: { className?: string }) {
  return (
    <Frame className={className}>
      <div className="absolute inset-3 rounded-lg border border-neutral-300 bg-white shadow-sm">
        <div className="flex h-5 items-center gap-1 border-b border-neutral-200 px-2">
          <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        </div>
        <div className="p-2">
          <div className="h-2 w-16 rounded-full bg-neutral-900" />
          <div className="mt-2 h-1.5 w-24 rounded-full bg-neutral-300" />
          <div className="mt-3 flex gap-1.5">
            <div className="h-6 flex-1 animate-[pulse_2s_ease-in-out_infinite] rounded bg-blue-500/80" />
            <div className="h-6 flex-1 animate-[pulse_2s_ease-in-out_infinite_0.3s] rounded bg-purple-500/80" />
            <div className="h-6 flex-1 animate-[pulse_2s_ease-in-out_infinite_0.6s] rounded bg-emerald-500/80" />
          </div>
        </div>
      </div>
    </Frame>
  );
}