export function PhotoRobots() {
  return (
    <section id="studio" className="relative border-t border-neutral-200 bg-neutral-50 py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-500">
              Studio · 01
            </p>
            <h2 className="mt-3 font-serif text-4xl tracking-tight text-neutral-950 md:text-5xl">
              The Portrait
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-neutral-500">
            Two flying robots carry a suspended photo board across the studio sky.
          </p>
        </div>

        <div className="relative mt-14 overflow-hidden rounded-3xl border border-neutral-200 bg-gradient-to-b from-sky-50 via-white to-neutral-100 px-4 py-20 shadow-sm sm:px-8">
          <div className="pointer-events-none absolute inset-0 opacity-[0.35] [background-image:radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:28px_28px]" />
          <div className="pointer-events-none absolute inset-x-0 top-1/2 h-40 -translate-y-1/2 bg-gradient-to-r from-transparent via-white to-transparent" />

          <div className="relative flex items-center justify-center gap-0 sm:gap-2">
            <Robot side="left" />

            <div className="relative" style={{ animation: "float 6s ease-in-out infinite" }}>
              <div className="grid h-56 w-44 place-items-center rounded-2xl border-4 border-neutral-900 bg-white shadow-2xl sm:h-80 sm:w-60">
                <div className="flex flex-col items-center gap-3 text-neutral-300">
                  <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="5" width="18" height="14" rx="2" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </div>
              </div>
              <div className="absolute -inset-8 -z-10 rounded-3xl bg-neutral-900/5 blur-2xl" />
            </div>

            <Robot side="right" />
          </div>
        </div>
      </div>
    </section>
  );
}

function Robot({ side }: { side: "left" | "right" }) {
  const flip = side === "right" ? "scale-x-[-1]" : "";
  const delay = side === "right" ? "1.4s" : "0s";
  const handX = side === "left" ? 108 : 12;

  return (
    <div
      className={`shrink-0 ${flip}`}
      style={{ animation: `float 5s ease-in-out ${delay} infinite` }}
    >
      <svg viewBox="0 0 120 180" className="h-44 w-32 drop-shadow-2xl sm:h-60 sm:w-44">
        <defs>
          <linearGradient id={`body-${side}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e2e8f0" />
            <stop offset="100%" stopColor="#94a3b8" />
          </linearGradient>
          <linearGradient id={`accent-${side}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#ea580c" />
          </linearGradient>
          <linearGradient id={`visor-${side}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0ea5e9" />
            <stop offset="100%" stopColor="#0369a1" />
          </linearGradient>
          <radialGradient id={`jet-${side}`} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
          </radialGradient>
        </defs>

        <g style={{ animation: `float 3s ease-in-out ${delay} infinite` }}>
          <path d="M18 78 L-2 60 L-2 96 Z" fill={`url(#accent-${side})`} opacity="0.9" />
          <path d="M102 78 L122 60 L122 96 Z" fill={`url(#accent-${side})`} opacity="0.9" />
        </g>

        <rect x="34" y="14" width="52" height="44" rx="14" fill={`url(#body-${side})`} stroke="#64748b" strokeWidth="1.5" />
        <rect x="42" y="26" width="36" height="20" rx="8" fill={`url(#visor-${side})`} />
        <circle cx="52" cy="36" r="3" fill="#e0f2fe" />
        <circle cx="68" cy="36" r="3" fill="#e0f2fe" />
        <circle cx="60" cy="12" r="3" fill="#f97316" />

        <rect x="40" y="62" width="40" height="42" rx="12" fill={`url(#body-${side})`} stroke="#64748b" strokeWidth="1.5" />
        <circle cx="60" cy="82" r="8" fill={`url(#accent-${side})`} />
        <circle cx="60" cy="82" r="3" fill="#fff" opacity="0.8" />

        <g style={{ animation: `float 4s ease-in-out ${delay} infinite` }}>
          <path
            d={`M${side === "left" ? 80 : 40} 70 Q${handX} 80 ${handX} 100`}
            stroke={`url(#body-${side})`}
            strokeWidth="12"
            fill="none"
            strokeLinecap="round"
          />
          <circle cx={handX} cy="102" r="9" fill={`url(#accent-${side})`} stroke="#c2410c" strokeWidth="1" />
          <circle cx={handX} cy="102" r="3" fill="#fff" opacity="0.7" />
        </g>

        <g style={{ animation: `float 3.6s ease-in-out ${delay} infinite` }}>
          <rect x="46" y="106" width="12" height="34" rx="6" fill={`url(#body-${side})`} stroke="#64748b" strokeWidth="1.5" />
          <rect x="62" y="106" width="12" height="34" rx="6" fill={`url(#body-${side})`} stroke="#64748b" strokeWidth="1.5" />
          <ellipse cx="52" cy="142" rx="10" ry="6" fill="#475569" />
          <ellipse cx="68" cy="142" rx="10" ry="6" fill="#475569" />
          <ellipse cx="52" cy="152" rx="14" ry="8" fill={`url(#jet-${side})`} style={{ animation: `pulse 1.2s ease-in-out ${delay} infinite` }} />
          <ellipse cx="68" cy="152" rx="14" ry="8" fill={`url(#jet-${side})`} style={{ animation: `pulse 1.2s ease-in-out ${delay} infinite` }} />
        </g>
      </svg>
    </div>
  );
}