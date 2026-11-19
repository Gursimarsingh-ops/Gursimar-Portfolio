import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  Bot,
  Check,
  Copy,
  FileText,
  Loader2,
  Paperclip,
  Send,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  askAssistant,
  clearAiHistory,
  formatFileSize,
  getAiHistory,
  getAiStatus,
  type AiAttachment,
  type AiStatus,
} from "@/lib/portalApi";
import { Markdown } from "./Markdown";

interface Bubble {
  id: string;
  role: "user" | "assistant";
  text: string;
  attachments?: AiAttachment[];
  createdAt: string;
}

interface Stored {
  threadId: string;
  messages: Bubble[];
}

const STORAGE_KEY = "gs-ai-assistant-v1";
const CLOSE_MS = 200;

const SUGGESTIONS = [
  "What services do you offer?",
  "Can you edit gaming videos?",
  "Which software do you use?",
  "How can I hire you?",
];

const ACCEPT = "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime,application/pdf,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function load(): Stored {
  const empty = { threadId: crypto.randomUUID(), messages: [] as Bubble[] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as Stored;
    if (!parsed || typeof parsed.threadId !== "string" || !Array.isArray(parsed.messages)) return empty;
    return parsed;
  } catch {
    return empty;
  }
}

function clock(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function PortfolioAssistant({ onHire }: { onHire: () => void }) {
  const initial = useMemo(load, []);
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [threadId, setThreadId] = useState(initial.threadId);
  const [messages, setMessages] = useState<Bubble[]>(initial.messages);
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [draft, setDraft] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [progress, setProgress] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const closeTimer = useRef<number | null>(null);

  useEffect(() => {
    getAiStatus()
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);

  // Restore the stored thread so history survives reloads and other devices.
  useEffect(() => {
    let cancelled = false;
    getAiHistory(threadId)
      .then((result) => {
        if (cancelled || !result.messages?.length) return;
        const restored = result.messages.map((entry) => ({
          id: entry.id,
          role: entry.role,
          text: entry.content,
          attachments: entry.attachments ?? [],
          createdAt: entry.createdAt,
        }));
        // Never clobber a message the visitor already sent in this session.
        setMessages((current) => (current.length ? current : restored));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
    // Only the initial thread is restored; new messages are appended live.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const copyMessage = async (message: Bubble) => {
    try {
      await navigator.clipboard.writeText(message.text);
      setCopiedId(message.id);
      window.setTimeout(() => setCopiedId((current) => (current === message.id ? null : current)), 1600);
    } catch {
      setError("Clipboard access was blocked by the browser.");
    }
  };

  const clearConversation = async () => {
    const previous = threadId;
    setMessages([]);
    setError(null);
    setFiles([]);
    setThreadId(crypto.randomUUID());
    await clearAiHistory(previous).catch(() => undefined);
  };

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ threadId, messages: messages.slice(-60) }));
    } catch {
      /* storage unavailable */
    }
  }, [threadId, messages]);

  useEffect(() => {
    if (!open || closing) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, open, closing, busy, progress]);

  useEffect(() => {
    const map: Record<string, string> = {};
    for (const file of files) {
      if (file.type.startsWith("image/")) map[`${file.name}-${file.size}`] = URL.createObjectURL(file);
    }
    setPreviews(map);
    return () => Object.values(map).forEach((url) => URL.revokeObjectURL(url));
  }, [files]);

  const openPanel = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    setClosing(false);
    setOpen(true);
  };

  const closePanel = () => {
    setClosing(true);
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => {
      setOpen(false);
      setClosing(false);
    }, CLOSE_MS);
  };

  useEffect(
    () => () => {
      if (closeTimer.current) window.clearTimeout(closeTimer.current);
    },
    []
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closePanel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const available = Boolean(status?.enabled && status?.configured);
  const assistantName = status?.assistantName || "Portfolio Assistant";
  const welcome =
    status?.welcomeMessage ||
    "Hi, I'm the portfolio assistant for GurSimar Singh. Ask about services, experience, software or how to start a project.";
  const placeholder = status?.placeholder || "Ask about services, experience, hiring…";
  const accent = status?.appearance?.accent || "#7dd3fc";
  const onLeft = status?.appearance?.position === "left";

  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    const next = [...files];
    for (const file of Array.from(incoming)) {
      if (next.length >= 5) {
        setError("You can attach up to 5 files per message.");
        break;
      }
      if (file.size > 25 * 1024 * 1024) {
        setError(`"${file.name}" is too large. The combined limit is 25 MB.`);
        continue;
      }
      next.push(file);
    }
    setFiles(next);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    if (!available || busy) return;
    addFiles(event.dataTransfer.files);
  };

  const removeFile = (index: number) => setFiles((current) => current.filter((_, i) => i !== index));

  const send = async (text: string) => {
    const message = text.trim();
    if (!message || busy) return;
    if (status && !available) return;

    const attachments: AiAttachment[] = files.map((file) => ({
      name: file.name,
      type: file.type,
      size: file.size,
    }));

    const userBubble: Bubble = {
      id: `local-${Date.now()}`,
      role: "user",
      text: message,
      attachments,
      createdAt: new Date().toISOString(),
    };

    setMessages((current) => [...current, userBubble]);
    setDraft("");
    setFiles([]);
    setError(null);
    setBusy(true);
    setProgress(0);

    try {
      const result = await askAssistant(threadId, message, files, (percent) => setProgress(percent));
      setThreadId(result.threadId);
      setMessages((current) => [
        ...current,
        {
          id: `ai-${Date.now()}`,
          role: "assistant",
          text: result.reply,
          createdAt: new Date().toISOString(),
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The assistant is unavailable right now.");
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };

  const statusLabel = status
    ? available
      ? `Ready · ${status.model}`
      : status.enabled
        ? "Backend not configured"
        : "Paused by administrator"
    : "Connecting…";

  const correspondence =
    status?.availability === "away"
      ? "Away · slower replies"
      : status?.availability === "offline"
        ? "Offline · use the Hire Me form"
        : statusLabel;

  return (
    <>
      <button
        type="button"
        onClick={() => (open ? closePanel() : openPanel())}
        aria-expanded={open}
        aria-label="Open portfolio AI assistant"
        className={cn(
          "group fixed bottom-4 z-[65] grid h-12 w-12 place-items-center overflow-hidden rounded-full border shadow-[0_24px_55px_-20px_rgba(0,0,0,0.95)] transition-all duration-300 sm:bottom-5 sm:h-14 sm:w-14",
          onLeft ? "left-3 sm:left-5" : "right-3 sm:right-5",
          "bg-[linear-gradient(150deg,#2a2d33_0%,#15171b_52%,#050608_100%)] text-white",
          open ? "border-white/40" : "border-white/18 hover:-translate-y-0.5 hover:border-white/40",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950"
        )}
      >
        <span className="pointer-events-none absolute inset-0 -translate-x-[130%] skew-x-[-14deg] bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-[130%]" />
        <span className="pointer-events-none absolute inset-x-2 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />
        {open ? <X className="relative h-5 w-5" /> : <Sparkles className="relative h-5 w-5" />}
        {!open && (
          <span
            className={cn("absolute bottom-1 h-2.5 w-2.5 rounded-full border-2 border-neutral-950", onLeft ? "left-1" : "right-1")}
            style={{ background: accent }}
          />
        )}
      </button>

      {open && (
        <div
          className={cn(
            "fixed inset-x-3 bottom-[4.5rem] z-[65] sm:inset-x-auto sm:bottom-24 sm:w-[410px]",
            onLeft ? "sm:left-5" : "sm:right-5"
          )}
        >
          <div
            className={cn(
              "relative flex h-[min(78vh,620px)] flex-col overflow-hidden rounded-3xl border border-white/12 bg-[linear-gradient(170deg,#14171c_0%,#0a0c10_48%,#05070a_100%)] text-neutral-100 shadow-[0_50px_120px_-32px_rgba(0,0,0,1)] backdrop-blur-2xl",
              closing ? "chat-panel-out" : "chat-panel-in"
            )}
            role="dialog"
            aria-label="Portfolio AI assistant"
            onDragOver={(event) => {
              event.preventDefault();
              if (available && !busy) setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
          >
            {dragging && (
              <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center border-2 border-dashed border-white/50 bg-black/70 backdrop-blur-sm">
                <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-white/80">
                  <Paperclip className="h-4 w-4" /> Drop files to attach
                </p>
              </div>
            )}
            <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/45 to-transparent" />
            <span className="pointer-events-none absolute -left-12 -top-16 h-44 w-44 rounded-full bg-sky-300/10 blur-3xl" />
            <span className="pointer-events-none absolute inset-0 opacity-[0.045] [background-image:radial-gradient(rgba(255,255,255,0.9)_0.5px,transparent_0.5px)] [background-size:3px_3px]" />

            <header className="relative flex items-center justify-between gap-3 border-b border-white/10 bg-white/[0.02] px-4 py-3.5">
              <div className="flex items-center gap-3">
                <span className="relative grid h-10 w-10 place-items-center rounded-xl border border-white/18 bg-gradient-to-b from-white/18 to-white/[0.04] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]">
                  <Bot className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-[13px] font-semibold tracking-tight text-white">{assistantName}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-[9px] uppercase tracking-[0.16em] text-white/55">
                    <span
                      className={cn("h-1.5 w-1.5 rounded-full", !available && "bg-amber-400")}
                      style={available ? { background: accent, animation: "pulse 2.4s ease-in-out infinite" } : undefined}
                    />
                    {correspondence}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setMessages([]);
                    setThreadId(crypto.randomUUID());
                    setError(null);
                    setFiles([]);
                  }}
                  className="rounded-full border border-white/15 px-2.5 py-1 text-[8px] uppercase tracking-[0.14em] text-white/60 transition-colors hover:border-white/35 hover:text-white"
                >
                  New chat
                </button>
                <button
                  type="button"
                  onClick={() => void clearConversation()}
                  aria-label="Clear this conversation"
                  title="Clear conversation"
                  className="grid h-[26px] w-[26px] place-items-center rounded-full border border-white/15 text-white/55 transition-colors hover:border-red-400/40 hover:text-red-200"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={closePanel}
                  aria-label="Close assistant"
                  className="grid h-8 w-8 place-items-center rounded-full border border-white/12 text-white/60 transition-all hover:border-white/30 hover:bg-white/5 hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </header>

            <div className="relative flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {messages.length === 0 && (
                <div className="rounded-2xl border border-white/12 bg-white/[0.04] p-4">
                  <p className="text-[12.5px] leading-relaxed text-white/90">{welcome}</p>
                  <p className="mt-2 text-[10px] leading-relaxed text-white/55">
                    I answer from the published portfolio and point to the Hire Me form or direct chat for anything private.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {SUGGESTIONS.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => void send(suggestion)}
                        disabled={!available}
                        className="rounded-full border border-white/18 bg-white/[0.06] px-2.5 py-1 text-[9px] text-white/75 transition-all hover:border-white/40 hover:bg-white/[0.12] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex chat-bubble-in",
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[87%] rounded-2xl px-3.5 py-2.5 text-[12.5px] leading-relaxed shadow-[0_12px_28px_-20px_rgba(0,0,0,1)]",
                      message.role === "user"
                        ? "rounded-br-md bg-white text-neutral-900"
                        : "rounded-bl-md border border-white/14 bg-white/[0.09] text-white"
                    )}
                  >
                    {message.role === "assistant" ? (
                      <Markdown text={message.text} />
                    ) : (
                      <p className="whitespace-pre-wrap break-words">{message.text}</p>
                    )}
                    {message.attachments && message.attachments.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {message.attachments.map((file) => (
                          <li
                            key={`${message.id}-${file.name}`}
                            className={cn(
                              "flex items-center gap-1.5 rounded-md border px-2 py-1 text-[9px]",
                              message.role === "user"
                                ? "border-neutral-300/80 text-neutral-600"
                                : "border-white/15 text-white/65"
                            )}
                          >
                            <Paperclip className="h-2.5 w-2.5 shrink-0" />
                            <span className="truncate">{file.name}</span>
                            <span className="shrink-0 opacity-70">{formatFileSize(file.size)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="mt-1.5 flex items-center justify-between gap-3">
                      <p
                        className={cn(
                          "text-[8px] uppercase tracking-[0.16em]",
                          message.role === "user" ? "text-neutral-500" : "text-white/50"
                        )}
                      >
                        {message.role === "user" ? "You" : "Assistant"} · {clock(message.createdAt)}
                      </p>
                      {message.role === "assistant" && (
                        <button
                          type="button"
                          onClick={() => void copyMessage(message)}
                          aria-label="Copy response"
                          className="inline-flex items-center gap-1 text-[8px] uppercase tracking-[0.14em] text-white/45 transition-colors hover:text-white"
                        >
                          {copiedId === message.id ? (
                            <Check className="h-2.5 w-2.5" />
                          ) : (
                            <Copy className="h-2.5 w-2.5" />
                          )}
                          {copiedId === message.id ? "Copied" : "Copy"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {busy && (
                <div className="flex justify-start">
                  <span className="flex items-center gap-2.5 rounded-2xl rounded-bl-md border border-white/14 bg-white/[0.09] px-3.5 py-2.5">
                    <span className="flex items-center gap-1">
                      {[0, 1, 2].map((index) => (
                        <span
                          key={index}
                          className="h-1.5 w-1.5 rounded-full bg-sky-200"
                          style={{ animation: `pulse 1.2s ease-in-out ${index * 0.16}s infinite` }}
                        />
                      ))}
                    </span>
                    <span className="text-[9px] uppercase tracking-[0.16em] text-white/60">
                      {progress !== null && progress < 100 ? `Uploading ${progress}%` : "Thinking"}
                    </span>
                  </span>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {status && !available && (
              <div className="mx-4 mb-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2.5">
                <p className="flex items-start gap-2 text-[10px] leading-relaxed text-amber-100">
                  <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                  {status.enabled
                    ? "The AI service is not configured yet. Use the Hire Me form or direct chat to reach GurSimar."
                    : "The AI assistant is paused by the administrator. Use the Hire Me form or direct chat instead."}
                </p>
              </div>
            )}

            {error && (
              <p className="mx-4 mb-2 flex items-start gap-2 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-[10px] text-red-200">
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                {error}
              </p>
            )}

            {files.length > 0 && (
              <ul className="mx-3 mb-2 flex flex-wrap gap-1.5">
                {files.map((file, index) => (
                  <li
                    key={`${file.name}-${index}`}
                    className="group flex items-center gap-1.5 rounded-lg border border-white/18 bg-white/[0.07] px-2 py-1.5 text-[9px] text-white/80"
                  >
                    {previews[`${file.name}-${file.size}`] ? (
                      <img src={previews[`${file.name}-${file.size}`]} alt="" className="h-6 w-6 rounded object-cover" />
                    ) : (
                      <FileText className="h-3 w-3" />
                    )}
                    <span className="max-w-[120px] truncate">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      aria-label={`Remove ${file.name}`}
                      className="text-white/50 transition-colors hover:text-white"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <form
              onSubmit={(event) => {
                event.preventDefault();
                void send(draft);
              }}
              className="relative border-t border-white/10 bg-black/20 px-3 py-3"
            >
              <div className="flex items-end gap-2">
                <input
                  ref={inputRef}
                  type="file"
                  multiple
                  accept={ACCEPT}
                  onChange={(event) => addFiles(event.target.files)}
                  className="hidden"
                  aria-label="Attach files"
                />
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  disabled={!available || busy}
                  aria-label="Attach files"
                  className="grid h-[44px] w-[44px] shrink-0 place-items-center rounded-xl border border-white/18 bg-white/[0.06] text-white/70 transition-all hover:border-white/40 hover:bg-white/[0.12] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Paperclip className="h-4 w-4" />
                </button>
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value.slice(0, status?.limits.messageChars ?? 4000))}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void send(draft);
                    }
                  }}
                  rows={1}
                  placeholder={available ? placeholder : "Assistant unavailable"}
                  disabled={!available || busy}
                  className="max-h-28 min-h-[44px] flex-1 resize-none rounded-xl border border-white/18 bg-black/50 px-3.5 py-2.5 text-[12px] text-white outline-none transition-colors placeholder:text-white/35 focus:border-sky-300/60 focus:bg-black/70 disabled:cursor-not-allowed disabled:opacity-55"
                />
                <button
                  type="submit"
                  disabled={!available || busy || !draft.trim()}
                  aria-label="Send message"
                  className="grid h-[44px] w-[44px] shrink-0 place-items-center rounded-xl bg-white text-neutral-950 transition-all hover:-translate-y-0.5 hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <p className="text-[8px] uppercase tracking-[0.14em] text-white/40">
                  Images, video, PDF &amp; docs · max 5 files
                </p>
                <button
                  type="button"
                  onClick={() => {
                    closePanel();
                    onHire();
                  }}
                  className="inline-flex items-center gap-1 text-[8px] uppercase tracking-[0.14em] text-white/55 transition-colors hover:text-white"
                >
                  Hire form <ArrowUpRight className="h-2.5 w-2.5" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
