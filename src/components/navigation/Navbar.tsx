import { useEffect, useRef, useState } from "react";
import { Menu, X, ArrowUpRight, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

const LINKS = [
  { label: "Work", href: "#graphic" },
  { label: "Skills", href: "#skills" },
  { label: "Studio", href: "#tools" },
  { label: "Contact", href: "#contact" },
];

export function Navbar({ onHire }: { onHire: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string>("");
  const [shining, setShining] = useState<string>("");
  const shineTimer = useRef<number | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const ids = LINKS.map((l) => l.href.slice(1));
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(e.target.id);
        });
      },
      { rootMargin: "-40% 0px -55% 0px", threshold: 0 }
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  useEffect(
    () => () => {
      if (shineTimer.current) window.clearTimeout(shineTimer.current);
    },
    []
  );

  const handleNavClick = (href: string) => {
    setShining(href);
    if (shineTimer.current) window.clearTimeout(shineTimer.current);
    shineTimer.current = window.setTimeout(() => setShining(""), 650);
  };

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-4 sm:pt-4">
      <div
        className={cn(
          "nav-ink relative mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 overflow-hidden rounded-2xl border px-3 transition-shadow duration-500 sm:h-16 sm:px-5",
          scrolled
            ? "border-transparent shadow-[0_24px_60px_-26px_rgba(0,0,0,0.55)]"
            : "border-transparent shadow-[0_16px_44px_-28px_rgba(0,0,0,0.4)]"
        )}
      >
        {/* cycling glass layers — frosted white ↔ charcoal */}
        <span
          aria-hidden="true"
          className="nav-cycle-light pointer-events-none absolute inset-0 border border-black/10"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.94) 0%, rgba(246,246,246,0.82) 55%, rgba(238,238,238,0.88) 100%)",
            backdropFilter: "blur(18px) saturate(140%)",
            WebkitBackdropFilter: "blur(18px) saturate(140%)",
          }}
        />
        <span
          aria-hidden="true"
          className="nav-cycle-dark pointer-events-none absolute inset-0 border border-white/15"
          style={{
            background:
              "linear-gradient(180deg, rgba(30,31,34,0.94) 0%, rgba(12,13,16,0.94) 55%, rgba(4,5,7,0.96) 100%)",
            backdropFilter: "blur(18px) saturate(130%)",
            WebkitBackdropFilter: "blur(18px) saturate(130%)",
          }}
        />
        <span
          aria-hidden="true"
          className="nav-cycle-light pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-black/25 to-transparent"
        />
        <span
          aria-hidden="true"
          className="nav-cycle-dark pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/45 to-transparent"
        />
        <span
          aria-hidden="true"
          className="nav-cycle-dark pointer-events-none absolute -left-10 top-0 h-24 w-40 rounded-full bg-white/10 blur-3xl"
        />

        <a href="#top" className="group relative flex shrink-0 items-center gap-2.5">
          <span className="nav-chip-tone relative grid h-9 w-9 place-items-center overflow-hidden rounded-xl border text-[11px] font-semibold tracking-tight shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_6px_16px_-10px_rgba(0,0,0,0.9)] transition-transform duration-500 group-hover:-rotate-6">
            <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent" />
            <span className="relative">GS</span>
          </span>
          <span className="hidden flex-col leading-none sm:flex">
            <span className="text-[12px] font-semibold tracking-[0.22em]">GurSimar Singh</span>
            <span className="mt-1 text-[8px] uppercase tracking-[0.32em] opacity-45">Video · Design</span>
          </span>
        </a>

        <nav className="relative hidden items-center gap-1.5 md:flex">
          {LINKS.map((l) => {
            const isActive = active === l.href.slice(1);
            return (
              <a
                key={l.href}
                href={l.href}
                onClick={() => handleNavClick(l.href)}
                className={cn(
                  "group nav-pill-tone relative overflow-hidden rounded-full border px-3.5 py-1.5 text-[11px] font-medium uppercase tracking-[0.16em] backdrop-blur transition-all duration-300 hover:-translate-y-0.5",
                  isActive ? "opacity-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]" : "opacity-75 hover:opacity-100"
                )}
              >
                <span
                  className="pointer-events-none absolute inset-0 -translate-x-[130%] bg-gradient-to-r from-transparent via-white/35 to-transparent"
                  style={shining === l.href ? { animation: "shine 0.65s ease-out" } : undefined}
                />
                <span
                  className={cn(
                    "pointer-events-none absolute inset-x-3 bottom-1 h-px origin-center bg-current transition-transform duration-300",
                    isActive ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                  )}
                />
                <span className="relative">{l.label}</span>
              </a>
            );
          })}
        </nav>

        <div className="relative flex shrink-0 items-center gap-2">
          <a
            href="/security"
            aria-label="Security and maintenance dashboard"
            title="Security & maintenance"
            className="nav-pill-tone grid h-9 w-9 place-items-center rounded-xl border opacity-70 transition-all duration-300 hover:-translate-y-0.5 hover:opacity-100"
          >
            <Lock className="h-3.5 w-3.5" />
          </a>
          <button
            onClick={onHire}
            className="nav-cta-tone group relative hidden items-center gap-1.5 overflow-hidden rounded-full border px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] shadow-[0_8px_20px_-12px_rgba(0,0,0,0.9)] transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] md:inline-flex"
          >
            <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            <span className="relative">Hire Me</span>
            <ArrowUpRight className="relative h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </button>

          <button
            onClick={() => setOpen((v) => !v)}
            className="grid h-9 w-9 place-items-center rounded-xl border border-current text-current opacity-70 backdrop-blur transition-all duration-300 hover:opacity-100 active:scale-95 md:hidden"
            aria-label="Toggle menu"
            aria-expanded={open}
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="mx-auto mt-2 max-w-6xl overflow-hidden rounded-2xl border border-white/10 bg-neutral-950/92 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.85)] backdrop-blur-xl md:hidden">
          <nav className="flex flex-col gap-1 p-2">
            {LINKS.map((l) => {
              const isActive = active === l.href.slice(1);
              return (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => {
                    handleNavClick(l.href);
                    setOpen(false);
                  }}
                  className={cn(
                    "relative overflow-hidden rounded-xl border px-4 py-3 text-xs font-medium uppercase tracking-[0.14em] transition-colors",
                    isActive
                      ? "border-white/25 bg-white/10 text-white"
                      : "border-white/10 bg-white/[0.03] text-white/65 hover:border-white/20 hover:bg-white/[0.07] hover:text-white"
                  )}
                >
                  <span
                    className="pointer-events-none absolute inset-0 -translate-x-[130%] bg-gradient-to-r from-transparent via-white/25 to-transparent"
                    style={shining === l.href ? { animation: "shine 0.65s ease-out" } : undefined}
                  />
                  <span className="relative">{l.label}</span>
                </a>
              );
            })}
            <a
              href="/security"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 text-xs font-medium uppercase tracking-[0.14em] text-white/65 transition-colors hover:border-white/30 hover:text-white"
            >
              <Lock className="h-3.5 w-3.5" />
              Security
            </a>
            <button
              onClick={() => {
                setOpen(false);
                onHire();
              }}
              className="mt-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-neutral-950 shadow-md transition-all duration-300 active:scale-[0.98]"
            >
              Hire Me
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}
