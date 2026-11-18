/**
 * Strong Room siren lighting.
 *
 * Two ceiling-wall beacon units: a brushed housing, a red Fresnel lens with a
 * rotating sweep inside it, and a soft light pool that falls onto the metal
 * surfaces around them. Kept intentionally dim (max ~0.6 opacity) so the
 * facility reads as "alert", not as a nightclub.
 */
export function SirenBeacon({
  className,
  delay = "0s",
  size = 34,
}: {
  className?: string;
  delay?: string;
  size?: number;
}) {
  return (
    <div className={className} style={{ width: size, height: size, animationDelay: delay }} aria-hidden>
      <div className="relative h-full w-full">
        {/* wall-mount bracket */}
        <div className="absolute -top-1.5 left-1/2 h-2 w-4 -translate-x-1/2 rounded-sm bg-gradient-to-b from-neutral-500/70 to-neutral-800/80" />
        {/* housing */}
        <div className="relative h-full w-full overflow-hidden rounded-full border border-white/15 bg-[radial-gradient(80%_80%_at_35%_20%,#3a4048_0%,#181d24_60%,#0a0d11_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_6px_14px_-6px_rgba(0,0,0,0.9)]">
          {/* red lens */}
          <div
            className="absolute inset-[18%] overflow-hidden rounded-full"
            style={{
              background:
                "radial-gradient(circle at 38% 32%, #ff9a9a 0%, #ff2b2b 42%, #b30d0d 78%, #560404 100%)",
              boxShadow: "inset 0 0 6px rgba(0,0,0,0.55), 0 0 10px rgba(255,45,45,0.5)",
              animation: "siren-pulse 1.9s ease-in-out infinite",
              animationDelay: delay,
            }}
          >
            {/* rotating reflector inside the lens */}
            <div
              className="absolute inset-0"
              style={{ animation: "siren-rotate 2.6s linear infinite", animationDelay: delay }}
            >
              <div className="absolute left-1/2 top-0 h-full w-1/2 origin-left bg-gradient-to-r from-white/75 via-white/15 to-transparent" />
            </div>
            <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,0.55),transparent_55%)]" />
          </div>
          {/* lens grille lines */}
          <div className="pointer-events-none absolute inset-[18%] rounded-full opacity-30 [background-image:repeating-linear-gradient(0deg,rgba(0,0,0,0.6)_0px,rgba(0,0,0,0.6)_1px,transparent_1px,transparent_3px)]" />
        </div>
        {/* light bloom */}
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 h-[190%] w-[190%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,60,60,0.45)_0%,rgba(255,40,40,0.12)_42%,transparent_70%)] blur-[2px]"
          style={{ animation: "siren-pulse 1.9s ease-in-out infinite", animationDelay: delay }}
        />
      </div>
    </div>
  );
}

/**
 * A horizontal siren rail that sits inside the facility, with two beacons and
 * the red wash they cast on the metal behind them.
 */
export function SirenRail({ className }: { className?: string }) {
  return (
    <div className={cnRail(className)}>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-400/35 to-transparent" />
      <div className="relative flex items-center justify-between gap-4 px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <SirenBeacon size={22} />
          <div className="leading-none">
            <p className="text-[8px] uppercase tracking-[0.3em] text-red-200/70">Security lighting</p>
            <p className="mt-1 flex items-center gap-1.5 text-[9px] uppercase tracking-[0.18em] text-white/35">
              <span
                className="h-1 w-1 rounded-full bg-red-500"
                style={{ animation: "siren-pulse 1.9s ease-in-out infinite" }}
              />
              Beacons active
            </p>
          </div>
        </div>

        {/* brushed metal strip with reflections */}
        <div className="relative hidden h-6 flex-1 overflow-hidden rounded-md border border-white/[0.07] bg-[linear-gradient(180deg,#20262d_0%,#14181e_55%,#0b0e12_100%)] sm:block">
          <div className="pointer-events-none absolute inset-0 opacity-[0.18] [background-image:repeating-linear-gradient(90deg,rgba(255,255,255,0.5)_0px,rgba(255,255,255,0.5)_1px,transparent_1px,transparent_3px)]" />
          <div
            className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-[linear-gradient(90deg,transparent,rgba(255,70,70,0.5),transparent)]"
            style={{ animation: "siren-sweep 3.6s ease-in-out infinite" }}
          />
          <div
            className="pointer-events-none absolute inset-y-0 right-0 w-1/4 bg-[linear-gradient(90deg,transparent,rgba(255,70,70,0.32),transparent)]"
            style={{ animation: "siren-sweep 4.4s ease-in-out infinite reverse" }}
          />
        </div>

        <SirenBeacon size={22} delay="-0.9s" />
      </div>
    </div>
  );
}

function cnRail(className?: string) {
  return [
    "relative overflow-hidden rounded-xl border border-red-500/15",
    "bg-[linear-gradient(180deg,rgba(38,18,20,0.85)_0%,rgba(14,12,14,0.9)_100%)]",
    "shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]",
    className ?? "",
  ].join(" ");
}
