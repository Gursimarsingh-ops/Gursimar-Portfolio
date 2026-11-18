import {
  Aperture,
  ArrowUp,
  ArrowUpRight,
  Clapperboard,
  Instagram,
  Linkedin,
  Mail,
  ShieldCheck,
  Sparkles,
  Youtube,
  Palette,
  type LucideIcon,
} from "lucide-react";

const NAV: { label: string; href: string; icon: LucideIcon }[] = [
  { label: "Work", href: "#graphic", icon: Aperture },
  { label: "Video", href: "#video", icon: Clapperboard },
  { label: "Skills", href: "#skills", icon: Sparkles },
  { label: "Studio", href: "#tools", icon: Palette },
  { label: "Contact", href: "#contact", icon: Mail },
  { label: "Security", href: "/security", icon: ShieldCheck },
];

const BEHANCE_URL = "https://www.behance.net/gursimasinghc";

const SOCIAL: { label: string; icon: LucideIcon; href: string | null }[] = [
  { label: "Instagram", icon: Instagram, href: null },
  { label: "YouTube", icon: Youtube, href: null },
  { label: "Behance", icon: Palette, href: BEHANCE_URL },
  { label: "LinkedIn", icon: Linkedin, href: null },
];

const glass =
  "group relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.045] shadow-[inset_0_1px_0_rgba(255,255,255,0.09)] backdrop-blur-md transition-all duration-500";

export function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-neutral-800 bg-neutral-950 text-neutral-300">
      {/* quiet depth: soft gradient field, aurora pools, top hairline */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(130%_150%_at_18%_-20%,#22252b_0%,#0c0e12_48%,#040507_100%)]" />
      <div
        className="pointer-events-none absolute -left-28 -top-28 h-96 w-96 rounded-full bg-white/[0.08] blur-[120px]"
        style={{ animation: "footer-drift 24s ease-in-out infinite" }}
      />
      <div
        className="pointer-events-none absolute -right-24 bottom-[-8rem] h-80 w-80 rounded-full bg-indigo-300/[0.05] blur-[120px]"
        style={{ animation: "footer-drift 30s ease-in-out infinite reverse" }}
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

      <div className="relative mx-auto max-w-6xl px-6 pb-10 pt-16">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-12 md:gap-8">
          {/* identity */}
          <div className="md:col-span-5">
            <div className="flex items-center gap-3">
              <span className="relative grid h-10 w-10 place-items-center overflow-hidden rounded-xl border border-white/15 bg-gradient-to-b from-neutral-700 to-neutral-900 text-[11px] font-semibold tracking-wide text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_16px_30px_-22px_rgba(0,0,0,0.95)]">
                <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_120%_at_30%_0%,rgba(255,255,255,0.22),transparent_65%)]" />
                GS
              </span>
              <div>
                <p className="font-serif text-xl leading-none tracking-tight text-white">
                  GurSimar Singh
                </p>
                <p className="mt-1.5 text-[9px] uppercase tracking-[0.26em] text-white/40">
                  Video Editor / Graphic Designer
                </p>
              </div>
            </div>

            <p className="mt-6 max-w-sm text-[13px] leading-7 text-neutral-400">
              Video editing, motion and graphic design, shaped around pacing,
              clarity and a polished finish.
            </p>

            <div className="mt-7 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-[9px] uppercase tracking-[0.2em] text-white/55 backdrop-blur">
              <span
                className="h-1.5 w-1.5 rounded-full bg-emerald-400/90"
                style={{ animation: "pulse 2.6s ease-in-out infinite" }}
              />
              Available for collaborations
            </div>
          </div>

          {/* navigation — glass buttons */}
          <nav className="md:col-span-4" aria-label="Footer navigation">
            <div className="flex items-center gap-3">
              <p className="text-[9px] uppercase tracking-[0.28em] text-white/35">Navigation</p>
              <span className="h-px flex-1 bg-gradient-to-r from-white/15 to-transparent" />
            </div>
            <ul className="mt-5 grid grid-cols-2 gap-2">
              {NAV.map((n) => (
                <li key={n.href}>
                  <a
                    href={n.href}
                    className={`${glass} flex items-center justify-between gap-2 px-3 py-2.5 text-[12px] text-neutral-300 hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/[0.085] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40`}
                  >
                    <span className="pointer-events-none absolute inset-0 -translate-x-[130%] skew-x-[-14deg] bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform duration-700 group-hover:translate-x-[130%]" />
                    <span className="relative flex items-center gap-2">
                      <n.icon className="h-3.5 w-3.5 text-white/35 transition-colors duration-300 group-hover:text-white/85" />
                      {n.label}
                    </span>
                    <ArrowUpRight className="relative h-3 w-3 text-white/20 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-white/70" />
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* social — glass buttons */}
          <div className="md:col-span-3">
            <div className="flex items-center gap-3">
              <p className="text-[9px] uppercase tracking-[0.28em] text-white/35">Social</p>
              <span className="h-px flex-1 bg-gradient-to-r from-white/15 to-transparent" />
            </div>
            <ul className="mt-5 grid grid-cols-2 gap-2">
              {SOCIAL.map((s) =>
                s.href ? (
                  <li key={s.label}>
                    <a
                      href={s.href}
                      target="_blank"
                      rel="noreferrer noopener"
                      aria-label={`${s.label} profile (opens in a new tab)`}
                      className={`${glass} flex items-center gap-1.5 px-2.5 py-2 text-[11px] text-neutral-300 hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/[0.085] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40`}
                    >
                      <span className="pointer-events-none absolute inset-0 -translate-x-[130%] skew-x-[-14deg] bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-[130%]" />
                      <s.icon className="relative h-3.5 w-3.5 text-white/45 transition-colors duration-300 group-hover:text-white" />
                      <span className="relative">{s.label}</span>
                    </a>
                  </li>
                ) : (
                  <li key={s.label}>
                    <span
                      aria-disabled="true"
                      title="Profile link not published yet"
                      className={`${glass} flex cursor-default items-center gap-1.5 px-2.5 py-2 text-[11px] text-neutral-500`}
                    >
                      <s.icon className="h-3.5 w-3.5 text-white/30" />
                      <span>{s.label}</span>
                      <span className="ml-auto rounded-full border border-white/10 px-1 py-px text-[7px] uppercase tracking-[0.1em] text-white/30">
                        Soon
                      </span>
                    </span>
                  </li>
                )
              )}
            </ul>
            <p className="mt-4 text-[9px] uppercase tracking-[0.18em] text-white/30">
              Behance is live. Other profiles publish soon.
            </p>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 sm:flex-row">
          <p className="text-[11px] tracking-wide text-neutral-500">
            © 2026 GurSimar Singh Chawla. All Rights Reserved.
          </p>
          <a
            href="#top"
            className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full border border-white/12 bg-white/[0.04] px-3.5 py-1.5 text-[9px] uppercase tracking-[0.2em] text-neutral-400 backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:border-white/30 hover:text-white focus-visible:outline-none focus-visible:border-white/40 focus-visible:text-white"
          >
            <span className="pointer-events-none absolute inset-0 -translate-x-full skew-x-[-14deg] bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            <span className="relative">Back to top</span>
            <ArrowUp className="relative h-3 w-3 transition-transform duration-300 group-hover:-translate-y-0.5" />
          </a>
        </div>
      </div>
    </footer>
  );
}
