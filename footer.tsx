const NAV = [
  { label: "Work", href: "#graphic" },
  { label: "Video", href: "#video" },
  { label: "Skills", href: "#skills" },
  { label: "Studio", href: "#studio" },
  { label: "Contact", href: "#contact" },
];

const SOCIAL = ["Instagram", "YouTube", "Behance", "LinkedIn"];

export function Footer() {
  return (
    <footer className="border-t border-neutral-200 bg-white">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-12">
          <div className="md:col-span-5">
            <p className="font-serif text-2xl tracking-tight text-neutral-950">
              GURSIMAR SINGH
            </p>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-neutral-500">
              Video Editor &amp; Graphic Designer crafting cinematic visuals and
              impactful digital experiences.
            </p>
          </div>

          <div className="md:col-span-3">
            <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-400">
              Navigation
            </p>
            <ul className="mt-4 space-y-3">
              {NAV.map((n) => (
                <li key={n.href}>
                  <a
                    href={n.href}
                    className="group inline-flex items-center gap-1 text-sm text-neutral-500 transition-colors hover:text-neutral-950"
                  >
                    <span className="h-px w-0 bg-neutral-900 transition-all duration-300 group-hover:w-4" />
                    {n.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-400">
              Social
            </p>
            <ul className="mt-4 flex flex-wrap gap-3">
              {SOCIAL.map((s) => (
                <li key={s}>
                  <span className="inline-flex cursor-default items-center rounded-full border border-neutral-300 px-3 py-1.5 text-xs text-neutral-500 transition-all hover:-translate-y-0.5 hover:border-neutral-900 hover:text-neutral-950">
                    {s}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-[10px] uppercase tracking-[0.18em] text-neutral-400">
              Links placeholder
            </p>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-neutral-200 pt-6 sm:flex-row">
          <p className="text-xs text-neutral-500">
            © 2026 Gursimar Singh Chawla. All Rights Reserved.
          </p>
          <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-400">
            Built for Cloudflare Pages
          </p>
        </div>
      </div>
    </footer>
  );
}