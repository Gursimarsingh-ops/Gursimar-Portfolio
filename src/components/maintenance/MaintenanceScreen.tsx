import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Check, Loader2, Lock, Mail, RefreshCw, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

const CONTACT_EMAIL = "gursimarsingh9390@gmail.com";

async function readMaintenance(): Promise<boolean | null> {
  try {
    const response = await fetch("/api/site/status", {
      cache: "no-store",
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { maintenance?: boolean };
    return Boolean(data?.maintenance);
  } catch {
    return null;
  }
}

/**
 * Full-screen closure shown to visitors while the administrator has maintenance
 * mode switched on. The state comes from D1 through /api/site/status, so a
 * refresh cannot bypass it and the page disappears as soon as it is switched off.
 */
export function MaintenanceScreen() {
  const [checking, setChecking] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const refresh = useCallback(async (manual: boolean) => {
    if (manual) {
      setChecking(true);
      setNote(null);
    }
    const enabled = await readMaintenance();
    if (enabled === false) {
      window.location.reload();
      return;
    }
    if (manual) {
      setNote(
        enabled === null
          ? "Could not reach the server. Please check your connection and try again."
          : "The site is still under maintenance. Please check back shortly."
      );
    }
    if (manual) setChecking(false);
  }, []);

  useEffect(() => {
    // Re-check quietly so the portfolio returns by itself once work is complete.
    const timer = window.setInterval(() => void refresh(false), 15000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[#05070a] text-neutral-200 antialiased">
      {/* deep atmospheric field */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_100%_at_18%_-10%,#232a33_0%,#0b0f14_48%,#040507_100%)]" />
      <div
        className="pointer-events-none absolute -left-40 top-[-10rem] h-[34rem] w-[34rem] rounded-full bg-cyan-300/[0.07] blur-[130px]"
        style={{ animation: "maintenance-drift 26s ease-in-out infinite" }}
      />
      <div
        className="pointer-events-none absolute -right-32 bottom-[-12rem] h-[30rem] w-[30rem] rounded-full bg-indigo-300/[0.06] blur-[130px]"
        style={{ animation: "maintenance-drift 34s ease-in-out infinite reverse" }}
      />
      <div className="pointer-events-none absolute inset-0 opacity-[0.14] [background-image:linear-gradient(to_right,rgba(255,255,255,0.07)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.07)_1px,transparent_1px)] [background-size:72px_72px]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_70%_at_50%_50%,transparent_20%,rgba(4,5,7,0.7)_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-5 py-5 sm:px-8">
        <div className="flex items-center gap-3">
          <span className="relative grid h-10 w-10 place-items-center overflow-hidden rounded-xl border border-white/15 bg-gradient-to-b from-neutral-600 to-neutral-900 text-[11px] font-semibold tracking-wide text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_16px_30px_-22px_rgba(0,0,0,0.95)]">
            <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_120%_at_30%_0%,rgba(255,255,255,0.24),transparent_65%)]" />
            GS
          </span>
          <div className="leading-none">
            <p className="font-serif text-base tracking-tight text-white">GurSimar Singh</p>
            <p className="mt-1.5 text-[8px] uppercase tracking-[0.28em] text-white/40">Video Editor / Graphic Designer</p>
          </div>
        </div>
        <span className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[9px] uppercase tracking-[0.2em] text-white/50 sm:inline-flex">
          <span
            className="h-1.5 w-1.5 rounded-full bg-amber-300"
            style={{ animation: "pulse 2.6s ease-in-out infinite" }}
          />
          Maintenance in progress
        </span>
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-5 py-10 sm:px-8">
        <div className="maintenance-rise relative w-full max-w-xl">
          {/* layered glass card */}
          <div className="relative overflow-hidden rounded-[28px] border border-white/12 bg-[linear-gradient(165deg,rgba(32,37,44,0.85)_0%,rgba(12,15,19,0.9)_55%,rgba(6,8,10,0.94)_100%)] p-7 shadow-[0_60px_140px_-60px_rgba(0,0,0,1),inset_0_1px_0_rgba(255,255,255,0.09)] backdrop-blur-2xl sm:p-10">
            <span className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/45 to-transparent" />
            <span className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/[0.06] blur-3xl" />
            <span className="pointer-events-none absolute inset-0 opacity-[0.05] [background-image:radial-gradient(rgba(255,255,255,0.9)_0.5px,transparent_0.5px)] [background-size:3px_3px]" />

            <div className="relative flex items-start justify-between gap-4">
              <span className="inline-flex items-center gap-2 rounded-full border border-amber-300/25 bg-amber-400/10 px-3 py-1.5 text-[9px] uppercase tracking-[0.24em] text-amber-200/90">
                <Wrench className="h-3 w-3" />
                Website maintenance
              </span>
              <span className="relative grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-white/12 bg-white/[0.05] text-white/70">
                <span className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(120%_120%_at_30%_0%,rgba(255,255,255,0.18),transparent_65%)]" />
                <Lock className="relative h-5 w-5" />
              </span>
            </div>

            <h1 className="relative mt-6 font-serif text-[2rem] leading-[1.08] tracking-tight text-white sm:text-[2.6rem]">
              We&apos;re making
              <br />
              <span className="bg-gradient-to-r from-white via-neutral-300 to-neutral-500 bg-clip-text text-transparent">
                improvements.
              </span>
            </h1>

            <p className="relative mt-4 max-w-md text-sm leading-7 text-white/70 sm:text-[15px]">
              We&apos;re making improvements. Please check back shortly.
            </p>

            <p className="relative mt-3 max-w-md text-[11px] leading-relaxed text-white/35">
              The portfolio is being updated. Everything will reopen on this same address once
              the work is finished.
            </p>

            <div className="relative mt-7 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
              <button
                type="button"
                onClick={() => void refresh(true)}
                disabled={checking}
                className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full bg-white px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-950 shadow-[0_16px_34px_-24px_rgba(0,0,0,0.9)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-neutral-200 active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="pointer-events-none absolute inset-0 -translate-x-full skew-x-[-14deg] bg-gradient-to-r from-transparent via-black/10 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                {checking ? (
                  <Loader2 className="relative h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="relative h-3.5 w-3.5" />
                )}
                <span className="relative">{checking ? "Checking" : "Check again"}</span>
              </button>

              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full border border-white/15 bg-white/[0.04] px-5 py-3 text-[11px] uppercase tracking-[0.16em] text-white/70 transition-all duration-300 hover:-translate-y-0.5 hover:border-white/30 hover:text-white"
              >
                <Mail className="h-3.5 w-3.5" />
                Email me
              </a>
            </div>

            {note && (
              <p
                role="status"
                className={cn(
                  "relative mt-4 flex items-start gap-2 rounded-xl border px-3 py-2.5 text-[10px] leading-relaxed",
                  note.startsWith("The site") || note.startsWith("Could not")
                    ? "border-amber-300/25 bg-amber-400/10 text-amber-100"
                    : "border-white/15 bg-white/[0.05] text-white/65"
                )}
              >
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                {note}
              </p>
            )}

            <div className="relative mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/10 pt-4 text-[9px] uppercase tracking-[0.18em] text-white/30">
              <span className="flex items-center gap-1.5">
                <Check className="h-3 w-3 text-emerald-300/70" />
                Closed to visitors
              </span>
              <span>Automatic reopening</span>
            </div>
          </div>

          <p className="mt-5 text-center text-[9px] uppercase tracking-[0.2em] text-white/25">
            © 2026 GurSimar Singh Chawla
          </p>
        </div>
      </main>

      <footer className="relative z-10 mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-5 pb-6 text-[9px] uppercase tracking-[0.18em] text-white/25 sm:flex-row sm:px-8">
        <span>Portfolio temporarily closed</span>
        <a
          href="/security"
          className="inline-flex items-center gap-1.5 transition-colors hover:text-white/70"
        >
          <Lock className="h-2.5 w-2.5" />
          Administrator access
        </a>
      </footer>
    </div>
  );
}
