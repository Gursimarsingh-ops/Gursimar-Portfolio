import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Database,
  HardDrive,
  Loader2,
  RefreshCw,
  ServerCog,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api, formatBytes, type HealthInfo } from "@/admin/api";
import { Panel, StatCard, buttonClass, formatWhen } from "@/admin/ui";

export function MaintenancePanel() {
  const [health, setHealth] = useState<HealthInfo | null>(null);
  const [maintenance, setMaintenance] = useState<{ enabled: boolean; updatedAt: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [nextHealth, nextMaintenance] = await Promise.all([api.health(), api.maintenance()]);
      setHealth(nextHealth);
      setMaintenance(nextMaintenance);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read system health.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = async () => {
    if (!maintenance) return;
    setBusy(true);
    setNotice(null);
    try {
      const next = await api.setMaintenance(!maintenance.enabled);
      setMaintenance(next);
      setNotice(
        next.enabled
          ? "Maintenance mode enabled. Visitors now see the full-screen maintenance page."
          : "Maintenance mode disabled. The public site is back to normal."
      );
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Could not update maintenance mode.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <p className="flex items-center justify-center gap-2 py-16 text-[11px] text-white/40">
        <Loader2 className="h-4 w-4 animate-spin" /> Reading live system health…
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Worker uptime"
          value={`${Math.floor((health?.uptimeSeconds ?? 0) / 60)}m`}
          hint="Current isolate"
          accent="cyan"
        />
        <StatCard
          label="Database"
          value={health?.database.ok ? "Connected" : "Error"}
          hint={health ? `${health.database.latencyMs}ms · ${health.database.objects} rows` : undefined}
          accent={health?.database.ok ? "emerald" : "amber"}
        />
        <StatCard
          label="Object storage"
          value={health?.storage.ok ? "Available" : "Error"}
          hint="R2 media bucket"
          accent={health?.storage.ok ? "emerald" : "amber"}
        />
        <StatCard
          label="Maintenance"
          value={maintenance?.enabled ? "On" : "Off"}
          hint={maintenance?.updatedAt ? formatWhen(maintenance.updatedAt) : "Never toggled"}
          accent={maintenance?.enabled ? "amber" : "emerald"}
        />
      </div>

      {error && (
        <p className="flex items-start gap-2 rounded-lg border border-red-400/25 bg-red-500/10 px-3 py-2 text-[11px] text-red-200">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-12">
        <Panel title="Website Maintenance Mode" hint="Real switch stored in the database" className="lg:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/10 bg-black/20 px-4 py-4">
            <div className="max-w-sm">
              <p className="flex items-center gap-2 text-[12px] text-white/80">
                <Wrench className="h-3.5 w-3.5 text-white/40" />
                Website Maintenance Mode
              </p>
              <p className="mt-1 text-[10px] leading-relaxed text-white/35">
                When enabled, visitors see a full-screen maintenance page instead of the portfolio.
                The state is stored in the database, so it survives refreshes and restarts, and
                signed-in administrators always keep access to this dashboard.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void toggle()}
              disabled={busy || !maintenance}
              role="switch"
              aria-checked={maintenance?.enabled ?? false}
              aria-label="Toggle maintenance mode"
              className={cn(
                "relative inline-flex h-10 w-[72px] shrink-0 items-center rounded-full border transition-colors disabled:opacity-50",
                maintenance?.enabled
                  ? "border-amber-400/40 bg-amber-500/25"
                  : "border-white/15 bg-white/[0.05]"
              )}
            >
              <span
                className={cn(
                  "mx-1 grid h-8 w-8 place-items-center rounded-full bg-white text-neutral-900 shadow transition-transform",
                  maintenance?.enabled ? "translate-x-8" : "translate-x-0"
                )}
              >
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wrench className="h-3.5 w-3.5" />}
              </span>
            </button>
          </div>

          {notice && <p className="mt-3 text-[10px] text-white/45">{notice}</p>}

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className={buttonClass}
            >
              <ShieldCheck className="h-3 w-3" /> View public site
            </a>
            <button type="button" onClick={() => void load()} className={buttonClass}>
              <RefreshCw className="h-3 w-3" /> Re-check health
            </button>
          </div>
        </Panel>

        <Panel title="System health" hint="Live from the Worker" className="lg:col-span-5">
          <div className="space-y-2 text-[11px]">
            {[
              {
                icon: Database,
                label: "D1 database",
                value: health?.database.ok ? "Healthy" : "Unavailable",
                ok: health?.database.ok ?? false,
              },
              {
                icon: HardDrive,
                label: "R2 storage",
                value: health?.storage.ok ? "Healthy" : "Unavailable",
                ok: health?.storage.ok ?? false,
              },
              {
                icon: Activity,
                label: "Edge",
                value: [health?.edge.colo, health?.edge.country].filter(Boolean).join(" · ") || "local",
                ok: true,
              },
              {
                icon: ShieldCheck,
                label: "Admin credentials",
                value: health?.auth.configured ? health.auth.email ?? "configured" : "not configured",
                ok: health?.auth.configured ?? false,
              },
              {
                icon: ServerCog,
                label: "Media limit",
                value: health ? formatBytes(health.limits.videoBytes) : "—",
                ok: true,
              },
            ].map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between gap-3 border-b border-white/[0.06] py-2 last:border-b-0"
              >
                <span className="flex items-center gap-2 text-white/45">
                  <row.icon className="h-3 w-3" />
                  {row.label}
                </span>
                <span className={cn("flex items-center gap-1.5 text-right", row.ok ? "text-white/70" : "text-amber-300")}>
                  {row.ok ? <CheckCircle2 className="h-3 w-3 text-emerald-400/70" /> : <AlertTriangle className="h-3 w-3" />}
                  {row.value}
                </span>
              </div>
            ))}
          </div>
          {health && (
            <p className="mt-3 text-[9px] uppercase tracking-[0.16em] text-white/25">
              Checked {formatWhen(health.checkedAt)}
            </p>
          )}
        </Panel>
      </div>
    </div>
  );
}
