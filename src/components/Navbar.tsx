import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

const LINKS = [
  { label: "Work", href: "#graphic" },
  { label: "Video", href: "#video" },
  { label: "Skills", href: "#skills" },
  { label: "Studio", href: "#studio" },
  { label: "Contact", href: "#contact" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-500",
        scrolled
          ? "border-b border-neutral-200 bg-white/85 backdrop-blur-xl"
          : "border-b border-transparent bg-transparent"
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <a href="#top" className="group flex items-center gap-3">
          <span className="grid h-8 w-8 place-items-center rounded-md border border-neutral-300 bg-neutral-900 text-xs font-semibold tracking-tight text-white transition-transform group-hover:-rotate-6">
            GS
          </span>
          <span className="hidden text-sm font-medium tracking-[0.2em] text-neutral-700 transition-colors group-hover:text-neutral-950 sm:block">
            GURSIMAR SINGH
          </span>
        </a>

        <nav className="hidden items-center gap-8 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="group relative text-xs font-medium uppercase tracking-[0.18em] text-neutral-500 transition-colors hover:text-neutral-950"
            >
              {l.label}
              <span className="absolute -bottom-1 left-0 h-px w-0 bg-neutral-900 transition-all duration-300 group-hover:w-full" />
            </a>
          ))}
          <a
            href="#contact"
            className="rounded-full bg-neutral-900 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white transition-all hover:-translate-y-0.5 hover:bg-neutral-700 active:translate-y-0"
          >
            Hire Me
          </a>
        </nav>

        <button
          onClick={() => setOpen((v) => !v)}
          className="grid h-9 w-9 place-items-center rounded-md border border-neutral-300 text-neutral-700 transition-colors hover:bg-neutral-100 md:hidden"
          aria-label="Toggle menu"
        >
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-neutral-200 bg-white/95 px-6 py-4 md:hidden">
          <nav className="flex flex-col gap-4">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="text-sm uppercase tracking-[0.16em] text-neutral-600 hover:text-neutral-950"
              >
                {l.label}
              </a>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}