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
    <footer className="border-t border-white/10 bg-neutral-950">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-12">
          <div className="md:col-span-5">
            <p className="font-serif text-2xl tracking-tight text-white">
              GURSIMAR SINGH
            </p>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-neutral-500">
              Video Editor &amp; Graphic Designer crafting cinematic visuals and
              impactful digital experiences.
            </p>
          </div>

          <div className="md:col-span-3">
            <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-600">
              Navigation
            </p>
            <ul className="mt-4 space-y-3">
              {NAV.map((n) => (
                <li key={n.href}>
                  <a
                    href={n.href}
                    className="text-sm text-neutral-400 transition-colors hover:text-white"
                  >
                    {n.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-600">
              Social
            </p>
            <ul className="mt-4 flex flex-wrap gap-3">
              {SOCIAL.map((s) => (
                <li key={s}>
                  <span className="inline-flex cursor-default items-center rounded-full border border-white/15 px-3 py-1.5 text-xs text-neutral-400 transition-colors hover:border-white/35 hover:text-white">
                    {s}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-[10px] uppercase tracking-[0.18em] text-neutral-700">
              Links placeholder
            </p>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 sm:flex-row">
          <p className="text-xs text-neutral-500">
            © 2026 Gursimar Singh Chawla. All Rights Reserved.
          </p>
          <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-700">
            Built for Cloudflare Pages
          </p>
        </div>
      </div>
    </footer>
  );
}