import { useEffect, useState } from "react";
import {
  ArrowRight,
  Bot,
  Inbox,
  Loader2,
  MessageSquare,
  Sparkles,
  TrendingUp,
  UserRound,
} from "lucide-react";
import { api, type AdminOverview } from "@/admin/api";
import { Panel, RequestPill, StatCard, buttonClass, formatWhen } from "@/admin/ui";
import { cn } from "@/lib/utils";

export function OverviewPanel({
  overview,
  onNavigate,
}: {
  overview: AdminOverview | null;
  onNavigate: (section: "requests" | "conversations" | "clients" | "ai" | "portfolio") => void;
}) {
  const [local, setLocal] = useState<AdminOverview | null>(overview);

  useEffect(() => {
    setLocal(overview);
  }, [overview]);

  useEffect(() => {
    if (overview) return;
    api
      .overview()
      .then(setLocal)
      .catch(() => undefined);
  }, [overview]);

  if (!local) {
    return (
      <p className="flex items-center justify-center gap-2 py-16 text-[11px] text-white/40">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading dashboard…
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          label="New requests"
          value={local.requests.new}
          hint={`${local.requests.total} total`}
          accent="cyan"
        />
        <StatCard
          label="Unread messages"
          value={local.conversations.unread}
          hint={`${local.conversations.open} open chats`}
          accent={local.conversations.unread > 0 ? "amber" : "emerald"}
        />
        <StatCard
          label="Accepted projects"
          value={local.requests.accepted}
          hint={`${local.requests.discussion} in discussion`}
          accent="emerald"
        />
        <StatCard
          label="Published work"
          value={local.projects.published}
          hint={`${local.projects.total} projects total`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <Panel
          title="Latest inquiries"
          hint="Real submissions from the Hire Me form"
          className="lg:col-span-7"
          action={
            <button type="button" onClick={() => onNavigate("requests")} className={buttonClass}>
              All requests <ArrowRight className="h-3 w-3" />
            </button>
          }
        >
          {local.recentRequests.length === 0 ? (
            <div className="grid place-items-center py-10 text-center">
              <span className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-white/40">
                <Inbox className="h-5 w-5" />
              </span>
              <p className="mt-3 text-[12px] text-white/60">No inquiries yet</p>
              <p className="mt-1 max-w-xs text-[10px] leading-relaxed text-white/30">
                Submissions appear here the moment a visitor sends the Hire Me form.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-white/[0.06]">
              {local.recentRequests.map((request) => (
                <li key={request.id}>
                  <button
                    type="button"
                    onClick={() => onNavigate("requests")}
                    className="flex w-full items-center justify-between gap-3 py-2.5 text-left transition-colors hover:bg-white/[0.03]"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-[12px] text-white">{request.name}</p>
                        <RequestPill status={request.status} />
                      </div>
                      <p className="mt-0.5 truncate text-[10px] text-white/35">
                        {request.category} · {request.budget} · {formatWhen(request.createdAt)}
                      </p>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-white/20" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <div className="space-y-4 lg:col-span-5">
          <Panel title="Status at a glance">
            <div className="space-y-1.5">
              {[
                { label: "Reviewed", value: local.requests.reviewed },
                { label: "In discussion", value: local.requests.discussion },
                { label: "Accepted", value: local.requests.accepted },
                { label: "Rejected", value: local.requests.rejected },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-3 py-1.5">
                  <span className="text-[11px] text-white/45">{row.label}</span>
                  <span className="text-[11px] text-white/70">{row.value}</span>
                </div>
              ))}
              <div className="mt-2 flex items-center gap-2 border-t border-white/10 pt-3">
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    local.availability.online ? "bg-emerald-400" : "bg-neutral-500"
                  )}
                />
                <span className="text-[10px] uppercase tracking-[0.16em] text-white/40">
                  Public chat {local.availability.online ? "Online" : "Offline"}
                </span>
              </div>
            </div>
          </Panel>

          <Panel title="Quick actions">
            <div className="grid gap-2">
              <button type="button" onClick={() => onNavigate("conversations")} className={cn(buttonClass, "w-full justify-start")}>
                <MessageSquare className="h-3.5 w-3.5" /> Open live conversations
              </button>
              <button type="button" onClick={() => onNavigate("clients")} className={cn(buttonClass, "w-full justify-start")}>
                <UserRound className="h-3.5 w-3.5" /> Browse client details
              </button>
              <button type="button" onClick={() => onNavigate("ai")} className={cn(buttonClass, "w-full justify-start")}>
                <Bot className="h-3.5 w-3.5" /> AI assistant settings
                <span className="ml-auto flex items-center gap-1 text-[8px] uppercase tracking-[0.14em] text-white/30">
                  {local.ai.enabled ? (local.ai.configured ? "live" : "no key") : "off"}
                  <Sparkles className="h-2.5 w-2.5" />
                </span>
              </button>
              <button type="button" onClick={() => onNavigate("portfolio")} className={cn(buttonClass, "w-full justify-start")}>
                <TrendingUp className="h-3.5 w-3.5" /> Manage portfolio work
              </button>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
