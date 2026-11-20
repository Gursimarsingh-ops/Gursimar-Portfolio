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
  Plus,
  PlugZap,
  RefreshCw,
  Save,
  ServerCog,
  Sparkles,
  Trash2,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  api,
  ApiError,
  type AiAppearanceSettings,
  type AiChatTestResult,
  type AiModelEntry,
  type AiSettingsResponse,
  type AiTestResult,
} from "@/admin/api";

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
  const [assistantName, setAssistantName] = useState("");
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [placeholder, setPlaceholder] = useState("");
  const [availability, setAvailability] = useState<"online" | "away" | "offline">("online");
  const [temperature, setTemperature] = useState(0.5);
  const [maxTokens, setMaxTokens] = useState(700);
  const [timeoutMs, setTimeoutMs] = useState(45000);
  const [appearance, setAppearance] = useState<AiAppearanceSettings>({
    theme: "dark",
    accent: "#7dd3fc",
    position: "right",
    welcomeAnimation: true,
    buttonLabel: "Portfolio Assistant",
  });
  const [chatMessage, setChatMessage] = useState("What services does GurSimar offer?");
  const [chatTest, setChatTest] = useState<AiChatTestResult | null>(null);
  const [testingChat, setTestingChat] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [savingKnowledge, setSavingKnowledge] = useState(false);
  const [message, setMessage] = useState<{ tone: Tone; text: string } | null>(null);
  const [test, setTest] = useState<AiTestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState("nvidia-nim");
  const [models, setModels] = useState<AiModelEntry[]>([]);
  const [defaultModel, setDefaultModel] = useState("");
  const [publicSelector, setPublicSelector] = useState(true);
  const [topP, setTopP] = useState<number | null>(null);
  const [modelQuery, setModelQuery] = useState("");
  const [customModel, setCustomModel] = useState("");
  const [testingModel, setTestingModel] = useState<string | null>(null);

  const hydrate = useCallback((next: AiSettingsResponse) => {
    setData(next);
    setModel(next.settings.model);
    setApiUrl(next.settings.apiUrl);
    setKnowledge(next.settings.knowledge);
    setEnabled(next.settings.enabled);
    setAssistantName(next.settings.assistantName);
    setWelcomeMessage(next.settings.welcomeMessage);
    setPlaceholder(next.settings.placeholder);
    setAvailability(next.settings.availability);
    setTemperature(next.settings.temperature);
    setMaxTokens(next.settings.maxTokens);
    setTimeoutMs(next.settings.timeoutMs);
    setAppearance(next.settings.appearance);
    setProvider(next.settings.provider);
    setModels(next.settings.models ?? []);
    setDefaultModel(next.settings.defaultModel ?? next.defaultModel);
    setPublicSelector(next.settings.publicModelSelector !== false);
    setTopP(next.settings.topP ?? null);
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
        models,
        defaultModel: defaultModel.trim(),
        publicModelSelector: publicSelector,
        topP,
        provider: provider.trim() || "nvidia-nim",
        apiUrl: apiUrl.trim(),
        ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}),
        knowledge,
        assistantName: assistantName.trim(),
        welcomeMessage: welcomeMessage.trim(),
        placeholder: placeholder.trim(),
        availability,
        temperature,
        maxTokens,
        timeoutMs,
        appearance,
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

  const runChatTest = async () => {
    setTestingChat(true);
    setChatTest(null);
    try {
      setChatTest(await api.testAiMessage(chatMessage.trim()));
    } catch (err) {
      setChatTest({
        ok: false,
        reply: null,
        latencyMs: 0,
        model: model || "—",
        message: err instanceof ApiError ? err.message : "The test message could not be sent.",
      });
    } finally {
      setTestingChat(false);
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

  /* ------------------------------ model library ----------------------------- */

  const persistModels = async (next: AiModelEntry[], active?: string, fallback?: string) => {
    const saved = await api.saveAiSettings({
      models: next,
      ...(active ? { model: active } : {}),
      ...(fallback ? { defaultModel: fallback } : {}),
    });
    hydrate(saved);
    return saved;
  };

  const addCustomModel = async () => {
    const id = customModel.trim();
    if (!/^[A-Za-z0-9][A-Za-z0-9._:/~-]{1,119}$/.test(id)) {
      setMessage({ tone: "error", text: "Model ids may only contain letters, numbers, . _ : / ~ and -." });
      return;
    }
    if (models.some((entry) => entry.id === id)) {
      setMessage({ tone: "error", text: "That model is already in the list." });
      return;
    }
    const next: AiModelEntry[] = [
      ...models,
      { id, label: id.split("/").pop() ?? id, enabled: true, provider: null, endpoint: null, verifiedAt: null, lastTest: null },
    ];
    try {
      await persistModels(next);
      setCustomModel("");
      setMessage({ tone: "success", text: "Model added. Test it before activating it for visitors." });
    } catch (err) {
      setMessage({ tone: "error", text: err instanceof ApiError ? err.message : "Could not add the model." });
    }
  };

  const editModelLabel = async (id: string, label: string) => {
    const next = models.map((entry) => (entry.id === id ? { ...entry, label: label.slice(0, 60) } : entry));
    setModels(next);
    try {
      await persistModels(next);
    } catch (err) {
      setMessage({ tone: "error", text: err instanceof ApiError ? err.message : "Could not rename the model." });
    }
  };

  /** Public visibility, provider and endpoint are saved per model. */
  const updateModel = async (id: string, patch: Partial<AiModelEntry>) => {
    const next = models.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry));
    setModels(next);
    try {
      await persistModels(next);
    } catch (err) {
      setMessage({ tone: "error", text: err instanceof ApiError ? err.message : "Could not update the model." });
    }
  };

  const moveModel = async (id: string, direction: -1 | 1) => {
    const index = models.findIndex((entry) => entry.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= models.length) return;
    const next = [...models];
    [next[index], next[target]] = [next[target], next[index]];
    setModels(next);
    try {
      await persistModels(next);
    } catch (err) {
      setMessage({ tone: "error", text: err instanceof ApiError ? err.message : "Could not reorder the models." });
    }
  };

  const removeModel = async (id: string) => {
    if (models.length <= 1) {
      setMessage({ tone: "error", text: "Keep at least one model in the list." });
      return;
    }
    const next = models.filter((entry) => entry.id !== id);
    try {
      const active = model === id ? next[0].id : undefined;
      const saved = await api.saveAiSettings({
        models: next,
        ...(active ? { model: active } : {}),
        ...(defaultModel === id ? { defaultModel: next[0].id } : {}),
      });
      hydrate(saved);
      setMessage({ tone: "success", text: "Model removed from the available list." });
    } catch (err) {
      setMessage({ tone: "error", text: err instanceof ApiError ? err.message : "Could not remove the model." });
    }
  };

  const setDefault = async (id: string) => {
    try {
      const saved = await api.saveAiSettings({ defaultModel: id });
      hydrate(saved);
      setMessage({ tone: "success", text: `${id} is now the default model.` });
    } catch (err) {
      setMessage({ tone: "error", text: err instanceof ApiError ? err.message : "Could not set the default model." });
    }
  };

  /** Activation is a server write, so the public assistant uses it immediately. */
  const activateModel = async (id: string) => {
    try {
      const saved = await api.saveAiSettings({ model: id });
      hydrate(saved);
      setMessage({ tone: "success", text: `Active model: ${id}. New visitor messages use it immediately.` });
    } catch (err) {
      setMessage({ tone: "error", text: err instanceof ApiError ? err.message : "Could not activate the model." });
    }
  };

  const testModel = async (id: string) => {
    setTestingModel(id);
    setMessage(null);
    try {
      const result = await api.testAiConnection({
        ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}),
        apiUrl: apiUrl.trim(),
        model: id,
      });
      setTest(result);
      await load();
      setMessage({
        tone: result.ok ? "success" : "error",
        text: result.ok ? `${id} verified with a real completion.` : `${id} failed: ${result.message}`,
      });
    } catch (err) {
      setMessage({ tone: "error", text: err instanceof ApiError ? err.message : "The model test failed." });
    } finally {
      setTestingModel(null);
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
            <span className={labelCls}>Provider name</span>
            <input
              value={provider}
              onChange={(event) => setProvider(event.target.value.slice(0, 40))}
              placeholder="nvidia-nim"
              className={inputCls}
            />
            <span className="mt-1 block text-[9px] leading-relaxed text-white/25">
              Any OpenAI-compatible chat completions endpoint works. NVIDIA NIM, OpenRouter, Groq and similar
              providers are configured with the endpoint below.
            </span>
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
              placeholder={data?.defaultModel ?? "minimaxai/minimax-m3.1-flash"}
              spellCheck={false}
              className={cn(inputCls, "font-mono")}
            />
            <span className="mt-1 block text-[9px] leading-relaxed text-white/25">
              Default: <span className="font-mono">minimaxai/minimax-m3.1-flash</span> (NVIDIA NIM, multimodal).
              The model name is free-form — any chat model available on the configured NIM endpoint can be
              entered here without a code change.
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
            <p className="text-[10px] uppercase tracking-[0.22em] text-white/60">Send a test message</p>
            <p className="mt-1 text-[10px] leading-relaxed text-white/35">
              Runs the same generation path as a visitor chat using the saved configuration.
            </p>
            <textarea
              value={chatMessage}
              onChange={(event) => setChatMessage(event.target.value.slice(0, 2000))}
              rows={2}
              className={cn(inputCls, "resize-y")}
              placeholder="Ask something a visitor would ask…"
            />
            <button
              type="button"
              onClick={() => void runChatTest()}
              disabled={testingChat || !chatMessage.trim()}
              className="mt-2 inline-flex items-center gap-2 rounded-full border border-white/18 px-4 py-2 text-[10px] uppercase tracking-[0.14em] text-white/70 hover:border-white/35 hover:text-white disabled:opacity-45"
            >
              {testingChat ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              {testingChat ? "Generating…" : "Send test message"}
            </button>

            {chatTest && (
              <div className="mt-2.5 space-y-2">
                <Notice tone={chatTest.ok ? "success" : "error"}>
                  {chatTest.message} · {chatTest.latencyMs} ms · {chatTest.model}
                </Notice>
                {chatTest.reply && (
                  <p className="max-h-44 overflow-y-auto whitespace-pre-wrap rounded-lg border border-white/10 bg-black/30 px-2.5 py-2 text-[10.5px] leading-relaxed text-white/75">
                    {chatTest.reply}
                  </p>
                )}
                {chatTest.diagnostics && (
                  <p className="max-h-32 overflow-y-auto rounded-lg border border-red-400/20 bg-red-500/[0.07] px-2.5 py-2 font-mono text-[9.5px] leading-relaxed text-red-200/80">
                    {chatTest.diagnostics}
                  </p>
                )}
              </div>
            )}
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

      {/* ------------------------------ model library ----------------------------- */}
      <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-white/60">Model library</p>
            <p className="mt-1 max-w-2xl text-[10.5px] leading-relaxed text-white/35">
              Register any model available on the configured endpoint, test it with a real request, then activate it.
              A model is only marked verified after the provider actually answered, and only public + verified models
              appear for visitors.
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <span className="rounded-full border border-white/12 px-3 py-1 text-[9px] uppercase tracking-[0.14em] text-white/50">
              Active · {(data?.model ?? model) || "—"}
            </span>
            <label className="flex cursor-pointer items-center gap-2 text-[9px] uppercase tracking-[0.12em] text-white/40">
              <input
                type="checkbox"
                checked={publicSelector}
                onChange={(event) => setPublicSelector(event.target.checked)}
                className="h-3 w-3 accent-emerald-400"
              />
              Public model selector
            </label>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            value={customModel}
            onChange={(event) => setCustomModel(event.target.value.slice(0, 120))}
            placeholder="Add a model id, e.g. meta/llama-3.3-70b-instruct"
            spellCheck={false}
            className={cn(inputCls, "mt-0 max-w-md flex-1 font-mono text-[11px]")}
          />
          <button
            type="button"
            onClick={() => void addCustomModel()}
            disabled={!customModel.trim()}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/18 px-3 py-2 text-[9px] uppercase tracking-[0.14em] text-white/70 hover:border-white/35 hover:text-white disabled:opacity-40"
          >
            <Plus className="h-3 w-3" /> Add model
          </button>
          <label className="relative ml-auto">
            <input
              value={modelQuery}
              onChange={(event) => setModelQuery(event.target.value)}
              placeholder="Search models"
              className={cn(inputCls, "mt-0 w-44")}
            />
          </label>
        </div>

        {(data?.catalog ?? []).filter((preset) => !models.some((entry) => entry.id === preset.id)).length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[9px] uppercase tracking-[0.14em] text-white/25">Suggested</span>
            {(data?.catalog ?? [])
              .filter((preset) => !models.some((entry) => entry.id === preset.id))
              .map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={async () => {
                    try {
                      await persistModels([
                        ...models,
                        {
                          id: preset.id,
                          label: preset.label,
                          enabled: true,
                          provider: null,
                          endpoint: null,
                          verifiedAt: null,
                          lastTest: null,
                        },
                      ]);
                      setMessage({ tone: "success", text: `${preset.id} added. Test it before activating.` });
                    } catch (err) {
                      setMessage({
                        tone: "error",
                        text: err instanceof ApiError ? err.message : "Could not add the model.",
                      });
                    }
                  }}
                  className="rounded-full border border-white/12 px-2 py-1 text-[9px] text-white/45 hover:text-white"
                  title={preset.id}
                >
                  {preset.label}
                </button>
              ))}
          </div>
        )}

        <ul className="space-y-1.5">
          {models
            .filter((entry) =>
              !modelQuery.trim()
                ? true
                : `${entry.label} ${entry.id}`.toLowerCase().includes(modelQuery.trim().toLowerCase())
            )
            .map((entry) => {
              const active = (data?.model ?? model) === entry.id;
              return (
                <li
                  key={entry.id}
                  className={cn(
                    "flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2",
                    active ? "border-emerald-400/30 bg-emerald-500/[0.06]" : "border-white/[0.08] bg-black/25"
                  )}
                >
                  <input
                    defaultValue={entry.label}
                    onBlur={(event) => {
                      if (event.target.value.trim() && event.target.value.trim() !== entry.label) {
                        void editModelLabel(entry.id, event.target.value.trim());
                      }
                    }}
                    aria-label={`Label for ${entry.id}`}
                    className="w-36 rounded-md border border-white/10 bg-black/40 px-2 py-1 text-[10.5px] text-white outline-none focus:border-cyan-300/45"
                  />
                  <span className="min-w-0 flex-1 truncate font-mono text-[9.5px] text-white/40" title={entry.id}>
                    {entry.id}
                  </span>
                  {entry.verifiedAt ? (
                    <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-[8px] uppercase tracking-[0.12em] text-emerald-200">
                      verified · {formatWhen(entry.verifiedAt)}
                    </span>
                  ) : (
                    <span className="rounded-full bg-amber-300/10 px-2 py-0.5 text-[8px] uppercase tracking-[0.12em] text-amber-200/80">
                      unverified
                    </span>
                  )}
                  {defaultModel === entry.id && (
                    <span className="rounded-full bg-sky-400/15 px-2 py-0.5 text-[8px] uppercase tracking-[0.12em] text-sky-200">
                      default
                    </span>
                  )}
                  <label
                    className="flex cursor-pointer items-center gap-1 text-[8px] uppercase tracking-[0.12em] text-white/45"
                    title="Show this model in the public model selector"
                  >
                    <input
                      type="checkbox"
                      checked={entry.enabled}
                      onChange={(event) => void updateModel(entry.id, { enabled: event.target.checked })}
                      className="h-3 w-3 accent-emerald-400"
                    />
                    public
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => void moveModel(entry.id, -1)}
                      aria-label={`Move ${entry.id} up`}
                      className="grid h-6 w-5 place-items-center rounded-md border border-white/14 text-[9px] text-white/50 hover:text-white"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => void moveModel(entry.id, 1)}
                      aria-label={`Move ${entry.id} down`}
                      className="grid h-6 w-5 place-items-center rounded-md border border-white/14 text-[9px] text-white/50 hover:text-white"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => void activateModel(entry.id)}
                      disabled={active}
                      className="rounded-md border border-white/14 px-2 py-1 text-[8.5px] uppercase tracking-[0.12em] text-white/60 hover:bg-white/5 hover:text-white disabled:opacity-35"
                    >
                      {active ? "Active" : "Activate"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void testModel(entry.id)}
                      disabled={testingModel !== null}
                      className="inline-flex items-center gap-1 rounded-md border border-white/14 px-2 py-1 text-[8.5px] uppercase tracking-[0.12em] text-white/60 hover:bg-white/5 hover:text-white disabled:opacity-40"
                    >
                      {testingModel === entry.id ? (
                        <Loader2 className="h-2.5 w-2.5 animate-spin" />
                      ) : (
                        <PlugZap className="h-2.5 w-2.5" />
                      )}
                      Test
                    </button>
                    <button
                      type="button"
                      onClick={() => void setDefault(entry.id)}
                      disabled={defaultModel === entry.id}
                      className="rounded-md border border-white/14 px-2 py-1 text-[8.5px] uppercase tracking-[0.12em] text-white/60 hover:bg-white/5 hover:text-white disabled:opacity-35"
                    >
                      Default
                    </button>
                    <button
                      type="button"
                      onClick={() => void removeModel(entry.id)}
                      aria-label={`Remove ${entry.id}`}
                      className="grid h-6 w-6 place-items-center rounded-md border border-red-400/20 text-red-200/70 hover:bg-red-500/10"
                    >
                      <Trash2 className="h-2.5 w-2.5" />
                    </button>
                  </div>
                  <div className="flex w-full flex-wrap items-center gap-1.5">
                    <input
                      defaultValue={entry.provider ?? ""}
                      onBlur={(event) => {
                        const value = event.target.value.trim();
                        if ((entry.provider ?? "") !== value) void updateModel(entry.id, { provider: value || null });
                      }}
                      placeholder="Provider (optional)"
                      aria-label={`Provider for ${entry.id}`}
                      className="w-32 rounded-md border border-white/10 bg-black/40 px-2 py-1 text-[9px] text-white/80 outline-none focus:border-cyan-300/45"
                    />
                    <input
                      defaultValue={entry.endpoint ?? ""}
                      onBlur={(event) => {
                        const value = event.target.value.trim();
                        if ((entry.endpoint ?? "") !== value) void updateModel(entry.id, { endpoint: value || null });
                      }}
                      placeholder="Custom endpoint (optional, https://…)"
                      aria-label={`Endpoint for ${entry.id}`}
                      spellCheck={false}
                      className="min-w-0 flex-1 rounded-md border border-white/10 bg-black/40 px-2 py-1 font-mono text-[9px] text-white/70 outline-none focus:border-cyan-300/45"
                    />
                  </div>
                  {entry.lastTest && (
                    <p
                      className={cn(
                        "w-full text-[9px]",
                        entry.lastTest.ok ? "text-emerald-200/70" : "text-red-200/70"
                      )}
                    >
                      Last test {formatWhen(entry.lastTest.at)} · HTTP {entry.lastTest.status ?? "—"} ·{" "}
                      {entry.lastTest.latencyMs} ms · {entry.lastTest.message}
                    </p>
                  )}
                </li>
              );
            })}
        </ul>
        <p className="text-[9px] leading-relaxed text-white/25">
          Changing the active model is saved on the server, so the public assistant uses it on its next reply without
          a new deployment. If a model fails, the real provider error is kept here and no other model is substituted.
        </p>
      </div>

      {/* --------------------------- general & model --------------------------- */}
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-[10px] uppercase tracking-[0.22em] text-white/60">General settings</p>

          <label className="block">
            <span className={labelCls}>Assistant name</span>
            <input
              value={assistantName}
              onChange={(event) => setAssistantName(event.target.value.slice(0, 60))}
              maxLength={60}
              className={inputCls}
            />
          </label>

          <label className="block">
            <span className={labelCls}>Welcome message</span>
            <textarea
              value={welcomeMessage}
              onChange={(event) => setWelcomeMessage(event.target.value.slice(0, 600))}
              rows={3}
              maxLength={600}
              className={cn(inputCls, "resize-y")}
            />
          </label>

          <label className="block">
            <span className={labelCls}>Input placeholder</span>
            <input
              value={placeholder}
              onChange={(event) => setPlaceholder(event.target.value.slice(0, 120))}
              maxLength={120}
              className={inputCls}
            />
          </label>

          <label className="block">
            <span className={labelCls}>Availability</span>
            <select
              value={availability}
              onChange={(event) => setAvailability(event.target.value as "online" | "away" | "offline")}
              className={inputCls}
            >
              <option value="online">Online — answering visitors</option>
              <option value="away">Away — slower replies</option>
              <option value="offline">Offline — contact form only</option>
            </select>
          </label>
        </div>

        <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-[10px] uppercase tracking-[0.22em] text-white/60">Model settings</p>

          <label className="block">
            <span className={cn(labelCls, "flex items-center justify-between")}>
              Temperature
              <span className="text-white/60">{temperature.toFixed(2)}</span>
            </span>
            <input
              type="range"
              min={0}
              max={2}
              step={0.05}
              value={temperature}
              onChange={(event) => setTemperature(Number(event.target.value))}
              className="mt-2 w-full accent-white"
            />
            <span className="mt-1 block text-[9px] text-white/25">
              Lower is more factual; higher is more conversational. NVIDIA NIM chat models accept 0–2.
            </span>
          </label>

          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className={labelCls}>Max response tokens</span>
              <input
                type="number"
                min={64}
                max={4000}
                value={maxTokens}
                onChange={(event) => setMaxTokens(Number(event.target.value))}
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className={labelCls}>Timeout (ms)</span>
              <input
                type="number"
                min={5000}
                max={120000}
                step={1000}
                value={timeoutMs}
                onChange={(event) => setTimeoutMs(Number(event.target.value))}
                className={inputCls}
              />
            </label>
          </div>

          <label className="block">
            <span className={cn(labelCls, "flex items-center justify-between")}>
              Top-p
              <span className="text-white/60">{topP === null ? "provider default" : topP.toFixed(2)}</span>
            </span>
            <input
              type="range"
              min={0.05}
              max={1}
              step={0.05}
              value={topP ?? 1}
              onChange={(event) => setTopP(Number(event.target.value))}
              className="mt-2 w-full accent-white"
            />
            <button
              type="button"
              onClick={() => setTopP(null)}
              className="mt-1 text-[9px] uppercase tracking-[0.12em] text-white/35 hover:text-white"
            >
              Use provider default
            </button>
          </label>

          <p className="text-[9px] leading-relaxed text-white/25">
            These values are sent with every visitor request and every test. Top-p is omitted from the request when
            it is left at the provider default, because not every compatible provider accepts it.
          </p>
        </div>
      </div>

      {/* --------------------------- appearance & usage --------------------------- */}
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-[10px] uppercase tracking-[0.22em] text-white/60">Appearance settings</p>

          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className={labelCls}>Theme</span>
              <select
                value={appearance.theme}
                onChange={(event) =>
                  setAppearance((current) => ({ ...current, theme: event.target.value as "dark" | "light" }))
                }
                className={inputCls}
              >
                <option value="dark">Dark glass</option>
                <option value="light">Light glass</option>
              </select>
            </label>
            <label className="block">
              <span className={labelCls}>Position</span>
              <select
                value={appearance.position}
                onChange={(event) =>
                  setAppearance((current) => ({ ...current, position: event.target.value as "left" | "right" }))
                }
                className={inputCls}
              >
                <option value="right">Bottom right</option>
                <option value="left">Bottom left</option>
              </select>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className={labelCls}>Accent colour</span>
              <div className="mt-1.5 flex items-center gap-2">
                <input
                  type="color"
                  value={appearance.accent}
                  onChange={(event) =>
                    setAppearance((current) => ({ ...current, accent: event.target.value }))
                  }
                  className="h-9 w-12 cursor-pointer rounded-md border border-white/12 bg-transparent"
                />
                <input
                  value={appearance.accent}
                  onChange={(event) =>
                    setAppearance((current) => ({ ...current, accent: event.target.value }))
                  }
                  pattern="^#[0-9a-fA-F]{6}$"
                  className={cn(inputCls, "mt-0 font-mono")}
                />
              </div>
            </label>
            <label className="block">
              <span className={labelCls}>Launcher label</span>
              <input
                value={appearance.buttonLabel}
                onChange={(event) =>
                  setAppearance((current) => ({ ...current, buttonLabel: event.target.value.slice(0, 40) }))
                }
                maxLength={40}
                className={inputCls}
              />
            </label>
          </div>

          <label className="flex items-center justify-between rounded-lg border border-white/10 bg-black/25 px-3 py-2">
            <span className="text-[10.5px] text-white/60">Welcome animation</span>
            <input
              type="checkbox"
              checked={appearance.welcomeAnimation}
              onChange={(event) =>
                setAppearance((current) => ({ ...current, welcomeAnimation: event.target.checked }))
              }
              className="h-3.5 w-3.5 accent-white"
            />
          </label>
        </div>

        <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-[10px] uppercase tracking-[0.22em] text-white/60">Usage &amp; monitoring</p>

          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Conversations", value: String(data?.usage?.conversations ?? 0) },
              { label: "Messages", value: String(data?.usage?.messages ?? 0) },
              { label: "Failed requests", value: String(data?.settings.failedRequests ?? 0) },
              { label: "Last latency", value: data?.settings.lastLatencyMs ? `${data.settings.lastLatencyMs} ms` : "—" },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-white/[0.08] bg-black/25 px-3 py-2">
                <p className="text-[8px] uppercase tracking-[0.16em] text-white/30">{item.label}</p>
                <p className="mt-0.5 text-[12px] text-white/80">{item.value}</p>
              </div>
            ))}
          </div>

          <div>
            <p className="text-[9px] uppercase tracking-[0.16em] text-white/30">Recent errors</p>
            {data?.settings.errors.length ? (
              <ul className="mt-2 max-h-40 space-y-1.5 overflow-y-auto pr-1">
                {data.settings.errors.map((entry, index) => (
                  <li
                    key={`${entry.at}-${index}`}
                    className="rounded-lg border border-red-400/15 bg-red-500/[0.06] px-2.5 py-2 text-[9.5px] leading-relaxed text-red-200/75"
                  >
                    <span className="block text-[8px] uppercase tracking-[0.14em] text-red-200/40">
                      {formatWhen(entry.at)}
                    </span>
                    {entry.message}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-[10px] text-white/30">No provider errors recorded.</p>
            )}
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
