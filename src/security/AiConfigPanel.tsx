import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Bot,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  PlugZap,
  RefreshCw,
  Save,
  ServerCog,
  Sparkles,
  Trash2,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api, ApiError, type AiSettingsResponse, type AiTestResult } from "@/admin/api";

function formatWhen(iso: string | null | undefined): string {
  if (!iso) return "Never";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Never";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type Tone = "error" | "success" | "info";

function Notice({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2 rounded-xl border px-3 py-2.5 text-[10.5px] leading-relaxed",
        tone === "error"
          ? "border-red-400/25 bg-red-500/10 text-red-200"
          : tone === "success"
            ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-200"
            : "border-white/10 bg-white/[0.03] text-white/55"
      )}
    >
      {tone === "error" ? (
        <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
      ) : tone === "success" ? (
        <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0" />
      ) : null}
      <span>{children}</span>
    </p>
  );
}

const inputCls =
  "mt-1.5 w-full rounded-lg border border-white/12 bg-black/45 px-3 py-2.5 text-[12px] text-white outline-none transition-colors placeholder:text-white/25 focus:border-cyan-300/45 focus:bg-black/65";

const labelCls = "block text-[9px] uppercase tracking-[0.2em] text-white/40";

export function AiConfigPanel() {
  const [data, setData] = useState<AiSettingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [model, setModel] = useState("");
  const [apiUrl, setApiUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [knowledge, setKnowledge] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [savingKnowledge, setSavingKnowledge] = useState(false);
  const [message, setMessage] = useState<{ tone: Tone; text: string } | null>(null);
  const [test, setTest] = useState<AiTestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hydrate = useCallback((next: AiSettingsResponse) => {
    setData(next);
    setModel(next.settings.model);
    setApiUrl(next.settings.apiUrl);
    setKnowledge(next.settings.knowledge);
    setEnabled(next.settings.enabled);
  }, []);

  const load = useCallback(async () => {
    setError(null);
    try {
      hydrate(await api.aiSettings());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not read the AI configuration.");
    } finally {
      setLoading(false);
    }
  }, [hydrate]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const next = await api.saveAiSettings({
        enabled,
        model: model.trim(),
        provider: "nvidia-nim",
        apiUrl: apiUrl.trim(),
        ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}),
        knowledge,
      });
      hydrate(next);
      setApiKey("");
      setMessage({
        tone: "success",
        text: apiKey.trim()
          ? "Configuration saved. The new API key is stored server-side and is never returned to the browser."
          : "Configuration saved. The stored API key was kept unchanged.",
      });
    } catch (err) {
      setMessage({
        tone: "error",
        text: err instanceof ApiError ? err.message : "The configuration could not be saved.",
      });
    } finally {
      setSaving(false);
    }
  };

  const runTest = async () => {
    setTesting(true);
    setMessage(null);
    setTest(null);
    try {
      const result = await api.testAiConnection({
        ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}),
        apiUrl: apiUrl.trim(),
        model: model.trim(),
      });
      setTest(result);
      if (result.ok) await load();
    } catch (err) {
      setTest({
        ok: false,
        status: null,
        latencyMs: 0,
        endpoint: apiUrl,
        model,
        message: err instanceof ApiError ? err.message : "The connection test failed.",
      });
    } finally {
      setTesting(false);
    }
  };

  const toggleEnabled = async () => {
    const next = !enabled;
    setToggling(true);
    setMessage(null);
    try {
      const saved = await api.saveAiSettings({ enabled: next });
      hydrate(saved);
      setMessage({
        tone: "success",
        text: next ? "AI assistant enabled for visitors." : "AI assistant disabled. Visitors see the contact fallback.",
      });
    } catch (err) {
      setMessage({
        tone: "error",
        text: err instanceof ApiError ? err.message : "Could not change the assistant state.",
      });
    } finally {
      setToggling(false);
    }
  };

  const saveKnowledge = async () => {
    setSavingKnowledge(true);
    setMessage(null);
    try {
      const next = await api.saveAiSettings({ knowledge });
      hydrate(next);
      setMessage({ tone: "success", text: "Assistant knowledge saved." });
    } catch (err) {
      setMessage({
        tone: "error",
        text: err instanceof ApiError ? err.message : "Could not save the assistant knowledge.",
      });
    } finally {
      setSavingKnowledge(false);
    }
  };

  const configured = Boolean(data?.configured);
  const statusLabel = !data
    ? "Reading"
    : !configured
      ? "No API key"
      : !data.settings.enabled
        ? "Disabled"
        : data.settings.lastError
          ? "Last call failed"
          : data.settings.lastSuccessAt
            ? "Connected"
            : "Key stored · untested";

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-8 text-[11px] text-white/45">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Reading AI configuration from the server…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ------------------------------ status ------------------------------ */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.055] to-white/[0.012] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)] backdrop-blur">
        <div className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-sky-400/[0.07] blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/14 bg-white/[0.06] text-white/75">
              <Bot className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-[9px] uppercase tracking-[0.3em] text-white/35">AI assistant · NVIDIA NIM</p>
              <h2 className="mt-1 flex flex-wrap items-center gap-2 text-[15px] font-semibold tracking-tight text-white">
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    configured && data?.settings.enabled ? "bg-emerald-400" : "bg-amber-400"
                  )}
                  style={{ animation: "vault-led 2.6s ease-in-out infinite" }}
                />
                {statusLabel}
              </h2>
              <p className="mt-1 text-[10px] text-white/40">
                {data?.model ?? "—"}
                {data?.vision ? " · vision capable" : " · text only"}
                {data?.keyHint ? ` · key ${data.keyHint}` : ""}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void load()}
              aria-label="Reload AI configuration"
              className="grid h-8 w-8 place-items-center rounded-full border border-white/12 text-white/50 transition-colors hover:border-white/30 hover:text-white"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              aria-label="Enable or disable the AI assistant"
              disabled={toggling}
              onClick={() => void toggleEnabled()}
              className={cn(
                "relative h-7 w-[52px] shrink-0 rounded-full border transition-colors disabled:opacity-50",
                enabled ? "border-emerald-300/40 bg-emerald-500/70" : "border-white/15 bg-white/10"
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 grid h-[22px] w-[22px] place-items-center rounded-full bg-white text-neutral-900 transition-transform",
                  enabled ? "translate-x-[26px]" : "translate-x-0.5"
                )}
              >
                <Zap className="h-3 w-3" />
              </span>
            </button>
          </div>
        </div>

        <div className="relative mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { label: "Provider", value: "NVIDIA NIM" },
            { label: "Key source", value: data?.keySource === "environment" ? "Worker secret" : data?.keySource === "dashboard" ? "Dashboard (D1)" : "Not set" },
            { label: "Last test", value: formatWhen(data?.settings.lastTestAt) },
            { label: "Last success", value: formatWhen(data?.settings.lastSuccessAt) },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-white/[0.08] bg-black/25 px-3 py-2">
              <p className="text-[8px] uppercase tracking-[0.18em] text-white/30">{item.label}</p>
              <p className="mt-1 truncate text-[10.5px] text-white/75">{item.value}</p>
            </div>
          ))}
        </div>

        {(data?.settings.lastError || data?.settings.lastLatencyMs) && (
          <div className="relative mt-3 space-y-1.5">
            {data?.settings.lastLatencyMs ? (
              <p className="text-[9px] uppercase tracking-[0.14em] text-white/30">
                Last measured latency {data.settings.lastLatencyMs} ms
              </p>
            ) : null}
            {data?.settings.lastError && (
              <Notice tone="error">Last provider error · {data.settings.lastError}</Notice>
            )}
          </div>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* --------------------------- configuration --------------------------- */}
        <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="flex items-center gap-2">
            <ServerCog className="h-3.5 w-3.5 text-white/50" />
            <p className="text-[10px] uppercase tracking-[0.22em] text-white/60">Provider configuration</p>
          </div>

          <label className="block">
            <span className={labelCls}>Provider</span>
            <input value="NVIDIA NIM" readOnly className={cn(inputCls, "cursor-not-allowed text-white/45")} />
          </label>

          <label className="block">
            <span className={labelCls}>API key {configured && <span className="normal-case tracking-normal text-white/30">— stored, leave blank to keep</span>}</span>
            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder={data?.keyHint ? `Stored key ${data.keyHint}` : "nvapi-…"}
                autoComplete="new-password"
                spellCheck={false}
                className={cn(inputCls, "pr-10 font-mono")}
              />
              <button
                type="button"
                onClick={() => setShowKey((current) => !current)}
                aria-label={showKey ? "Hide API key" : "Show API key"}
                className="absolute right-2 top-[15px] grid h-7 w-7 place-items-center rounded-md text-white/40 transition-colors hover:text-white"
              >
                {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
            <span className="mt-1 block text-[9px] leading-relaxed text-white/25">
              Sent once to the Worker over HTTPS and stored in D1 server-side. It is never included in API
              responses, the bundle, or browser storage.
            </span>
            {data?.keySource === "dashboard" && (
              <button
                type="button"
                onClick={async () => {
                  setMessage(null);
                  try {
                    const next = await api.saveAiSettings({ clearApiKey: true });
                    hydrate(next);
                    setMessage({ tone: "success", text: "Stored API key removed from the server." });
                  } catch (err) {
                    setMessage({
                      tone: "error",
                      text: err instanceof ApiError ? err.message : "Could not remove the stored key.",
                    });
                  }
                }}
                className="mt-1.5 inline-flex items-center gap-1 text-[9px] uppercase tracking-[0.14em] text-red-300/70 transition-colors hover:text-red-200"
              >
                <Trash2 className="h-2.5 w-2.5" /> Remove stored key
              </button>
            )}
          </label>

          <label className="block">
            <span className={labelCls}>Model name</span>
            <input
              value={model}
              onChange={(event) => setModel(event.target.value)}
              placeholder={data?.defaultModel ?? "google/gemma-4-31b-it"}
              spellCheck={false}
              className={cn(inputCls, "font-mono")}
            />
            <span className="mt-1 block text-[9px] text-white/25">
              Text models: google/gemma-4-31b-it, openai/gpt-oss-20b. Image analysis: a vision model
              such as meta/muse-glimmer-30b or nvidia/nemotron-3.5-super-vl-120b-a12b.
            </span>
          </label>

          <label className="block">
            <span className={labelCls}>API endpoint</span>
            <input
              value={apiUrl}
              onChange={(event) => setApiUrl(event.target.value)}
              placeholder={data?.defaultApiUrl ?? "https://integrate.api.nvidia.com/v1/chat/completions"}
              spellCheck={false}
              className={cn(inputCls, "font-mono text-[11px]")}
            />
          </label>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving || testing}
              className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-950 transition-all hover:-translate-y-0.5 hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save configuration
            </button>
            <button
              type="button"
              onClick={() => void runTest()}
              disabled={saving || testing}
              className="inline-flex items-center gap-2 rounded-full border border-white/18 px-4 py-2.5 text-[10px] uppercase tracking-[0.14em] text-white/70 transition-colors hover:border-white/35 hover:text-white disabled:opacity-45"
            >
              {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PlugZap className="h-3.5 w-3.5" />}
              {testing ? "Testing…" : "Test connection"}
            </button>
          </div>

          <p className="flex items-start gap-1.5 text-[9px] leading-relaxed text-white/25">
            <KeyRound className="mt-0.5 h-2.5 w-2.5 shrink-0" />
            The test performs a real request to the configured endpoint with the key you entered (or the stored
            key). Nothing is simulated.
          </p>
        </div>

        {/* ------------------------------ diagnostics ------------------------------ */}
        <div className="space-y-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-[10px] uppercase tracking-[0.22em] text-white/60">Connection diagnostics</p>

            {!test ? (
              <p className="mt-3 flex items-start gap-2 text-[10.5px] leading-relaxed text-white/35">
                <Sparkles className="mt-0.5 h-3 w-3 shrink-0" />
                Run a test to verify the endpoint, key and model. The result includes the provider HTTP status,
                measured latency and the exact error text returned by NVIDIA.
              </p>
            ) : (
              <div className="mt-3 space-y-2.5">
                <Notice tone={test.ok ? "success" : "error"}>
                  {test.ok ? <Check className="mr-1 inline h-3 w-3" /> : null}
                  {test.message}
                </Notice>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "HTTP status", value: test.status === null ? "No response" : String(test.status) },
                    { label: "Latency", value: `${test.latencyMs} ms` },
                    { label: "Model", value: test.model },
                    { label: "Endpoint", value: (() => {
                        try {
                          return new URL(test.endpoint).host;
                        } catch {
                          return test.endpoint;
                        }
                      })() },
                  ].map((item) => (
                    <div key={item.label} className="rounded-lg border border-white/[0.08] bg-black/25 px-2.5 py-2">
                      <p className="text-[8px] uppercase tracking-[0.16em] text-white/30">{item.label}</p>
                      <p className="mt-0.5 truncate text-[10px] text-white/70">{item.value}</p>
                    </div>
                  ))}
                </div>
                {test.reply && (
                  <p className="rounded-lg border border-white/[0.08] bg-black/25 px-2.5 py-2 text-[10px] text-white/55">
                    Provider replied: <span className="text-white/80">{test.reply}</span>
                  </p>
                )}
                {test.diagnostics && (
                  <p className="max-h-32 overflow-y-auto rounded-lg border border-red-400/20 bg-red-500/[0.07] px-2.5 py-2 font-mono text-[9.5px] leading-relaxed text-red-200/80">
                    {test.diagnostics}
                  </p>
                )}
              </div>
            )}

            {message && <div className="mt-3"><Notice tone={message.tone}>{message.text}</Notice></div>}
            {error && <div className="mt-3"><Notice tone="error">{error}</Notice></div>}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-[10px] uppercase tracking-[0.22em] text-white/60">Capabilities</p>
            <ul className="mt-2 space-y-1.5">
              {[
                { label: "Text chat", ok: true, detail: "Any NIM chat model" },
                { label: "Image analysis", ok: Boolean(data?.vision), detail: data?.vision ? "Model accepts images" : "Select a vision model" },
                { label: "PDF / text attachments", ok: true, detail: "Text extracted server-side" },
                { label: "Video analysis", ok: false, detail: "Not supported by chat models" },
              ].map((item) => (
                <li key={item.label} className="flex items-center justify-between gap-2 text-[10px]">
                  <span className="flex items-center gap-1.5 text-white/55">
                    <span className={cn("h-1 w-1 rounded-full", item.ok ? "bg-emerald-400" : "bg-amber-400")} />
                    {item.label}
                  </span>
                  <span className="truncate text-right text-white/35">{item.detail}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* ------------------------------- knowledge ------------------------------- */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-white/60">Assistant knowledge</p>
            <p className="mt-1 max-w-2xl text-[10.5px] leading-relaxed text-white/35">
              The published profile, services, tools, experience and contact channels are always included.
              Anything you add here is appended as additional facts the assistant may use. Keep it accurate —
              the assistant is instructed never to invent experience, prices or achievements.
            </p>
          </div>
          <span className="text-[9px] uppercase tracking-[0.14em] text-white/30">{knowledge.length}/12000</span>
        </div>
        <textarea
          value={knowledge}
          onChange={(event) => setKnowledge(event.target.value.slice(0, 12000))}
          rows={7}
          placeholder={"Example:\n- Current availability: accepting two projects per month.\n- New service: podcast editing with chapter markers.\n- 2026: launched a short-form vertical editing package."}
          className={cn(inputCls, "mt-3 resize-y font-mono text-[11px] leading-relaxed")}
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void saveKnowledge()}
            disabled={savingKnowledge}
            className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-950 transition-all hover:-translate-y-0.5 hover:bg-neutral-200 disabled:opacity-50"
          >
            {savingKnowledge ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save knowledge
          </button>
          <span className="text-[9px] text-white/25">
            Stored in D1 · applied to every new reply immediately
          </span>
        </div>
      </div>
    </div>
  );
}
