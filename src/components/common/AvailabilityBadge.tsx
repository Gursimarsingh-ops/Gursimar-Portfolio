export function AvailabilityBadge() {
  return (
    <div className="group inline-flex items-center gap-2.5 rounded-full border border-neutral-200/80 bg-white/60 px-3.5 py-1.5 shadow-sm shadow-neutral-900/5 backdrop-blur-md transition-all duration-300 hover:border-emerald-200 hover:bg-white/80 hover:shadow-md hover:shadow-emerald-500/10">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
      </span>
      <span className="text-[11px] font-medium uppercase tracking-[0.22em] text-neutral-600 transition-colors duration-300 group-hover:text-neutral-900">
        Available for Collaborations
      </span>
    </div>
  );
}