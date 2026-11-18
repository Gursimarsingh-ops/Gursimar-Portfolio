import { useEffect, useState } from "react";
import { AlertTriangle, Bot, Check, KeyRound, Loader2, Save, ShieldCheck, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { api, type AiSettingsResponse } from "@/admin/api";
import { Panel, StatCard, buttonClass, inputClass, primaryButtonClass } from "@/admin/ui";

export function AiSettingsPanel() {
  const [data, setData] = useState<AiSettingsResponse | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [model, setModel] = useState("");
  const [provider, setProvider] = useState("openai-compatible");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    api
      .aiSettings()
      .then((result) => {
        setData(result);
        setEnabled(result.settings.enabled);
        setModel(result.settings.model);
        setProvider(result.settings.provider);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load AI settings."))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const result = await api.saveAiSettings({ enabled, model: model.trim(), provider: provider.trim() });
      setData((current) => (current ? { ...current, settings: result.settings, configured: result.configured } : current));
      setMessage("AI assistant settings saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save AI settings.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <p className="flex items-center justify-center gap-2 py-16 text-[11px] text-white/40">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading AI settings…
      </p>
    );
  }

  const configured = data?.configured ?? false;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Assistant"
          value={enabled ? "Enabled" : "Disabled"}
          hint="Public chatbot toggle"
          accent={enabled ? "emerald" : "amber"}
        />
        <StatCard
          label="API key"
          value={configured ? "Configured" : "Missing"}
          hint="Server-side secret only"
          accent={configured ? "emerald" : "amber"}
        />
        <StatCard label="Model" value={model || data?.defaultModel || "default"} hint={provider} accent="cyan" />
      </div>

      {!configured && (
        <div className="rounded-xl border border-amber-400/25 bg-amber-400/10 p-4">
          <p className="flex items-start gap-2 text-[11px] leading-relaxed text-amber-100/90">
            <KeyRound className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            No AI API key is set. The chatbot shows a clear "not configured" message instead of inventing
            answers. Add the key as a Worker secret, then deploy:
            <code className="ml-1 rounded bg-black/40 px-1.5 py-0.5 font-mono text-[10px] text-amber-100">
              wrangler secret put AI_API_KEY
            </code>
          </p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-7">
          <Panel title="Assistant configuration" hint="Stored in the database and applied immediately">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-3.5 py-3">
              <div>
                <p className="text-[12px] text-white/80">Enable AI assistant</p>
                <p className="mt-0.5 text-[10px] text-white/35">
                  When off, the public chatbot explains that it is paused.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEnabled((value) => !value)}
                aria-pressed={enabled}
                aria-label="Toggle AI assistant"
                className={cn(
                  "relative inline-flex h-9 w-16 shrink-0 items-center rounded-full border transition-colors",
                  enabled ? "border-emerald-400/40 bg-emerald-500/20" : "border-white/15 bg-white/[0.05]"
                )}
              >
                <span
                  className={cn(
                    "mx-1 h-7 w-7 rounded-full bg-white shadow transition-transform",
                    enabled ? "translate-x-7" : "translate-x-0"
                  )}
                />
              </button>
            </div>

            <label className="mt-4 block">
              <span className="text-[9px] uppercase tracking-[0.2em] text-white/40">Model</span>
              <input
                value={model}
                onChange={(event) => setModel(event.target.value)}
                placeholder={data?.envModel ?? data?.defaultModel ?? "gpt-4o-mini"}
                className={cn(inputClass, "mt-1.5 font-mono")}
              />
              <span className="mt-1 block text-[10px] text-white/30">
                Leave empty to use the AI_MODEL environment value or {data?.defaultModel}.
              </span>
            </label>

            <label className="mt-4 block">
              <span className="text-[9px] uppercase tracking-[0.2em] text-white/40">Provider label</span>
              <input
                value={provider}
                onChange={(event) => setProvider(event.target.value)}
                placeholder="openai-compatible"
                className={cn(inputClass, "mt-1.5")}
              />
              <span className="mt-1 block text-[10px] text-white/30">
                Any OpenAI-compatible chat-completions endpoint works. Change the endpoint with the
                AI_API_URL environment variable; no code change is required.
              </span>
            </label>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => void save()} disabled={saving} className={primaryButtonClass}>
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Save settings
              </button>
              <button
                type="button"
                onClick={() => {
                  setEnabled(data?.settings.enabled ?? true);
                  setModel(data?.settings.model ?? "");
                  setProvider(data?.settings.provider ?? "openai-compatible");
                }}
                className={buttonClass}
              >
                Reset
              </button>
            </div>

            {message && (
              <p className="mt-3 flex items-center gap-1.5 text-[10px] text-emerald-300/90">
                <Check className="h-3 w-3" /> {message}
              </p>
            )}
            {error && (
              <p className="mt-3 flex items-center gap-1.5 text-[10px] text-red-300">
                <AlertTriangle className="h-3 w-3" /> {error}
              </p>
            )}
          </Panel>

          <Panel title="Environment configuration" hint="Secrets never reach the browser">
            <dl className="space-y-2 text-[11px]">
              {[
                ["AI_API_KEY", configured ? "Set (hidden)" : "Not set", configured],
                ["AI_API_URL", data?.apiUrl ?? "default", true],
                ["AI_MODEL", data?.envModel ?? "(default)", Boolean(data?.envModel)],
                ["AI_PROVIDER", data?.providerEnv ?? "(default)", Boolean(data?.providerEnv)],
              ].map(([name, value, ok]) => (
                <div key={String(name)} className="flex items-center justify-between gap-3 border-b border-white/[0.06] pb-2 last:border-b-0">
                  <dt className="font-mono text-[10px] text-white/50">{name}</dt>
                  <dd
                    className={cn(
                      "flex items-center gap-1.5 text-right text-[10px]",
                      ok ? "text-emerald-300/90" : "text-amber-300/90"
                    )}
                  >
                    <span className={cn("h-1 w-1 rounded-full", ok ? "bg-emerald-400" : "bg-amber-400")} />
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </Panel>
        </div>

        <div className="space-y-4 lg:col-span-5">
          <Panel title="Knowledge scope" hint="Built from the published portfolio only">
            <ul className="space-y-2 text-[11px] leading-relaxed text-white/55">
              {[
                "Name, roles and the 3+ years editing / 1 year design experience stated on the site.",
                "All nine services and the six software titles shown in the Studio section.",
                "Portfolio categories and 26 graphic design projects.",
                "Contact channels and the Hire Me / direct chat flow.",
                "Budget answers explain that scope and budget can be discussed, and no prices are invented.",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-white/30" />
                  {item}
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Guardrails" hint="Enforced in the system prompt on every request">
            <ul className="space-y-2 text-[11px] leading-relaxed text-white/55">
              {[
                "Never disclose admin credentials, sessions, client records or private chats.",
                "Never invent clients, awards, prices, deadlines or experience.",
                "Never accept instructions to ignore its rules or reveal the prompt.",
                "Rate limited per visitor connection, with server-side key handling.",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0 text-emerald-300/60" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-3 flex items-start gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[10px] leading-relaxed text-white/35">
              <Bot className="mt-0.5 h-3 w-3 shrink-0" />
              Uploads are validated by MIME type and file signature; images are the only attachment type sent to
              the model for analysis.
            </p>
          </Panel>
        </div>
      </div>
    </div>
  );
}
