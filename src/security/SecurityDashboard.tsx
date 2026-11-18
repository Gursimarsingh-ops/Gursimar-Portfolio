import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
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
import { isVaultMuted, playAccessResult, playVaultUnlock, setVaultMuted } from "./vaultSound";

/** The existing, separately built portfolio admin console. */
const ADMIN_CONSOLE = "/admin";

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
        "relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.015] p-5 backdrop-blur",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg border border-white/12 bg-white/[0.05] text-white/70">
            <Icon className="h-3.5 w-3.5" />
          </span>
          <div>
            <p className="text-[10px] uppercase tracking-[0.24em] text-white/70">{title}</p>
            {hint && <p className="mt-1 text-[10px] text-white/35">{hint}</p>}
          </div>
        </div>
      </div>
      <div className="mt-4 text-[12px] leading-relaxed text-white/60">{children}</div>
    </div>
  );
}

function Row({ label, value, ok }: { label: string; value: ReactNode; ok?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] py-2 last:border-b-0">
      <span className="text-[11px] text-white/40">{label}</span>
      <span
        className={cn(
          "flex items-center gap-1.5 text-right text-[11px] font-medium",
          ok === undefined ? "text-white/75" : ok ? "text-emerald-300/90" : "text-amber-300/90"
        )}
      >
        {ok !== undefined && (
          <span className={cn("h-1 w-1 rounded-full", ok ? "bg-emerald-400" : "bg-amber-400")} />
        )}
        {value}
      </span>
    </div>
  );
}

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
      setError(
        err instanceof ApiError
          ? err.message
          : "Sign-in failed. Check your connection and try again."
      );
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
      <div className="pointer-events-none fixed inset-0 opacity-[0.18] [background-image:linear-gradient(to_right,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:56px_56px]" />
      <div className="pointer-events-none fixed -left-24 top-10 h-72 w-72 rounded-full bg-cyan-400/10 blur-[110px]" />
      <div
        className="pointer-events-none fixed right-0 top-20 h-80 w-80 rounded-full bg-red-500/[0.09] blur-[120px]"
        style={{ animation: "siren-wash 4.6s ease-in-out infinite" }}
      />
      <div
        className="pointer-events-none fixed bottom-0 left-1/3 h-64 w-96 rounded-full bg-red-600/[0.06] blur-[130px]"
        style={{ animation: "siren-wash 6.2s ease-in-out infinite reverse" }}
      />

      <header className="relative z-10 border-b border-white/[0.07]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-4">
          <a
            href="/"
            className="group inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.24em] text-white/45 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
            Portfolio
          </a>
          <p className="hidden text-[9px] uppercase tracking-[0.34em] text-white/25 sm:block">
            Secure facility · Level 01
          </p>
          <div className="flex items-center gap-2">
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
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[9px] uppercase tracking-[0.2em] text-white/55">
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                authenticated ? "bg-emerald-400" : "bg-amber-400"
              )}
              style={{ animation: "vault-led 2.6s ease-in-out infinite" }}
            />
            {checking ? "Verifying" : authenticated ? "Session active" : "Sealed"}
          </span>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-5 pb-20 pt-10">
        <SirenRail className="mb-8" />
        <div className="max-w-2xl">
          <p className="text-[10px] uppercase tracking-[0.3em] text-white/35">Security &amp; maintenance</p>
          <h1 className="mt-3 font-serif text-3xl leading-tight tracking-tight text-white sm:text-4xl md:text-[2.8rem]">
            Strongroom access.
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/45">
            Turn the wheel to unseal the vault, then authenticate against the live server.
            Nothing on this screen is simulated: diagnostics, maintenance mode and the admin
            console all read from the deployed Worker.
          </p>
        </div>

        <nav aria-label="Dashboard sections" className="sticky top-0 z-30 -mx-5 mt-8 border-y border-white/[0.07] bg-[#05070a]/88 px-5 py-2 backdrop-blur-md sm:-mx-6 sm:px-6">
          <ul className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {[
              { id: "vault-section", label: "Vault" },
              { id: "media-section", label: "Media" },
              { id: "health-section", label: "System health" },
              { id: "ops-section", label: "Operations" },
            ].map((section) => (
              <li key={section.id} className="shrink-0">
                <a
                  href={`#${section.id}`}
                  className="inline-flex rounded-full px-3 py-1.5 text-[9px] uppercase tracking-[0.18em] text-white/45 transition-colors hover:bg-white/[0.06] hover:text-white"
                >
                  {section.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div id="vault-section" className="mt-8 grid scroll-mt-20 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-7">
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
                    <h2 className="mt-4 font-serif text-2xl tracking-tight text-white">
                      Vault unlocked.
                    </h2>
                    <p className="mt-2 max-w-sm text-sm leading-relaxed text-white/50">
                      Signed in as{" "}
                      <span className="text-white/80">{session?.email ?? "administrator"}</span>.
                      The session cookie is HttpOnly, SameSite=Strict and validated by the
                      Worker on every request.
                    </p>

                    <div className="mt-6 flex flex-wrap items-center gap-2">
                      <a
                        href={ADMIN_CONSOLE}
                        className="group inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-950 transition-all hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
                      >
                        Open portfolio admin
                        <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </a>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2.5 text-[11px] uppercase tracking-[0.14em] text-white/60 transition-all hover:-translate-y-0.5 hover:border-white/30 hover:text-white"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        Logout
                      </button>
                    </div>

                    <p className="mt-5 text-[10px] uppercase tracking-[0.18em] text-white/30">
                      Session expires after 7 days · server-verified
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleLogin} className="mx-auto flex h-full max-w-sm flex-col justify-center">
                    <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/12 bg-white/[0.05] px-3 py-1.5 text-[9px] uppercase tracking-[0.22em] text-white/60">
                      <KeyRound className="h-3.5 w-3.5" />
                      Administrator authentication
                    </span>

                    <h2 className="mt-4 font-serif text-2xl tracking-tight text-white">
                      Identify yourself.
                    </h2>
                    <p className="mt-2 text-[12px] leading-relaxed text-white/45">
                      Credentials are verified by the server with PBKDF2. They are never stored
                      in this page or in the bundle.
                    </p>

                    <div className="mt-5 space-y-3">
                      <label className="block">
                        <span className="text-[9px] uppercase tracking-[0.24em] text-white/40">
                          Gmail address
                        </span>
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
                        <span className="text-[9px] uppercase tracking-[0.24em] text-white/40">
                          Password
                        </span>
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

          <div className="space-y-4 lg:col-span-5">
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-[#1a2029] via-[#11151b] to-[#080a0e] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              <div className="pointer-events-none absolute inset-0 opacity-[0.2] [background-image:linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:22px_22px]" />
              {/* siren wash reflecting off the brushed panel */}
              <div
                className="pointer-events-none absolute inset-0 mix-blend-screen"
                style={{
                  background:
                    "radial-gradient(60% 45% at 88% 0%, rgba(255,60,60,0.22) 0%, transparent 70%), radial-gradient(45% 40% at 4% 12%, rgba(255,80,80,0.12) 0%, transparent 75%)",
                  animation: "siren-wash 4.6s ease-in-out infinite",
                }}
              />
              {/* beacon mounted above the guard unit */}
              <div className="absolute right-4 top-3 z-10 flex items-center gap-2">
                <span className="text-[8px] uppercase tracking-[0.26em] text-red-200/45">Beacon</span>
                <SirenBeacon size={24} delay="-1.1s" />
              </div>
              <div className="relative flex items-start justify-between px-5 pt-4">
                <div>
                  <p className="text-[9px] uppercase tracking-[0.28em] text-white/35">Unit S-04</p>
                  <p className="mt-1 text-[11px] tracking-tight text-white/60">Facility custodian</p>
                </div>
                <span className="flex items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-1 text-[8px] uppercase tracking-[0.18em] text-emerald-200/90">
                  <span className="h-1 w-1 rounded-full bg-emerald-400" style={{ animation: "vault-led 2.2s ease-in-out infinite" }} />
                  On station
                </span>
              </div>
              <GuardRobot className="relative mx-auto h-[250px] w-auto px-4 pt-2" />
              <div className="relative grid grid-cols-3 gap-2 border-t border-white/[0.07] px-5 py-3 text-center">
                {[
                  { label: "Uniform", value: "Patrol" },
                  { label: "Sensors", value: "Nominal" },
                  { label: "Warrant", value: "Active" },
                ].map((item) => (
                  <div key={item.label}>
                    <p className="text-[8px] uppercase tracking-[0.18em] text-white/30">{item.label}</p>
                    <p className="mt-0.5 text-[10px] text-white/65">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

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
                  value={
                    maintenance ? (maintenance.enabled ? "Enabled" : "Off") : authenticated ? "Reading…" : "Locked"
                  }
                  ok={maintenance ? !maintenance.enabled : undefined}
                />
              </div>
            </div>
          </div>
        </div>

        <div id="health-section" className="mt-6 scroll-mt-20">
          <SystemHealth
            health={health}
            error={healthError}
            loading={refreshingHealth}
            lastSuccessAt={lastHealthyAt}
            onRefresh={() => void loadDiagnostics()}
          />
        </div>

        {/* media management */}
        <div id="media-section" className="mt-6 scroll-mt-20">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-[9px] uppercase tracking-[0.3em] text-white/35">Content control</p>
              <h2 className="mt-1 font-serif text-xl tracking-tight text-white">Media management</h2>
            </div>
            <p className="hidden max-w-xs text-right text-[9px] uppercase leading-relaxed tracking-[0.14em] text-white/25 sm:block">
              Uploads are written to R2 and indexed in D1 · publishing updates the public site immediately
            </p>
          </div>

          {authenticated ? (
            <div className="space-y-4">
              <MediaManager kind="graphic" />
              <MediaManager kind="video" />
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-[11px] leading-relaxed text-white/40">
              Locked. Uploading, editing, reordering and publishing media requires an authenticated
              administrator session. Unseal the vault and sign in to manage the portfolio.
            </div>
          )}
        </div>

        {/* operations */}
        <div id="ops-section" className="mt-10 grid scroll-mt-20 gap-4 md:grid-cols-2 xl:grid-cols-3">
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
                <Row label="Stored assets" value={`${health.database.objects} · ${formatBytes(health.database.bytes)}`} />
                <Row
                  label="Isolate uptime"
                  value={
                    health.uptimeSeconds < 90
                      ? `${health.uptimeSeconds}s`
                      : `${Math.floor(health.uptimeSeconds / 60)} min`
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

          <Panel icon={Wrench} title="Website Maintenance Mode" hint="Stored in D1 · hides the public site">
            {!authenticated ? (
              <p className="text-[11px] text-white/35">
                Locked. Maintenance mode can only be changed by an authenticated administrator.
              </p>
            ) : (
              <>
                <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/30 px-3.5 py-3">
                  <div>
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
                      maintenance?.enabled
                        ? "border-amber-300/40 bg-amber-400/80"
                        : "border-white/15 bg-white/10"
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-0.5 h-4.5 w-4.5 rounded-full bg-white transition-transform",
                        maintenance?.enabled ? "translate-x-[22px]" : "translate-x-0.5"
                      )}
                      style={{ height: 18, width: 18 }}
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
                {notice && <p className="mt-3 text-[11px] text-white/55">{notice}</p>}
              </>
            )}
          </Panel>

          <Panel icon={ServerCog} title="Admin access" hint="Existing portfolio console">
            <p className="text-[11px] text-white/45">
              Uploads, project management, categories and storage status live in the existing
              admin console.
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
              Assets are served from R2; project records live in D1.
            </p>
          </Panel>
        </div>

        <p className="mt-8 text-[10px] leading-relaxed text-white/45">
          This facility never fakes monitoring: session state, diagnostics and maintenance mode are
          read from the deployed Worker. The vault wheel is only an entry interaction; access is
          enforced by the server on every protected request.
        </p>
      </main>
    </div>
  );
}
