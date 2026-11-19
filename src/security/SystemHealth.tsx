import {
  Activity,
  AlertTriangle,
  Bot,
  CheckCircle2,
  Database,
  Globe,
  HardDrive,
  KeyRound,
  Loader2,
  RefreshCw,
  ServerCog,
  UploadCloud,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { HealthInfo, HealthService, HealthStatus } from "@/admin/api";

const SERVICE_ICONS: Record<string, typeof Globe> = {
  frontend: Globe,
  backend: ServerCog,
  auth: KeyRound,
  database: Database,
  storage: HardDrive,
  uploads: UploadCloud,
  ai: Bot,
};

const STATUS_STYLES: Record<
  HealthStatus,
  { label: string; dot: string; ring: string; text: string; border: string; wash: string }
> = {
  operational: {
    label: "Operational",
    dot: "bg-emerald-400",
    ring: "bg-emerald-400/50",
    text: "text-emerald-300",
    border: "border-emerald-400/25",
    wash: "from-emerald-400/[0.07]",
  },
  warning: {
    label: "Warning",
    dot: "bg-amber-300",
    ring: "bg-amber-300/50",
    text: "text-amber-200",
    border: "border-amber-300/25",
    wash: "from-amber-400/[0.07]",
  },
  failure: {
    label: "Failure",
    dot: "bg-red-400",
    ring: "bg-red-400/50",
    text: "text-red-300",
    border: "border-red-400/30",
    wash: "from-red-500/[0.09]",
  },
};

function formatWhen(iso: string | null | undefined): string {
  if (!iso) return "never";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "never";
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function StatusDot({ status, className }: { status: HealthStatus; className?: string }) {
  const style = STATUS_STYLES[status];
  return (
    <span className={cn("relative grid h-2.5 w-2.5 place-items-center", className)}>
      <span
        className={cn("absolute inset-0 rounded-full", style.ring)}
        style={{ animation: "health-ring 2.4s ease-out infinite" }}
      />
      <span
        className={cn("relative h-1.5 w-1.5 rounded-full", style.dot)}
        style={{ animation: "siren-pulse 2.2s ease-in-out infinite" }}
      />
    </span>
  );
}

function ServiceCard({ service }: { service: HealthService }) {
  const style = STATUS_STYLES[service.status] ?? STATUS_STYLES.warning;
  const Icon = SERVICE_ICONS[service.id] ?? Activity;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border bg-gradient-to-b to-transparent px-3.5 py-3",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]",
        style.border,
        style.wash
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-md border border-white/10 bg-white/[0.04] text-white/60">
            <Icon className="h-3 w-3" />
          </span>
          <p className="text-[11px] font-medium tracking-tight text-white/85">{service.label}</p>
        </div>
        <StatusDot status={service.status} />
      </div>

      <p className={cn("mt-2.5 text-[9px] uppercase tracking-[0.18em]", style.text)}>{style.label}</p>
      <p className="mt-1 text-[10px] leading-relaxed text-white/40">{service.detail}</p>

      <div className="mt-2 flex items-center gap-2 text-[9px] uppercase tracking-[0.14em] text-white/25">
        {service.latencyMs !== null && <span>{service.latencyMs} ms</span>}
        {service.verified && (
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-2.5 w-2.5 text-white/25" /> verified
          </span>
        )}
      </div>

      <div
        className={cn("absolute inset-x-0 bottom-0 h-px", style.dot, "opacity-30")}
        style={{ animation: "health-bar 3.4s ease-in-out infinite" }}
      />
    </div>
  );
}

export function SystemHealth({
  health,
  error,
  loading,
  onRefresh,
  lastSuccessAt,
}: {
  health: HealthInfo | null;
  error: string | null;
  loading: boolean;
  onRefresh: () => void;
  lastSuccessAt?: string | null;
}) {
  const services = health?.services ?? [];
  const summary = health?.summary;
  const healthy = summary ? summary.failures === 0 : false;
  const headline = summary?.label ?? "SYSTEM HEALTH: CHECKING";
  const headlineTone = !summary
    ? "text-white/60"
    : summary.failures > 0
      ? "text-red-300"
      : summary.warnings > 0
        ? "text-amber-200"
        : "text-emerald-300";

  return (
    <section
      aria-label="System health"
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.055] to-white/[0.012] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)] backdrop-blur"
    >
      <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-cyan-400/[0.07] blur-3xl" />

      <div className="relative flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[9px] uppercase tracking-[0.3em] text-white/35">Diagnostics</p>
          <div className="mt-2 flex items-center gap-2.5">
            {summary ? (
              <StatusDot status={summary.failures > 0 ? "failure" : summary.warnings > 0 ? "warning" : "operational"} />
            ) : (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-white/40" />
            )}
            <h2 className={cn("text-[15px] font-semibold tracking-[0.08em] sm:text-base", headlineTone)}>
              {headline}
            </h2>
          </div>
          <p className="mt-1.5 text-[10px] text-white/35">
            {summary
              ? `${summary.operational} operational · ${summary.warnings} warning${summary.warnings === 1 ? "" : "s"} · ${summary.failures} failure${summary.failures === 1 ? "" : "s"}`
              : "Reading live service checks from the Worker…"}
            {summary && summary.failures === 0 && summary.warnings > 0
              ? " — core services are up; the warnings need configuration."
              : ""}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex flex-col items-end gap-1">
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[9px] uppercase tracking-[0.16em] text-white/40">
              Last checked {formatWhen(health?.checkedAt)}
            </span>
            {lastSuccessAt && (
              <span className="text-[8px] uppercase tracking-[0.14em] text-emerald-300/60">
                Last healthy {formatWhen(lastSuccessAt)}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            aria-label="Re-run system health checks"
            className="grid h-7 w-7 place-items-center rounded-full border border-white/12 bg-white/[0.04] text-white/45 transition-colors hover:border-white/25 hover:text-white disabled:opacity-40"
          >
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          </button>
        </div>
      </div>

      {error && (
        <p className="relative mt-3 flex items-start gap-2 rounded-lg border border-red-400/25 bg-red-500/10 px-3 py-2 text-[10px] text-red-200">
          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
          {error}
        </p>
      )}

      <div className="relative mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {services.length > 0
          ? services.map((service) => <ServiceCard key={service.id} service={service} />)
          : [0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-[92px] animate-pulse rounded-xl border border-white/[0.06] bg-white/[0.02]" />
            ))}
      </div>

      <p className="relative mt-3 flex items-center gap-1.5 text-[9px] uppercase tracking-[0.14em] text-white/25">
        {healthy ? (
          <>
            <CheckCircle2 className="h-2.5 w-2.5 text-emerald-400/60" />
            Checks run server-side against the live Worker, D1 and the private object bucket
          </>
        ) : (
          <>
            <AlertTriangle className="h-2.5 w-2.5 text-amber-300/70" />
            A check is failing — services are never reported healthy from UI state alone
          </>
        )}
      </p>
    </section>
  );
}
