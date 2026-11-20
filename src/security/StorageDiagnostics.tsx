import { useState } from "react";
import { AlertTriangle, CheckCircle2, HardDrive, Loader2, Play, RefreshCw, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { api, type StorageDiagnosticResult } from "@/admin/api";

const STATUS: Record<
  "ok" | "warn" | "fail",
  { label: string; text: string; border: string; wash: string; Icon: typeof CheckCircle2 }
> = {
  ok: { label: "Working", text: "text-emerald-300", border: "border-emerald-400/25", wash: "bg-emerald-400/[0.06]", Icon: CheckCircle2 },
  warn: { label: "Warning", text: "text-amber-200", border: "border-amber-300/25", wash: "bg-amber-400/[0.06]", Icon: AlertTriangle },
  fail: { label: "Failed", text: "text-red-300", border: "border-red-400/30", wash: "bg-red-500/[0.07]", Icon: XCircle },
};

/**
 * Backblaze B2 diagnostic: one real request per operation the site depends on,
 * each reported with its own status, latency and Backblaze error code.
 */
export function StorageDiagnostics() {
  const [result, setResult] = useState<StorageDiagnosticResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      const next = await api.storageDiagnostic();
      setResult(next);
      setCheckedAt(next.checkedAt ?? new Date().toISOString());
    } catch (err) {
      setError(err instanceof Error ? err.message : "The storage diagnostic could not run.");
    } finally {
      setBusy(false);
    }
  };

  const failed = result?.steps.filter((step) => step.status === "fail").length ?? 0;

  return (
    <section
      aria-label="Backblaze storage diagnostic"
      className="relative mt-4 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.012] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[9px] uppercase tracking-[0.3em] text-white/35">Storage</p>
          <h2 className="mt-2 flex items-center gap-2 text-[14px] font-semibold tracking-[0.04em] text-white/90">
            <HardDrive className="h-4 w-4 text-cyan-200/80" />
            Backblaze B2 diagnostic
          </h2>
          <p className="mt-1.5 text-[10px] leading-relaxed text-white/40">
            Uploads one temporary object, reads its metadata, downloads it and deletes it again. Existing portfolio
            media is never touched.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void run()}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/[0.08] px-3.5 py-2 text-[10px] uppercase tracking-[0.16em] text-white transition-all hover:border-white/40 hover:bg-white/[0.14] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : result ? <RefreshCw className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          {busy ? "Testing" : result ? "Run again" : "Run diagnostic"}
        </button>
      </div>

      {error && (
        <p className="mt-3 flex items-start gap-2 rounded-lg border border-red-400/25 bg-red-500/10 px-3 py-2 text-[10px] text-red-200">
          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" /> {error}
        </p>
      )}

      {result && (
        <>
          <p
            className={cn(
              "mt-3 flex items-center gap-2 text-[10px]",
              result.summary.ok ? "text-emerald-300" : "text-red-300"
            )}
          >
            {result.summary.ok ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
            {result.summary.label}
            <span className="text-white/30">
              · {result.provider}
              {result.bucket ? ` · ${result.bucket}` : ""}
              {result.region ? ` · ${result.region}` : ""}
              {checkedAt ? ` · ${new Date(checkedAt).toLocaleTimeString()}` : ""}
            </span>
          </p>

          <ul className="mt-3 space-y-1.5">
            {result.steps.map((step) => {
              const style = STATUS[step.status];
              const Icon = style.Icon;
              return (
                <li
                  key={step.id}
                  className={cn("rounded-lg border px-3 py-2", style.border, style.wash)}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-[11px] text-white/85">
                      <Icon className={cn("h-3 w-3", style.text)} />
                      {step.label}
                    </span>
                    <span className="flex items-center gap-2 text-[9px] uppercase tracking-[0.12em] text-white/35">
                      {step.httpStatus !== null && <span>HTTP {step.httpStatus}</span>}
                      {step.code && <span className="text-white/50">{step.code}</span>}
                      <span>{step.latencyMs} ms</span>
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] leading-relaxed text-white/45">{step.detail}</p>
                  {step.status !== "ok" && (
                    <p className="mt-1 text-[9px] uppercase tracking-[0.14em] text-white/30">
                      Required capability: {step.capability}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>

          {failed > 0 && (
            <p className="mt-3 text-[9px] leading-relaxed text-white/35">
              A 403 on upload needs <span className="text-white/60">writeFiles</span>; listing needs{" "}
              <span className="text-white/60">listFiles</span>; reading metadata and downloads need{" "}
              <span className="text-white/60">readFiles</span>; deleting needs{" "}
              <span className="text-white/60">deleteFiles</span>. The key must also be restricted to the{" "}
              <span className="text-white/60">{result.bucket ?? "gursimar-portfolio"}</span> bucket.
            </p>
          )}
        </>
      )}
    </section>
  );
}
