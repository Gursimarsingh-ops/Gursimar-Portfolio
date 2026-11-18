export function StudioEnvironment() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Ambient warm glow behind the workstation */}
      <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-100/40 blur-3xl studio-ambient" />
      <div className="absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-neutral-200/30 blur-3xl" />

      {/* Left desk lamp */}
      <div className="absolute bottom-16 left-4 hidden sm:block">
        <div className="relative">
          <div className="h-16 w-px origin-bottom -rotate-12 bg-neutral-300" />
          <div className="absolute -top-2 -left-3 h-4 w-8 rounded-full bg-neutral-800 shadow-sm" />
          <div className="absolute -top-1 left-1 h-10 w-10 rounded-full bg-amber-200/50 blur-xl studio-lamp-a" />
        </div>
      </div>

      {/* Right desk lamp */}
      <div className="absolute bottom-16 right-4 hidden sm:block">
        <div className="relative">
          <div className="h-16 w-px origin-bottom rotate-12 bg-neutral-300" />
          <div className="absolute -top-2 -left-5 h-4 w-8 rounded-full bg-neutral-800 shadow-sm" />
          <div className="absolute -top-1 -left-3 h-10 w-10 rounded-full bg-amber-200/50 blur-xl studio-lamp-b" />
        </div>
      </div>

      {/* Hanging studio bulbs */}
      <div className="absolute left-1/4 top-0 hidden md:block">
        <div className="h-14 w-px bg-neutral-300" />
        <div className="relative -left-1.5 h-3 w-3 rounded-full bg-neutral-100 ring-1 ring-neutral-300 studio-bulb-a">
          <div className="absolute inset-0 rounded-full bg-amber-200/70 blur-md" />
        </div>
      </div>
      <div className="absolute left-2/3 top-0 hidden md:block">
        <div className="h-20 w-px bg-neutral-300" />
        <div className="relative -left-1.5 h-3 w-3 rounded-full bg-neutral-100 ring-1 ring-neutral-300 studio-bulb-b">
          <div className="absolute inset-0 rounded-full bg-amber-200/70 blur-md" />
        </div>
      </div>

      {/* Small studio equipment — speaker + monitor stand hints */}
      <div className="absolute bottom-10 left-10 hidden lg:block">
        <div className="h-10 w-8 rounded-md border border-neutral-200 bg-white/70 shadow-sm backdrop-blur-sm">
          <div className="mx-auto mt-2 h-4 w-4 rounded-full bg-neutral-200" />
        </div>
      </div>
      <div className="absolute bottom-10 right-10 hidden lg:block">
        <div className="h-10 w-8 rounded-md border border-neutral-200 bg-white/70 shadow-sm backdrop-blur-sm">
          <div className="mx-auto mt-2 h-4 w-4 rounded-full bg-neutral-200" />
        </div>
      </div>

      {/* Soft floor reflection */}
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-neutral-100/70 to-transparent" />
    </div>
  );
}