import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, ArrowUpRight, Loader2, MessageSquare, Send, ShieldCheck, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PublicApiError,
  getAvailability,
  readChat,
  sendChatMessage,
  startChat,
  type Availability,
  type ChatMessage,
  type ChatSession,
} from "@/lib/portalApi";

const STORAGE_KEY = "gs-direct-chat-v1";
const POLL_MS = 4000;
const CLOSE_MS = 200;

function loadSession(): ChatSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ChatSession;
    return parsed && typeof parsed.id === "string" && typeof parsed.token === "string" ? parsed : null;
  } catch {
    return null;
  }
}

function saveSession(session: ChatSession | null) {
  try {
    if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage unavailable */
  }
}

function clock(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function StatusDot({ online }: { online: boolean }) {
  return (
    <span className="relative flex h-2 w-2 shrink-0">
      {online && (
        <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/60" />
      )}
      <span
        className={cn(
          "relative h-2 w-2 rounded-full ring-2 ring-neutral-950",
          online ? "bg-emerald-400" : "bg-neutral-500"
        )}
      />
    </span>
  );
}

export function DirectChat() {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [session, setSession] = useState<ChatSession | null>(() => loadSession());
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [status, setStatus] = useState<"open" | "resolved">("open");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({ name: "", email: "" });
  const [starting, setStarting] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const closeTimer = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const tick = () => {
      getAvailability()
        .then((next) => {
          if (!cancelled) setAvailability(next);
        })
        .catch(() => undefined);
    };
    tick();
    const timer = window.setInterval(tick, 45_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      if (closeTimer.current) window.clearTimeout(closeTimer.current);
    };
  }, []);

  const refreshThread = useCallback(async (active: ChatSession) => {
    try {
      const result = await readChat(active.id, active.token);
      setMessages(result.messages);
      setStatus(result.conversation.status);
      setAvailability(result.availability);
      setError(null);
    } catch (err) {
      if (err instanceof PublicApiError && err.status === 404) {
        saveSession(null);
        setSession(null);
        setMessages([]);
        setError("That conversation is no longer available. You can start a new one.");
      } else if (err instanceof PublicApiError && err.status === 0) {
        setError("Connection lost. Retrying…");
      }
    }
  }, []);

  useEffect(() => {
    if (!open || !session) return;
    setLoading(true);
    void refreshThread(session).finally(() => setLoading(false));

    const timer = window.setInterval(() => {
      void refreshThread(session);
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [open, session, refreshThread]);

  useEffect(() => {
    if (!open || closing) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, open, closing, sending]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closePanel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

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

  const start = async (event: React.FormEvent) => {
    event.preventDefault();
    setStarting(true);
    setError(null);
    try {
      const result = await startChat(form.name.trim(), form.email.trim());
      const next = result.conversation;
      saveSession(next);
      setSession(next);
      setMessages([]);
      setStatus("open");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start the conversation.");
    } finally {
      setStarting(false);
    }
  };

  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!session || !draft.trim() || sending) return;
    const body = draft.trim();
    setDraft("");
    setSending(true);
    setError(null);

    const optimistic: ChatMessage = {
      id: `local-${Date.now()}`,
      sender: "visitor",
      body,
      createdAt: new Date().toISOString(),
    };
    setMessages((current) => [...current, optimistic]);

    try {
      await sendChatMessage(session.id, session.token, body);
      await refreshThread(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Message could not be sent.");
      setDraft(body);
    } finally {
      setSending(false);
    }
  };

  const reset = () => {
    saveSession(null);
    setSession(null);
    setMessages([]);
    setStatus("open");
    setForm({ name: "", email: "" });
    setError(null);
  };

  const online = availability?.online ?? false;
  const availabilityLabel = availability
    ? online
      ? "Online now"
      : "Offline · replies arrive here"
    : "Checking availability…";

  return (
    <>
      <button
        type="button"
        onClick={() => (open ? closePanel() : openPanel())}
        aria-expanded={open}
        aria-label="Talk directly with GurSimar"
        className={cn(
          "group fixed bottom-4 left-3 z-[65] inline-flex items-center gap-3 overflow-hidden rounded-full border border-white/15 px-3.5 py-2.5 text-left text-white shadow-[0_26px_60px_-24px_rgba(0,0,0,0.95)] transition-all duration-300 sm:bottom-5 sm:left-5 sm:px-4",
          "bg-[linear-gradient(140deg,#1c1d20_0%,#0b0c0e_55%,#000000_100%)]",
          "hover:-translate-y-0.5 hover:border-white/30 hover:shadow-[0_32px_70px_-24px_rgba(0,0,0,1)] active:translate-y-0 active:scale-[0.99]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950"
        )}
      >
        <span className="pointer-events-none absolute inset-0 -translate-x-[130%] skew-x-[-14deg] bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-[130%]" />
        <span className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/45 to-transparent" />

        <span className="relative grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/20 bg-[radial-gradient(120%_120%_at_30%_0%,rgba(255,255,255,0.22),transparent_65%)] text-white">
          {open ? <X className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
        </span>

        <span className="relative hidden flex-col leading-tight sm:flex">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em]">
            Talk Directly With GurSimar
          </span>
          <span className="mt-1 flex items-center gap-1.5 text-[9px] uppercase tracking-[0.18em] text-white/60">
            <StatusDot online={online} />
            {availability ? (online ? "Online" : "Offline") : "Checking status"}
          </span>
        </span>
        <span className="relative flex flex-col leading-tight sm:hidden">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em]">Direct chat</span>
          <span className="mt-1 flex items-center gap-1.5 text-[8px] uppercase tracking-[0.16em] text-white/60">
            <StatusDot online={online} />
            {online ? "Online" : "Offline"}
          </span>
        </span>
      </button>

      {open && (
        <div className="fixed inset-x-3 bottom-20 z-[65] sm:inset-x-auto sm:bottom-24 sm:left-5 sm:w-[390px]">
          <div
            className={cn(
              "relative flex h-[min(74vh,580px)] flex-col overflow-hidden rounded-3xl border border-white/12 bg-[linear-gradient(165deg,#15171b_0%,#0a0b0e_46%,#050608_100%)] text-neutral-100 shadow-[0_50px_120px_-32px_rgba(0,0,0,1)] backdrop-blur-2xl",
              closing ? "chat-panel-out" : "chat-panel-in"
            )}
            role="dialog"
            aria-label="Direct conversation with GurSimar"
          >
            <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/45 to-transparent" />
            <span className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full bg-emerald-300/10 blur-3xl" />
            <span className="pointer-events-none absolute inset-0 opacity-[0.045] [background-image:radial-gradient(rgba(255,255,255,0.9)_0.5px,transparent_0.5px)] [background-size:3px_3px]" />

            <header className="relative flex items-center justify-between gap-3 border-b border-white/10 bg-white/[0.02] px-4 py-3.5">
              <div className="flex items-center gap-3">
                <span className="relative grid h-10 w-10 place-items-center overflow-hidden rounded-full border border-white/20 bg-gradient-to-b from-neutral-600 to-neutral-900 text-[11px] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]">
                  <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_120%_at_30%_0%,rgba(255,255,255,0.3),transparent_62%)]" />
                  GS
                  <span
                    className={cn(
                      "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-[#0a0b0e]",
                      online ? "bg-emerald-400" : "bg-neutral-500"
                    )}
                  />
                </span>
                <div>
                  <p className="text-[13px] font-semibold tracking-tight text-white">GurSimar</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-[9px] uppercase tracking-[0.16em] text-white/55">
                    <StatusDot online={online} />
                    {availabilityLabel}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closePanel}
                aria-label="Close chat"
                className="grid h-8 w-8 place-items-center rounded-full border border-white/12 text-white/60 transition-all hover:border-white/30 hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </header>

            {!session ? (
              <form onSubmit={start} className="relative flex flex-1 flex-col justify-center gap-3.5 px-5 py-6">
                <div className="mb-1">
                  <p className="text-[14px] font-semibold text-white">Start a direct conversation</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-white/55">
                    Share your name and email so replies reach you. Messages go straight to GurSimar&apos;s dashboard.
                  </p>
                </div>
                <label className="block">
                  <span className="text-[9px] uppercase tracking-[0.22em] text-white/50">Your name</span>
                  <input
                    required
                    value={form.name}
                    onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                    placeholder="Full name"
                    className="mt-1.5 w-full rounded-xl border border-white/15 bg-black/50 px-3.5 py-2.5 text-[13px] text-white outline-none transition-colors placeholder:text-white/30 focus:border-white/50 focus:bg-black/70"
                  />
                </label>
                <label className="block">
                  <span className="text-[9px] uppercase tracking-[0.22em] text-white/50">Email</span>
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                    placeholder="you@example.com"
                    className="mt-1.5 w-full rounded-xl border border-white/15 bg-black/50 px-3.5 py-2.5 text-[13px] text-white outline-none transition-colors placeholder:text-white/30 focus:border-white/50 focus:bg-black/70"
                  />
                </label>

                {error && (
                  <p className="flex items-start gap-2 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-[11px] text-red-200">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={starting}
                  className="mt-1 inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-950 transition-all hover:-translate-y-0.5 hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {starting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MessageSquare className="h-3.5 w-3.5" />}
                  {starting ? "Starting…" : "Start conversation"}
                </button>
                <p className="flex items-start gap-1.5 text-[9px] leading-relaxed text-white/35">
                  <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0" />
                  Your conversation stays private to you and the administrator.
                </p>
              </form>
            ) : (
              <>
                <div ref={scrollRef} className="relative flex-1 space-y-3 overflow-y-auto px-4 py-4">
                  {loading && messages.length === 0 && (
                    <p className="flex items-center justify-center gap-2 py-8 text-[11px] text-white/50">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading conversation…
                    </p>
                  )}

                  {!loading && messages.length === 0 && (
                    <div className="rounded-xl border border-white/12 bg-white/[0.04] p-3.5 text-[11px] leading-relaxed text-white/65">
                      Hi {session.name.split(" ")[0]}, this is a direct line to GurSimar. Describe your project,
                      share a deadline, and you will get a reply here.
                    </div>
                  )}

                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn("flex chat-bubble-in", message.sender === "visitor" ? "justify-end" : "justify-start")}
                    >
                      <div
                        className={cn(
                          "max-w-[86%] rounded-2xl px-3.5 py-2.5 text-[12px] leading-relaxed shadow-[0_12px_28px_-20px_rgba(0,0,0,1)]",
                          message.sender === "visitor"
                            ? "rounded-br-md bg-white text-neutral-900"
                            : "rounded-bl-md border border-white/12 bg-white/[0.08] text-white/95"
                        )}
                      >
                        <p className="whitespace-pre-wrap break-words">{message.body}</p>
                        <p
                          className={cn(
                            "mt-1.5 text-[8px] uppercase tracking-[0.16em]",
                            message.sender === "visitor" ? "text-neutral-500" : "text-white/45"
                          )}
                        >
                          {message.sender === "visitor" ? "You" : "GurSimar"} · {clock(message.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}

                  {sending && (
                    <div className="flex justify-start">
                      <span className="flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-white/12 bg-white/[0.08] px-3.5 py-2.5">
                        {[0, 1, 2].map((index) => (
                          <span
                            key={index}
                            className="h-1 w-1 rounded-full bg-white/70"
                            style={{ animation: `pulse 1.2s ease-in-out ${index * 0.16}s infinite` }}
                          />
                        ))}
                      </span>
                    </div>
                  )}

                  <div ref={bottomRef} />
                </div>

                {error && (
                  <p className="mx-4 mb-2 flex items-start gap-2 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-[10px] text-red-200">
                    <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                    {error}
                  </p>
                )}

                {status === "resolved" ? (
                  <div className="border-t border-white/10 px-4 py-4">
                    <p className="text-[11px] text-white/60">This conversation was marked resolved.</p>
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={reset}
                        className="rounded-full bg-white px-3.5 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-950 transition-colors hover:bg-neutral-200"
                      >
                        Start new conversation
                      </button>
                      <a
                        href="#contact"
                        onClick={closePanel}
                        className="inline-flex items-center gap-1 rounded-full border border-white/18 px-3.5 py-2 text-[10px] uppercase tracking-[0.14em] text-white/70 transition-colors hover:border-white/35 hover:text-white"
                      >
                        Hire form <ArrowUpRight className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={send} className="relative border-t border-white/10 bg-black/20 px-3 py-3">
                    <div className="flex items-end gap-2">
                      <textarea
                        value={draft}
                        onChange={(event) => setDraft(event.target.value.slice(0, 2000))}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" && !event.shiftKey) {
                            event.preventDefault();
                            void send(event);
                          }
                        }}
                        rows={1}
                        placeholder="Write a message…"
                        className="max-h-28 min-h-[44px] flex-1 resize-none rounded-xl border border-white/15 bg-black/50 px-3.5 py-2.5 text-[12px] text-white outline-none transition-colors placeholder:text-white/30 focus:border-white/45 focus:bg-black/70"
                      />
                      <button
                        type="submit"
                        disabled={sending || !draft.trim()}
                        aria-label="Send message"
                        className="grid h-[44px] w-[44px] shrink-0 place-items-center rounded-xl bg-white text-neutral-950 transition-all hover:-translate-y-0.5 hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      </button>
                    </div>
                    <p className="mt-2 flex items-center gap-1.5 text-[8px] uppercase tracking-[0.16em] text-white/40">
                      <StatusDot online={online} />
                      {availability ? (online ? "Online now" : "Offline · replies arrive here") : "Checking status…"}
                    </p>
                  </form>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
