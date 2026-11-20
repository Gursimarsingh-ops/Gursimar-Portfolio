import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  Camera,
  Check,
  Database,
  HardDrive,
  KeyRound,
  Loader2,
  Lock,
  LogOut,
  RefreshCw,
  ServerCog,
  ShieldCheck,
  Volume2,
  VolumeX,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api, ApiError, formatBytes, type HealthInfo } from "@/admin/api";
import { VaultDoor, type VaultState } from "./VaultDoor";
import { GuardRobot } from "./GuardRobot";
import { SirenBeacon, SirenRail } from "./SecuritySirens";
import { SystemHealth } from "./SystemHealth";
import { MediaManager } from "./MediaManager";
import { VideoLinkManager } from "./VideoLinkManager";
import { ArtistPhotoManager } from "./ArtistPhotoManager";
import { AiConfigPanel } from "./AiConfigPanel";
import { AdminAccountPanel } from "./AdminAccountPanel";
import { StorageDiagnostics } from "./StorageDiagnostics";
import { isVaultMuted, playAccessResult, playVaultUnlock, setVaultMuted } from "./vaultSound";

/** The existing, separately built portfolio admin console. */
const ADMIN_CONSOLE = "/admin";

const SECTIONS = [
  { id: "vault-section", label: "Vault" },
  { id: "artist-section", label: "Artist" },
  { id: "ai-section", label: "AI assistant" },
  { id: "account-section", label: "Admin account" },
  { id: "media-section", label: "Media" },
  { id: "video-links-section", label: "Video links" },
  { id: "health-section", label: "System health" },
  { id: "ops-section", label: "Operations" },
] as const;

interface MaintenanceState {
  enabled: boolean;
  updatedAt: string | null;
}

async function readJson<T>(path: string): Promise<T> {
  const response = await fetch(path, {
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  });
  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }
  if (!response.ok) {
    const message =
      data && typeof data === "object" && "error" in data && typeof (data as { error: unknown }).error === "string"
        ? (data as { error: string }).error
        : `Request failed (${response.status}).`;
    throw new ApiError(message, response.status);
  }
  return data as T;
}

async function postJson<T>(path: string, payload: unknown): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    credentials: "same-origin",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }
  if (!response.ok) {
    const message =
      data && typeof data === "object" && "error" in data && typeof (data as { error: unknown }).error === "string"
        ? (data as { error: string }).error
        : `Request failed (${response.status}).`;
    throw new ApiError(message, response.status);
  }
  return data as T;
}

function formatWhen(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ------------------------------- primitives ------------------------------- */

function SectionHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[9px] uppercase tracking-[0.3em] text-white/35">{eyebrow}</p>
        <h2 className="mt-1 font-serif text-xl leading-tight tracking-tight text-white sm:text-2xl">{title}</h2>
        {description && <p className="mt-1.5 max-w-xl text-[11px] leading-relaxed text-white/40">{description}</p>}
      </div>
      {action}
    </div>
  );
}

function Panel({
  icon: Icon,
  title,
  hint,
  children,
  className,
}: {
  icon: typeof ShieldCheck;
  title: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex min-w-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.055] to-white/[0.012] p-5",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.07)] backdrop-blur",
        className
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
      <div className="flex items-start gap-2.5">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/12 bg-white/[0.05] text-white/70">
          <Icon className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[10px] uppercase tracking-[0.22em] text-white/70">{title}</p>
          {hint && <p className="mt-1 text-[10px] leading-relaxed text-white/35">{hint}</p>}
        </div>
      </div>
      <div className="mt-4 text-[12px] leading-relaxed text-white/60">{children}</div>
    </div>
  );
}

function Row({ label, value, ok }: { label: string; value: ReactNode; ok?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] py-2 last:border-b-0">
      <span className="shrink-0 text-[11px] text-white/40">{label}</span>
      <span
        className={cn(
          "flex min-w-0 items-center gap-1.5 text-right text-[11px] font-medium",
          ok === undefined ? "text-white/75" : ok ? "text-emerald-300/90" : "text-amber-300/90"
        )}
      >
        {ok !== undefined && (
          <span className={cn("h-1 w-1 shrink-0 rounded-full", ok ? "bg-emerald-400" : "bg-amber-400")} />
        )}
        <span className="truncate">{value}</span>
      </span>
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: string; tone?: "good" | "warn" }) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-black/25 px-3 py-2">
      <p className="text-[8px] uppercase tracking-[0.2em] text-white/30">{label}</p>
      <p
        className={cn(
          "mt-1 truncate text-[11px] font-medium",
          tone === "good" ? "text-emerald-200/90" : tone === "warn" ? "text-amber-200/90" : "text-white/75"
        )}
      >
        {value}
      </p>
    </div>
  );
}

/* -------------------------------- dashboard ------------------------------- */

export function SecurityDashboard() {
  const [phase, setPhase] = useState<VaultState>("sealed");
  const [session, setSession] = useState<{ email: string | null } | null>(null);
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [health, setHealth] = useState<HealthInfo | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [refreshingHealth, setRefreshingHealth] = useState(false);
  const [lastHealthyAt, setLastHealthyAt] = useState<string | null>(null);
  const [maintenance, setMaintenance] = useState<MaintenanceState | null>(null);
  const [toggling, setToggling] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [muted, setMuted] = useState(() => isVaultMuted());
  const [activeSection, setActiveSection] = useState<string>(SECTIONS[0].id);
  const openTimer = useRef<number | null>(null);

  useEffect(() => {
    document.title = "Security & Maintenance · GurSimar Singh";
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    return () => {
      document.head.removeChild(meta);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    api
      .session()
      .then((result) => {
        if (cancelled) return;
        setSession({ email: result.email });
        setPhase("open");
      })
      .catch(() => {
        if (!cancelled) setSession(null);
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });

    return () => {
      cancelled = true;
      if (openTimer.current) window.clearTimeout(openTimer.current);
    };
  }, []);

  const loadDiagnostics = useCallback(async () => {
    if (!session) return;
    setRefreshingHealth(true);
    setHealthError(null);
    try {
      const [nextHealth, nextMaintenance] = await Promise.all([
        readJson<HealthInfo>("/api/admin/health"),
        readJson<MaintenanceState>("/api/admin/maintenance"),
      ]);
      setHealth(nextHealth);
      setMaintenance(nextMaintenance);
      if (nextHealth.summary?.healthy) setLastHealthyAt(nextHealth.checkedAt);
    } catch (err) {
      setHealthError(err instanceof ApiError ? err.message : "Could not read diagnostics.");
    } finally {
      setRefreshingHealth(false);
    }
  }, [session]);

  useEffect(() => {
    void loadDiagnostics();
  }, [loadDiagnostics]);

  // Keep the health readout honest: re-run the checks while the dashboard is open.
  useEffect(() => {
    if (!session) return;
    const timer = window.setInterval(() => void loadDiagnostics(), 30000);
    return () => window.clearInterval(timer);
  }, [session, loadDiagnostics]);

  // Scroll-spy keeps the section rail in sync with what is on screen.
  useEffect(() => {
    const nodes = SECTIONS.map((section) => document.getElementById(section.id)).filter(
      (node): node is HTMLElement => Boolean(node)
    );
    if (!nodes.length || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) setActiveSection(visible.target.id);
      },
      { rootMargin: "-96px 0px -55% 0px", threshold: [0.05, 0.25, 0.5] }
    );

    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  const turnWheel = () => {
    if (phase !== "sealed") return;
    playVaultUnlock();
    setPhase("unlocking");
    setNotice(null);
    setError(null);
    openTimer.current = window.setTimeout(() => setPhase("open"), 1750);
  };

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const result = await api.login(email.trim(), password);
      setPassword("");
      playAccessResult(true);
      setSession({ email: result.email });
      setSuccess(true);
      window.setTimeout(() => window.location.assign(ADMIN_CONSOLE), 1100);
    } catch (err) {
      playAccessResult(false);
      setError(err instanceof ApiError ? err.message : "Sign-in failed. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch {
      /* the session may already be gone */
    }
    setSession(null);
    setHealth(null);
    setMaintenance(null);
    setPhase("sealed");
    setSuccess(false);
    setPassword("");
    setNotice("Signed out. The vault has resealed.");
  };

  const toggleMaintenance = async (enabled: boolean) => {
    setToggling(true);
    setNotice(null);
    try {
      const next = await postJson<MaintenanceState>("/api/admin/maintenance", { enabled });
      setMaintenance(next);
      setNotice(
        enabled
          ? "Maintenance mode enabled. Visitors now see the full-screen maintenance page."
          : "Maintenance mode disabled. The public site is back to normal."
      );
    } catch (err) {
      setNotice(err instanceof ApiError ? err.message : "Could not update maintenance mode.");
    } finally {
      setToggling(false);
    }
  };

  const authenticated = Boolean(session);
  const https = typeof window !== "undefined" && window.location.protocol === "https:";

  return (
    <div className="min-h-screen bg-[#05070a] text-neutral-200 antialiased">
      {/* facility atmosphere */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(120%_100%_at_20%_-10%,#1c232c_0%,#0b0e13_48%,#040507_100%)]" />
      <div className="pointer-events-none fixed inset-0 opacity-[0.16] [background-image:linear-gradient(to_right,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:56px_56px]" />
      <div className="pointer-events-none fixed -left-24 top-10 h-72 w-72 rounded-full bg-cyan-400/10 blur-[110px]" />
      <div
        className="pointer-events-none fixed right-0 top-20 h-80 w-80 rounded-full bg-red-500/[0.09] blur-[120px]"
        style={{ animation: "siren-wash 4.6s ease-in-out infinite" }}
      />
      <div
        className="pointer-events-none fixed bottom-0 left-1/3 h-64 w-96 rounded-full bg-red-600/[0.06] blur-[130px]"
        style={{ animation: "siren-wash 6.2s ease-in-out infinite reverse" }}
      />

      {/* ------------------------------ top bar ------------------------------ */}
      <header className="relative z-40 border-b border-white/[0.07] bg-[#05070a]/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3.5 sm:px-6">
          <a
            href="/"
            className="group inline-flex min-w-0 items-center gap-2 text-[10px] uppercase tracking-[0.24em] text-white/45 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5 shrink-0 transition-transform group-hover:-translate-x-0.5" />
            <span className="truncate">Portfolio</span>
          </a>

          <span className="hidden text-[9px] uppercase tracking-[0.34em] text-white/25 md:block">
            Secure facility · Level 01
          </span>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const next = !muted;
                setMuted(next);
                setVaultMuted(next);
              }}
              aria-label={muted ? "Enable vault sound" : "Mute vault sound"}
              title={muted ? "Enable vault sound" : "Mute vault sound"}
              className="grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-white/45 transition-colors hover:border-white/25 hover:text-white"
            >
              {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
            </button>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[9px] uppercase tracking-[0.18em] text-white/55">
              <span
                className={cn("h-1.5 w-1.5 rounded-full", authenticated ? "bg-emerald-400" : "bg-amber-400")}
                style={{ animation: "vault-led 2.6s ease-in-out infinite" }}
              />
              <span className="hidden sm:inline">
                {checking ? "Verifying" : authenticated ? "Session active" : "Sealed"}
              </span>
              <span className="sm:hidden">{authenticated ? "Active" : "Sealed"}</span>
            </span>
            {authenticated && (
              <a
                href={ADMIN_CONSOLE}
                className="hidden items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-neutral-950 transition-colors hover:bg-neutral-200 lg:inline-flex"
              >
                Admin console
                <ArrowUpRight className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-20 pt-8 sm:px-6">
        <SirenRail className="mb-7" />

        <div className="flex flex-wrap items-end justify-between gap-5">
          <div className="max-w-2xl">
            <p className="text-[10px] uppercase tracking-[0.3em] text-white/35">Security &amp; maintenance</p>
            <h1 className="mt-2.5 font-serif text-3xl leading-tight tracking-tight text-white sm:text-4xl">
              Strongroom access.
            </h1>
            <p className="mt-2.5 max-w-xl text-[13px] leading-relaxed text-white/45">
              Turn the wheel to unseal the vault, then authenticate against the live server. Diagnostics,
              maintenance mode and content control all read from the deployed Worker.
            </p>
          </div>
          <div className="grid w-full grid-cols-3 gap-2 sm:w-auto sm:min-w-[280px]">
            <StatCard
              label="Access"
              value={checking ? "Checking" : authenticated ? "Unsealed" : "Sealed"}
              tone={authenticated ? "good" : "warn"}
            />
            <StatCard
              label="Health"
              value={health ? (health.summary.failures ? "Attention" : "Nominal") : "—"}
              tone={health ? (health.summary.failures ? "warn" : "good") : undefined}
            />
            <StatCard
              label="Maintenance"
              value={maintenance ? (maintenance.enabled ? "Live" : "Off") : authenticated ? "—" : "Locked"}
              tone={maintenance ? (maintenance.enabled ? "warn" : "good") : undefined}
            />
          </div>
        </div>

        {/* --------------------------- section rail --------------------------- */}
        <nav
          aria-label="Dashboard sections"
          className="sticky top-0 z-30 -mx-4 mt-7 border-y border-white/[0.07] bg-[#05070a]/90 px-4 py-2 backdrop-blur-md sm:-mx-6 sm:px-6"
        >
          <ul className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {SECTIONS.map((section) => (
              <li key={section.id} className="shrink-0">
                <a
                  href={`#${section.id}`}
                  aria-current={activeSection === section.id ? "true" : undefined}
                  className={cn(
                    "inline-flex rounded-full px-3 py-1.5 text-[9px] uppercase tracking-[0.18em] transition-colors",
                    activeSection === section.id
                      ? "bg-white/10 text-white"
                      : "text-white/45 hover:bg-white/[0.06] hover:text-white"
                  )}
                >
                  {section.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* ------------------------------ vault ------------------------------ */}
        <section id="vault-section" className="mt-7 grid scroll-mt-24 gap-5 lg:grid-cols-12">
          <div className="min-w-0 lg:col-span-7">
            <VaultDoor state={phase} onTurnWheel={turnWheel}>
              <div
                className={cn(
                  "transition-opacity duration-500",
                  phase === "sealed" ? "invisible opacity-0" : "visible opacity-100"
                )}
              >
                {authenticated ? (
                  <div className="flex h-full flex-col justify-center">
                    <span className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1.5 text-[9px] uppercase tracking-[0.22em] text-emerald-200">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Access granted
                    </span>
                    <h2 className="mt-4 font-serif text-2xl tracking-tight text-white">Vault unlocked.</h2>
                    <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-white/50">
                      Signed in as <span className="text-white/80">{session?.email ?? "administrator"}</span>. The
                      session cookie is HttpOnly, SameSite=Strict and validated by the Worker on every request.
                    </p>

                    <div className="mt-6 flex flex-wrap items-center gap-2">
                      <a
                        href={ADMIN_CONSOLE}
                        className="group inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-950 transition-all hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
                      >
                        Open portfolio admin
                        <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </a>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2.5 text-[10px] uppercase tracking-[0.14em] text-white/60 transition-all hover:-translate-y-0.5 hover:border-white/30 hover:text-white"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        Logout
                      </button>
                    </div>

                    <p className="mt-5 text-[9px] uppercase tracking-[0.18em] text-white/30">
                      Session expires after 7 days · server-verified
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleLogin} className="mx-auto flex h-full w-full max-w-sm flex-col justify-center">
                    <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/12 bg-white/[0.05] px-3 py-1.5 text-[9px] uppercase tracking-[0.22em] text-white/60">
                      <KeyRound className="h-3.5 w-3.5" />
                      Administrator authentication
                    </span>

                    <h2 className="mt-4 font-serif text-2xl tracking-tight text-white">Identify yourself.</h2>
                    <p className="mt-2 text-[12px] leading-relaxed text-white/45">
                      Credentials are verified by the server with PBKDF2. They are never stored in this page or in
                      the bundle.
                    </p>

                    <div className="mt-5 space-y-3">
                      <label className="block">
                        <span className="text-[9px] uppercase tracking-[0.24em] text-white/40">Gmail address</span>
                        <input
                          type="email"
                          required
                          autoComplete="username"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@gmail.com"
                          className="mt-1.5 w-full rounded-xl border border-white/12 bg-black/40 px-3.5 py-2.5 text-[13px] text-white placeholder:text-white/25 outline-none transition-colors focus:border-cyan-300/40 focus:bg-black/60"
                        />
                      </label>
                      <label className="block">
                        <span className="text-[9px] uppercase tracking-[0.24em] text-white/40">Password</span>
                        <input
                          type="password"
                          required
                          autoComplete="current-password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••••"
                          className="mt-1.5 w-full rounded-xl border border-white/12 bg-black/40 px-3.5 py-2.5 text-[13px] text-white placeholder:text-white/25 outline-none transition-colors focus:border-cyan-300/40 focus:bg-black/60"
                        />
                      </label>
                    </div>

                    {error && (
                      <p
                        role="alert"
                        className="mt-3 flex items-start gap-2 rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2.5 text-[11px] text-red-200"
                      >
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        {error}
                      </p>
                    )}
                    {success && (
                      <p
                        role="status"
                        className="mt-3 flex items-start gap-2 rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-3 py-2.5 text-[11px] text-emerald-200"
                      >
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        Verified. Opening the portfolio admin console.
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={busy || success}
                      className="group relative mt-4 inline-flex items-center justify-center gap-2 overflow-hidden rounded-full bg-white px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-950 transition-all hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <span className="pointer-events-none absolute inset-0 -translate-x-full skew-x-[-14deg] bg-gradient-to-r from-transparent via-neutral-300/60 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                      {busy ? (
                        <>
                          <Loader2 className="relative h-3.5 w-3.5 animate-spin" />
                          Verifying
                        </>
                      ) : (
                        <>
                          <Lock className="relative h-3.5 w-3.5" />
                          Unlock console
                        </>
                      )}
                    </button>

                    <p className="mt-4 text-[9px] uppercase tracking-[0.18em] text-white/25">
                      Failed attempts are throttled · origin checked on sign-in
                    </p>
                  </form>
                )}
              </div>
            </VaultDoor>
          </div>

          <div className="flex min-w-0 flex-col gap-5 lg:col-span-5">
            {/* guard unit */}
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-[#1a2029] via-[#11151b] to-[#080a0e] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              <div className="pointer-events-none absolute inset-0 opacity-[0.18] [background-image:linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:22px_22px]" />
              <div
                className="pointer-events-none absolute inset-0 mix-blend-screen"
                style={{
                  background:
                    "radial-gradient(60% 45% at 88% 0%, rgba(255,60,60,0.22) 0%, transparent 70%), radial-gradient(45% 40% at 4% 12%, rgba(255,80,80,0.12) 0%, transparent 75%)",
                  animation: "siren-wash 4.6s ease-in-out infinite",
                }}
              />

              <div className="relative flex items-start justify-between gap-3 px-5 pb-2 pt-4">
                <div className="min-w-0">
                  <p className="text-[9px] uppercase tracking-[0.28em] text-white/35">Unit S-04</p>
                  <p className="mt-1 text-[12px] tracking-tight text-white/70">Heavy patrol custodian</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <SirenBeacon size={22} delay="-1.1s" />
                  <span className="flex items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2 py-0.5 text-[8px] uppercase tracking-[0.16em] text-emerald-200/90">
                    <span
                      className="h-1 w-1 rounded-full bg-emerald-400"
                      style={{ animation: "vault-led 2.2s ease-in-out infinite" }}
                    />
                    On station
                  </span>
                </div>
              </div>

              <div className="relative flex h-[300px] items-end justify-center overflow-hidden px-4 sm:h-[330px]">
                <GuardRobot className="h-full w-auto max-w-full drop-shadow-[0_18px_30px_rgba(0,0,0,0.55)]" />
              </div>

              <div className="relative grid grid-cols-3 divide-x divide-white/[0.07] border-t border-white/[0.07]">
                {[
                  { label: "Uniform", value: "Patrol" },
                  { label: "Sensors", value: "Nominal" },
                  { label: "Warrant", value: "Active" },
                ].map((item) => (
                  <div key={item.label} className="px-2 py-2.5 text-center">
                    <p className="text-[8px] uppercase tracking-[0.16em] text-white/30">{item.label}</p>
                    <p className="mt-0.5 text-[10px] text-white/65">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* facility status */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <p className="text-[9px] uppercase tracking-[0.26em] text-white/35">Facility status</p>
              <div className="mt-2">
                <Row label="Vault" value={phase === "open" ? "Open" : "Sealed"} ok={phase === "open"} />
                <Row
                  label="Authentication"
                  value={checking ? "Checking…" : authenticated ? "Verified" : "Not signed in"}
                  ok={authenticated}
                />
                <Row
                  label="Maintenance"
                  value={maintenance ? (maintenance.enabled ? "Enabled" : "Off") : authenticated ? "Reading…" : "Locked"}
                  ok={maintenance ? !maintenance.enabled : undefined}
                />
              </div>
            </div>
          </div>
        </section>

        {/* --------------------------- artist profile --------------------------- */}
        <div className="mt-10">
          <SectionHeading
            eyebrow="Public identity"
            title="Artist profile"
            description="The photograph held by the two robots in the public Artist section. Saves immediately and persists across refreshes."
          />
          {authenticated ? (
            <ArtistPhotoManager />
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-[11px] leading-relaxed text-white/40">
              <span className="flex items-center gap-2 text-white/60">
                <Lock className="h-3.5 w-3.5" />
                Locked
              </span>
              <p className="mt-2">
                Unseal the vault and sign in to change the artist photograph. The upload is stored in Backblaze B2 and
                indexed in D1, never in the browser.
              </p>
            </div>
          )}
        </div>

        {/* ---------------------------- AI assistant ---------------------------- */}
        <div id="ai-section" className="mt-10 scroll-mt-24">
          <SectionHeading
            eyebrow="Assistant control"
            title="AI configuration"
            description="NVIDIA NIM credentials, model, endpoint and knowledge are stored server-side in D1 and applied to live replies. The key is never returned to the browser."
            action={
              <span className="hidden max-w-xs text-right text-[9px] uppercase leading-relaxed tracking-[0.14em] text-white/25 sm:block">
                Real connection tests · no simulated status
              </span>
            }
          />

          {authenticated ? (
            <AiConfigPanel />
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-[11px] leading-relaxed text-white/40">
              <span className="flex items-center gap-2 text-white/60">
                <Lock className="h-3.5 w-3.5" />
                Locked
              </span>
              <p className="mt-2">
                Unseal the vault and sign in to manage the AI provider key, model, endpoint and assistant
                knowledge. These settings are stored in D1 and read by the Worker on every request.
              </p>
            </div>
          )}
        </div>

        {/* --------------------------- admin account --------------------------- */}
        <div id="account-section" className="mt-10 scroll-mt-24">
          <SectionHeading
            eyebrow="Security settings"
            title="Admin account"
            description="Change the email and password used to sign in. Credentials are stored hashed in D1 and apply to the next sign-in immediately."
          />

          {authenticated ? (
            <AdminAccountPanel />
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-[11px] leading-relaxed text-white/40">
              <span className="flex items-center gap-2 text-white/60">
                <Lock className="h-3.5 w-3.5" />
                Locked
              </span>
              <p className="mt-2">Sign in to change the administrator email or password.</p>
            </div>
          )}
        </div>

        {/* ------------------------------- media ------------------------------- */}
        <div id="media-section" className="mt-10 scroll-mt-24">
          <SectionHeading
            eyebrow="Content control"
            title="Media management"
            description="Uploads are written to the private Backblaze B2 bucket and indexed in D1. Publishing updates the public portfolio immediately."
            action={
              <span className="hidden max-w-xs text-right text-[9px] uppercase leading-relaxed tracking-[0.14em] text-white/25 sm:block">
                LED screens · video projects
              </span>
            }
          />

          {authenticated ? (
            <div className="space-y-5">
              <MediaManager kind="graphic" />
              <MediaManager kind="video" />
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-[11px] leading-relaxed text-white/40">
              Locked. Uploading, editing, reordering and publishing media requires an authenticated administrator
              session. Unseal the vault and sign in to manage the portfolio.
            </div>
          )}
        </div>

        {/* --------------------------- video link manager --------------------------- */}
        <div id="video-links-section" className="mt-10 scroll-mt-24">
          <SectionHeading
            eyebrow="External video publishing"
            title="Video Link Manager"
            description="Publish YouTube, Vimeo or direct-file videos into the existing Video Editing LED screens. Covers, crop, filters, aspect ratio and order are stored in D1."
            action={
              <span className="hidden max-w-xs text-right text-[9px] uppercase leading-relaxed tracking-[0.14em] text-white/25 sm:block">
                No file upload required · aspect-aware LED panels
              </span>
            }
          />

          {authenticated ? (
            <VideoLinkManager />
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-[11px] leading-relaxed text-white/40">
              Locked. Sign in to publish, preview, edit or remove external video links.
            </div>
          )}
        </div>

        {/* ------------------------------- health ------------------------------- */}
        <div id="health-section" className="mt-10 scroll-mt-24">
          <SectionHeading
            eyebrow="Live diagnostics"
            title="System health"
            description="Every row is probed on request — no simulated statuses."
          />
          <SystemHealth
            health={health}
            error={healthError}
            loading={refreshingHealth}
            lastSuccessAt={lastHealthyAt}
            onRefresh={() => void loadDiagnostics()}
          />
          {authenticated && <StorageDiagnostics />}
        </div>

        {/* ----------------------------- operations ----------------------------- */}
        <div id="ops-section" className="mt-10 scroll-mt-24">
          <SectionHeading eyebrow="Control surface" title="Operations" />

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            <Panel icon={ShieldCheck} title="Security overview" hint="Server-verified controls">
              <Row label="Session" value={authenticated ? "Active" : "None"} ok={authenticated} />
              <Row label="Cookie" value="HttpOnly · SameSite=Strict" />
              <Row label="Origin check" value="Enforced on mutations" ok />
              <Row label="Login throttling" value="8 attempts / 15 min" ok />
              <Row label="Transport" value={https ? "HTTPS" : "HTTP (local)"} ok={https} />
            </Panel>

            <Panel icon={KeyRound} title="Authentication status" hint="Live server session">
              {checking ? (
                <p className="flex items-center gap-2 text-white/40">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking session…
                </p>
              ) : authenticated ? (
                <>
                  <Row label="Administrator" value={session?.email ?? "—"} />
                  <Row label="Session type" value="Server-side token (hashed)" ok />
                  <Row label="Vault" value={phase === "open" ? "Unsealed" : "Sealed"} ok={phase === "open"} />
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/15 px-3.5 py-2 text-[10px] uppercase tracking-[0.16em] text-white/60 transition-colors hover:border-white/30 hover:text-white"
                  >
                    <LogOut className="h-3 w-3" />
                    End session
                  </button>
                </>
              ) : (
                <>
                  <Row label="Administrator" value="—" />
                  <Row label="Session" value="Not signed in" ok={false} />
                  <p className="mt-3 text-[11px] text-white/35">
                    Turn the vault wheel and sign in to establish a server session.
                  </p>
                </>
              )}
            </Panel>

            <Panel icon={Activity} title="Runtime environment" hint="Read from the Worker">
              {!authenticated ? (
                <p className="text-[11px] text-white/35">
                  Locked. Live diagnostics are only served to an authenticated session.
                </p>
              ) : healthError ? (
                <p className="flex items-start gap-2 text-[11px] text-amber-200/80">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {healthError}
                </p>
              ) : health ? (
                <>
                  <Row
                    label="Stored assets"
                    value={`${health.database.objects} · ${formatBytes(health.database.bytes)}`}
                  />
                  <Row
                    label="Isolate uptime"
                    value={
                      health.uptimeSeconds < 90 ? `${health.uptimeSeconds}s` : `${Math.floor(health.uptimeSeconds / 60)} min`
                    }
                  />
                  <Row label="Edge" value={health.edge.colo ?? "Local"} />
                  <Row
                    label="Maintenance"
                    value={health.maintenance.enabled ? "Page live" : "Off"}
                    ok={!health.maintenance.enabled}
                  />
                </>
              ) : (
                <p className="flex items-center gap-2 text-white/40">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading diagnostics…
                </p>
              )}
            </Panel>

            <Panel icon={Wrench} title="Website maintenance mode" hint="Stored in D1 · hides the public site">
              {!authenticated ? (
                <p className="text-[11px] text-white/35">
                  Locked. Maintenance mode can only be changed by an authenticated administrator.
                </p>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/30 px-3.5 py-3">
                    <div className="min-w-0">
                      <p className="text-[11px] text-white/70">
                        {maintenance?.enabled ? "Full-screen maintenance page is live" : "Site is serving normally"}
                      </p>
                      <p className="mt-0.5 text-[9px] uppercase tracking-[0.16em] text-white/30">
                        Updated {formatWhen(maintenance?.updatedAt)}
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={Boolean(maintenance?.enabled)}
                      aria-label="Toggle maintenance mode"
                      disabled={toggling || !maintenance}
                      onClick={() => void toggleMaintenance(!maintenance?.enabled)}
                      className={cn(
                        "relative h-6 w-11 shrink-0 rounded-full border transition-colors disabled:opacity-50",
                        maintenance?.enabled ? "border-amber-300/40 bg-amber-400/80" : "border-white/15 bg-white/10"
                      )}
                    >
                      <span
                        className={cn(
                          "absolute top-0.5 h-[18px] w-[18px] rounded-full bg-white transition-transform",
                          maintenance?.enabled ? "translate-x-[22px]" : "translate-x-0.5"
                        )}
                      />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => void loadDiagnostics()}
                    className="mt-3 inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-white/40 transition-colors hover:text-white"
                  >
                    <RefreshCw className="h-3 w-3" /> Refresh
                  </button>
                  {notice && <p className="mt-3 text-[11px] leading-relaxed text-white/55">{notice}</p>}
                </>
              )}
            </Panel>

            <Panel icon={Camera} title="Artist photo" hint="Shown between the two robots">
              {!authenticated ? (
                <p className="text-[11px] text-white/35">
                  Locked. Sign in to upload, replace or delete the artist photograph.
                </p>
              ) : (
                <>
                  <p className="text-[11px] leading-relaxed text-white/50">
                    Managed in the Artist profile section above. The photo is stored in Backblaze B2 and referenced from D1, so
                    it survives refreshes and redeploys.
                  </p>
                  <a
                    href="#artist-section"
                    className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/15 px-3.5 py-2 text-[10px] uppercase tracking-[0.16em] text-white/65 transition-colors hover:border-white/30 hover:text-white"
                  >
                    <Camera className="h-3 w-3" />
                    Manage photo
                  </a>
                </>
              )}
            </Panel>

            <Panel icon={ServerCog} title="Admin access" hint="Existing portfolio console">
              <p className="text-[11px] text-white/45">
                Uploads, project management, categories, requests, chat and storage status live in the existing admin
                console.
              </p>
              {authenticated ? (
                <a
                  href={ADMIN_CONSOLE}
                  className="group mt-4 inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-950 transition-all hover:-translate-y-0.5"
                >
                  Enter admin console
                  <ArrowUpRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setNotice("Authenticate through the vault to reach the admin console.");
                    setPhase("open");
                  }}
                  className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/15 px-3.5 py-2 text-[10px] uppercase tracking-[0.16em] text-white/55 transition-colors hover:border-white/30 hover:text-white"
                >
                  <Lock className="h-3 w-3" />
                  Unlock access
                </button>
              )}
            </Panel>

            <Panel icon={Database} title="Website management" hint="What the admin console controls">
              <ul className="space-y-1.5">
                {[
                  "Graphic uploads and video uploads",
                  "Manage published projects and drafts",
                  "Categories and storage / upload status",
                  "Public portfolio publish / unpublish",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-[11px] text-white/50">
                    <span className="mt-[6px] h-1 w-1 shrink-0 rounded-full bg-white/30" />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="mt-3 flex items-start gap-2 text-[10px] text-white/30">
                <HardDrive className="mt-0.5 h-3 w-3 shrink-0" />
                Assets are served from the private Backblaze B2 bucket; project records live in D1.
              </p>
            </Panel>
          </div>
        </div>

        <p className="mt-8 text-[10px] leading-relaxed text-white/45">
          This facility never fakes monitoring: session state, diagnostics and maintenance mode are read from the
          deployed Worker. The vault wheel is only an entry interaction; access is enforced by the server on every
          protected request.
        </p>
      </main>
    </div>
  );
}
