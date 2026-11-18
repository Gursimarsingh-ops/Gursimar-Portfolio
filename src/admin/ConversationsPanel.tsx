import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Circle,
  Loader2,
  MessageSquare,
  Send,
  UserRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api, type ConversationDetail, type ConversationSummary } from "@/admin/api";
import { EmptyState, Panel, buttonClass, formatWhen, inputClass } from "@/admin/ui";

export function ConversationsPanel({ onChanged }: { onChanged: () => void }) {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [online, setOnline] = useState(false);
  const [availabilityKnown, setAvailabilityKnown] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ConversationDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const loadList = useCallback(async () => {
    try {
      const result = await api.conversations();
      setConversations(result.conversations);
      setOnline(result.availability.online);
      setAvailabilityKnown(true);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load conversations.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadList();
    const timer = window.setInterval(() => void loadList(), 6000);
    return () => window.clearInterval(timer);
  }, [loadList]);

  const loadDetail = useCallback(async (id: string) => {
    try {
      const result = await api.conversation(id);
      setDetail(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the conversation.");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    setDetailLoading(true);
    void loadDetail(selectedId).then(() => onChanged());
    const timer = window.setInterval(() => void loadDetail(selectedId), 5000);
    return () => window.clearInterval(timer);
  }, [selectedId, loadDetail, onChanged]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [detail?.messages.length, selectedId]);

  const toggleAvailability = async () => {
    setToggling(true);
    setActionMessage(null);
    try {
      const result = await api.setAvailability(!online);
      setOnline(result.online);
      setActionMessage(
        result.online
          ? "You are now shown as online on the public chat button."
          : "You are now shown as offline. Visitors can still leave messages."
      );
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : "Could not update availability.");
    } finally {
      setToggling(false);
    }
  };

  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedId || !reply.trim() || sending) return;
    const body = reply.trim();
    setSending(true);
    setActionMessage(null);
    try {
      await api.replyConversation(selectedId, body);
      setReply("");
      await loadDetail(selectedId);
      await loadList();
      onChanged();
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : "Could not send the reply.");
    } finally {
      setSending(false);
    }
  };

  const setStatus = async (status: "open" | "resolved") => {
    if (!selectedId) return;
    try {
      await api.setConversationStatus(selectedId, status);
      await loadDetail(selectedId);
      await loadList();
      onChanged();
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : "Could not update the conversation.");
    }
  };

  const unreadTotal = conversations.reduce((total, conversation) => total + conversation.unread, 0);

  return (
    <div className="space-y-4">
      <Panel
        title="Availability"
        hint="This is the real status shown on the public Talk Directly button"
        action={
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] uppercase tracking-[0.14em]",
              online
                ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                : "border-white/15 bg-white/5 text-white/50"
            )}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", online ? "bg-emerald-400" : "bg-neutral-500")} />
            {availabilityKnown ? (online ? "Online" : "Offline") : "Loading"}
          </span>
        }
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-md text-[11px] leading-relaxed text-white/45">
            Visitors see "GurSimar is Online" only while this switch is on. Messages are still stored and
            delivered when you are offline.
          </p>
          <button
            type="button"
            onClick={() => void toggleAvailability()}
            disabled={toggling || !availabilityKnown}
            className={cn(
              "relative inline-flex h-9 w-16 shrink-0 items-center rounded-full border transition-colors disabled:opacity-50",
              online ? "border-emerald-400/40 bg-emerald-500/20" : "border-white/15 bg-white/[0.05]"
            )}
            aria-pressed={online}
            aria-label="Toggle availability"
          >
            <span
              className={cn(
                "mx-1 grid h-7 w-7 place-items-center rounded-full bg-white text-neutral-900 shadow transition-transform",
                online ? "translate-x-7" : "translate-x-0"
              )}
            >
              {toggling ? <Loader2 className="h-3 w-3 animate-spin" /> : <Circle className="h-2 w-2 fill-current" />}
            </span>
          </button>
        </div>
        {actionMessage && <p className="mt-2 text-[10px] text-white/45">{actionMessage}</p>}
      </Panel>

      {error && (
        <p className="flex items-start gap-2 rounded-lg border border-red-400/25 bg-red-500/10 px-3 py-2 text-[11px] text-red-200">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-12">
        <div className={cn("lg:col-span-5", selectedId && "hidden lg:block")}>
          <Panel
            title="Live conversations"
            hint="Messages from the public direct chat"
            action={
              unreadTotal > 0 ? (
                <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-1 text-[9px] uppercase tracking-[0.14em] text-cyan-200">
                  {unreadTotal} unread
                </span>
              ) : undefined
            }
          >
            {loading ? (
              <p className="flex items-center justify-center gap-2 py-10 text-[11px] text-white/40">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </p>
            ) : conversations.length === 0 ? (
              <EmptyState
                icon={MessageSquare}
                title="No conversations yet"
                description="When a visitor starts a direct chat it appears here with unread counts."
              />
            ) : (
              <ul className="divide-y divide-white/[0.06]">
                {conversations.map((conversation) => (
                  <li key={conversation.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(conversation.id)}
                      className={cn(
                        "flex w-full flex-col gap-1 px-1 py-3 text-left transition-colors hover:bg-white/[0.03]",
                        selectedId === conversation.id && "bg-white/[0.04]"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.05] text-white/50">
                            <UserRound className="h-3.5 w-3.5" />
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-[12px] text-white">{conversation.name}</span>
                            <span className="block truncate text-[10px] text-white/35">{conversation.email}</span>
                          </span>
                        </span>
                        {conversation.unread > 0 && (
                          <span className="grid h-5 min-w-5 place-items-center rounded-full bg-white px-1.5 text-[9px] font-semibold text-neutral-950">
                            {conversation.unread}
                          </span>
                        )}
                      </div>
                      <p className="truncate text-[10px] text-white/35">
                        {conversation.lastMessage
                          ? `${conversation.lastSender === "admin" ? "You: " : ""}${conversation.lastMessage}`
                          : "No messages yet"}
                      </p>
                      <div className="flex items-center justify-between gap-2 text-[8px] uppercase tracking-[0.14em] text-white/25">
                        <span>{formatWhen(conversation.lastMessageAt ?? conversation.createdAt)}</span>
                        <span className={conversation.status === "resolved" ? "text-emerald-300/70" : ""}>
                          {conversation.status}
                        </span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className={cn("lg:col-span-7", !selectedId && "hidden lg:block")}>
          <Panel
            title={detail ? detail.conversation.name : "Conversation"}
            hint={detail ? detail.conversation.email : "Select a conversation to read and reply"}
            action={
              selectedId ? (
                <button type="button" onClick={() => setSelectedId(null)} className={buttonClass + " lg:hidden"}>
                  <ArrowLeft className="h-3 w-3" /> Back
                </button>
              ) : undefined
            }
          >
            {!selectedId ? (
              <EmptyState
                icon={MessageSquare}
                title="Choose a conversation"
                description="Open a thread to read the full history and reply as the administrator."
              />
            ) : detailLoading && !detail ? (
              <p className="flex items-center justify-center gap-2 py-10 text-[11px] text-white/40">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading conversation…
              </p>
            ) : detail ? (
              <>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <span
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-[9px] uppercase tracking-[0.14em]",
                      detail.conversation.status === "resolved"
                        ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                        : "border-cyan-400/30 bg-cyan-400/10 text-cyan-200"
                    )}
                  >
                    {detail.conversation.status === "resolved" ? "Resolved" : "Open"}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      void setStatus(detail.conversation.status === "resolved" ? "open" : "resolved")
                    }
                    className={buttonClass}
                  >
                    <Check className="h-3 w-3" />
                    {detail.conversation.status === "resolved" ? "Reopen" : "Mark resolved"}
                  </button>
                </div>

                <div className="max-h-[46vh] space-y-3 overflow-y-auto rounded-xl border border-white/[0.06] bg-black/20 p-3">
                  {detail.messages.length === 0 && (
                    <p className="py-8 text-center text-[11px] text-white/30">
                      No messages yet. The visitor opened this conversation but has not written.
                    </p>
                  )}
                  {detail.messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn("flex", message.sender === "admin" ? "justify-end" : "justify-start")}
                    >
                      <div
                        className={cn(
                          "max-w-[82%] rounded-2xl px-3.5 py-2.5 text-[12px] leading-relaxed",
                          message.sender === "admin"
                            ? "rounded-br-md bg-white text-neutral-900"
                            : "rounded-bl-md border border-white/10 bg-white/[0.06] text-white/85"
                        )}
                      >
                        <p className="whitespace-pre-wrap break-words">{message.body}</p>
                        <p
                          className={cn(
                            "mt-1 text-[8px] uppercase tracking-[0.14em]",
                            message.sender === "admin" ? "text-neutral-400" : "text-white/30"
                          )}
                        >
                          {message.sender === "admin" ? "You" : detail.conversation.name} ·{" "}
                          {formatWhen(message.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={bottomRef} />
                </div>

                <form onSubmit={send} className="mt-3 flex items-end gap-2">
                  <textarea
                    value={reply}
                    onChange={(event) => setReply(event.target.value.slice(0, 2000))}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        void send(event);
                      }
                    }}
                    rows={2}
                    placeholder="Reply to this client…"
                    className={cn(inputClass, "resize-none")}
                  />
                  <button
                    type="submit"
                    disabled={sending || !reply.trim()}
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-neutral-950 transition-all hover:-translate-y-0.5 disabled:opacity-40"
                    aria-label="Send reply"
                  >
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </button>
                </form>
                <p className="mt-1.5 text-[8px] uppercase tracking-[0.14em] text-white/25">
                  Replies appear in the visitor's chat within seconds
                </p>
              </>
            ) : (
              <p className="py-10 text-center text-[11px] text-white/35">Conversation unavailable.</p>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
