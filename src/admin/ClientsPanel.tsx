import { useEffect, useState } from "react";
import { AlertTriangle, Loader2, Search, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { api, type ClientRecord } from "@/admin/api";
import { EmptyState, Panel, buttonClass, formatWhen, inputClass } from "@/admin/ui";

export function ClientsPanel({ onOpenRequests }: { onOpenRequests: (search: string) => void }) {
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .clients()
      .then((result) => {
        if (!cancelled) setClients(result.clients);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load clients.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const term = search.trim().toLowerCase();
  const filtered = term
    ? clients.filter(
        (client) => client.name.toLowerCase().includes(term) || client.email.toLowerCase().includes(term)
      )
    : clients;

  return (
    <Panel
      title="Client details"
      hint="Every client who submitted an inquiry, grouped by email"
      action={
        <span className="rounded-full border border-white/12 px-2.5 py-1 text-[9px] uppercase tracking-[0.14em] text-white/40">
          {clients.length} clients
        </span>
      }
    >
      <label className="relative block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search client name or email…"
          className={cn(inputClass, "pl-9")}
        />
      </label>

      {error && (
        <p className="mt-3 flex items-start gap-2 rounded-lg border border-red-400/25 bg-red-500/10 px-3 py-2 text-[11px] text-red-200">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}

      <div className="mt-4">
        {loading ? (
          <p className="flex items-center justify-center gap-2 py-10 text-[11px] text-white/40">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading clients…
          </p>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title={clients.length === 0 ? "No clients yet" : "No matching clients"}
            description={
              clients.length === 0
                ? "Client records are created automatically from Hire Me submissions."
                : "Try a different name or email."
            }
          />
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {filtered.map((client) => (
              <li
                key={client.email}
                className="rounded-xl border border-white/10 bg-white/[0.025] p-3.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[12px] text-white">{client.name}</p>
                    <p className="mt-0.5 truncate text-[10px] text-white/40">{client.email}</p>
                  </div>
                  {client.newCount > 0 && (
                    <span className="shrink-0 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2 py-0.5 text-[8px] uppercase tracking-[0.14em] text-cyan-200">
                      {client.newCount} new
                    </span>
                  )}
                </div>

                <dl className="mt-3 grid grid-cols-2 gap-2 text-[9px] uppercase tracking-[0.12em] text-white/30">
                  <div>
                    <dt>Requests</dt>
                    <dd className="mt-0.5 text-[11px] normal-case tracking-normal text-white/70">
                      {client.requestCount}
                    </dd>
                  </div>
                  <div>
                    <dt>Chats</dt>
                    <dd className="mt-0.5 text-[11px] normal-case tracking-normal text-white/70">
                      {client.conversationCount}
                    </dd>
                  </div>
                  <div className="col-span-2">
                    <dt>Last request</dt>
                    <dd className="mt-0.5 text-[10px] normal-case tracking-normal text-white/50">
                      {formatWhen(client.lastRequestAt)}
                    </dd>
                  </div>
                </dl>

                <button
                  type="button"
                  onClick={() => onOpenRequests(client.email)}
                  className={cn(buttonClass, "mt-3 w-full")}
                >
                  View requests
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Panel>
  );
}
