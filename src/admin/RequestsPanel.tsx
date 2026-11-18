import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Download,
  Inbox,
  Loader2,
  Search,
  Save,
  Trash2,
  UserRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  api,
  formatBytes,
  type ClientRequest,
  type RequestDetail,
  type RequestStatus,
} from "@/admin/api";
import {
  EmptyState,
  Panel,
  REQUEST_STATUS_META,
  RequestPill,
  buttonClass,
  formatWhen,
  inputClass,
} from "@/admin/ui";

const STATUS_OPTIONS: RequestStatus[] = ["new", "reviewed", "discussion", "accepted", "rejected"];

export function RequestsPanel({ initialSearch = "", onChanged }: { initialSearch?: string; onChanged: () => void }) {
  const [search, setSearch] = useState(initialSearch);
  const [status, setStatus] = useState<"" | RequestStatus>("");
  const [requests, setRequests] = useState<ClientRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const result = await api.requests({ search: search.trim(), status });
      setRequests(result.requests);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load requests.");
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 300);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    setSearch(initialSearch);
  }, [initialSearch]);

  if (selected) {
    return (
      <RequestDetailView
        id={selected}
        onBack={() => setSelected(null)}
        onOpenRequest={(id) => setSelected(id)}
        onChanged={() => {
          void load();
          onChanged();
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <Panel
        title="Requests received"
        hint="Every Hire Me submission is stored in the database with a unique id"
        action={
          <span className="rounded-full border border-white/12 px-2.5 py-1 text-[9px] uppercase tracking-[0.14em] text-white/40">
            {requests.length} shown
          </span>
        }
      >
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, email, category, id…"
              className={cn(inputClass, "pl-9")}
            />
          </label>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as "" | RequestStatus)}
            className={cn(inputClass, "sm:w-48")}
          >
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {REQUEST_STATUS_META[option].label}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <p className="mt-3 flex items-start gap-2 rounded-lg border border-red-400/25 bg-red-500/10 px-3 py-2 text-[11px] text-red-200">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {error}
          </p>
        )}

        <div className="mt-4">
          {loading ? (
            <p className="flex items-center justify-center gap-2 py-10 text-[11px] text-white/40">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading requests…
            </p>
          ) : requests.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title={search || status ? "No requests match this filter" : "No requests yet"}
              description={
                search || status
                  ? "Try a different search term or status filter."
                  : "Submissions from the public Hire Me form will appear here instantly."
              }
            />
          ) : (
            <ul className="divide-y divide-white/[0.06]">
              {requests.map((request) => (
                <li key={request.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(request.id)}
                    className="group flex w-full flex-col gap-2 px-1 py-3 text-left transition-colors hover:bg-white/[0.03] sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-[13px] text-white">{request.name}</p>
                        <RequestPill status={request.status} />
                        {request.fileCount > 0 && (
                          <span className="inline-flex items-center gap-1 text-[9px] uppercase tracking-[0.14em] text-white/30">
                            <Download className="h-2.5 w-2.5" />
                            {request.fileCount}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 truncate text-[11px] text-white/40">
                        {request.email} · {request.category}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-4 text-[10px] uppercase tracking-[0.12em] text-white/30">
                      <span className="hidden sm:inline">{request.budget}</span>
                      <span>{formatWhen(request.createdAt)}</span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Panel>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="border-b border-white/[0.06] py-2 last:border-b-0">
      <p className="text-[9px] uppercase tracking-[0.18em] text-white/30">{label}</p>
      <p className="mt-1 whitespace-pre-wrap break-words text-[12px] leading-relaxed text-white/75">{value}</p>
    </div>
  );
}

function RequestDetailView({
  id,
  onBack,
  onOpenRequest,
  onChanged,
}: {
  id: string;
  onBack: () => void;
  onOpenRequest: (id: string) => void;
  onChanged: () => void;
}) {
  const [detail, setDetail] = useState<RequestDetail | null>(null);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<RequestStatus>("new");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .requestDetail(id)
      .then((result) => {
        if (cancelled) return;
        setDetail(result);
        setNotes(result.request.adminNotes);
        setStatus(result.request.status);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load this request.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const save = useCallback(
    async (nextStatus: RequestStatus = status, nextNotes: string = notes) => {
      setSaving(true);
      setMessage(null);
      setError(null);
      try {
        await api.updateRequest(id, { status: nextStatus, adminNotes: nextNotes });
        setMessage("Request saved.");
        setStatus(nextStatus);
        onChanged();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save the request.");
      } finally {
        setSaving(false);
      }
    },
    [id, notes, status, onChanged]
  );

  const remove = async () => {
    if (!detail) return;
    if (!window.confirm(`Delete the request from ${detail.request.name}? This removes its attachments too.`)) return;
    setDeleting(true);
    try {
      await api.deleteRequest(id);
      onChanged();
      onBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete the request.");
      setDeleting(false);
    }
  };

  const quickTotals = useMemo(() => {
    if (!detail) return null;
    return { files: detail.files.length, history: detail.history.length };
  }, [detail]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={onBack} className={buttonClass}>
          <ArrowLeft className="h-3.5 w-3.5" /> All requests
        </button>
        <button
          type="button"
          onClick={() => void remove()}
          disabled={deleting}
          className="inline-flex items-center gap-1.5 rounded-full border border-red-400/25 bg-red-500/10 px-3.5 py-2 text-[10px] uppercase tracking-[0.14em] text-red-200 transition-colors hover:border-red-400/50 disabled:opacity-40"
        >
          {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          Delete
        </button>
      </div>

      {loading ? (
        <p className="flex items-center justify-center gap-2 py-16 text-[11px] text-white/40">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading request…
        </p>
      ) : !detail ? (
        <p className="rounded-xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-[11px] text-red-200">
          {error ?? "Request not found."}
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-7">
            <Panel
              title="Project inquiry"
              hint={`ID ${detail.request.id}`}
              action={<RequestPill status={detail.request.status} />}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-full border border-white/12 bg-white/[0.05] text-white/60">
                  <UserRound className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[13px] text-white">{detail.request.name}</p>
                  <a
                    href={`mailto:${detail.request.email}`}
                    className="text-[11px] text-white/40 transition-colors hover:text-white"
                  >
                    {detail.request.email}
                  </a>
                </div>
              </div>

              <div className="mt-3">
                <InfoRow label="Project category" value={detail.request.category} />
                <InfoRow label="Budget" value={detail.request.budget} />
                <InfoRow label="Project description" value={detail.request.description} />
                <InfoRow label="Additional information" value={detail.request.extra} />
                <InfoRow label="Deadline" value={detail.request.deadline} />
                <InfoRow label="Reference links" value={detail.request.references} />
                <InfoRow label="Discord" value={detail.request.discord} />
                <InfoRow label="Company" value={detail.request.company} />
                <InfoRow label="Submitted" value={formatWhen(detail.request.createdAt)} />
                <InfoRow label="Last updated" value={formatWhen(detail.request.updatedAt)} />
              </div>
            </Panel>

            <Panel title="Attachments" hint="Private and visible only to signed-in administrators">
              {detail.files.length === 0 ? (
                <p className="text-[11px] text-white/35">No files were attached to this request.</p>
              ) : (
                <ul className="divide-y divide-white/[0.06]">
                  {detail.files.map((file) => (
                    <li key={file.id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-[12px] text-white/80">{file.name}</p>
                        <p className="mt-0.5 text-[9px] uppercase tracking-[0.14em] text-white/30">
                          {formatBytes(file.size)} · {file.type || "unknown"} · {formatWhen(file.createdAt)}
                        </p>
                      </div>
                      <a
                        href={`/api/admin/files/${file.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-[9px] uppercase tracking-[0.14em] text-white/60 transition-colors hover:border-white/35 hover:text-white"
                      >
                        <Download className="h-3 w-3" /> Download
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>

          <div className="space-y-4 lg:col-span-5">
            <Panel title="Status" hint="Only visible in the dashboard">
              <div className="flex flex-wrap gap-1.5">
                {STATUS_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => void save(option, notes)}
                    disabled={saving}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-[9px] uppercase tracking-[0.14em] transition-all disabled:opacity-50",
                      status === option
                        ? REQUEST_STATUS_META[option].className
                        : "border-white/10 bg-white/[0.03] text-white/45 hover:border-white/25 hover:text-white"
                    )}
                  >
                    {REQUEST_STATUS_META[option].label}
                  </button>
                ))}
              </div>
            </Panel>

            <Panel title="Private notes" hint="Internal only, never shown to the client">
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={6}
                placeholder="Quoted scope, call notes, follow-up date…"
                className={cn(inputClass, "resize-y")}
              />
              <button
                type="button"
                onClick={() => void save()}
                disabled={saving}
                className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-950 transition-all hover:-translate-y-0.5 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Save notes
              </button>
              {message && (
                <p className="mt-2 flex items-center gap-1.5 text-[10px] text-emerald-300/90">
                  <Check className="h-3 w-3" /> {message}
                </p>
              )}
              {error && <p className="mt-2 text-[10px] text-red-300">{error}</p>}
            </Panel>

            <Panel
              title="Client history"
              hint={`${quickTotals?.history ?? 0} previous request(s) from this email`}
            >
              {detail.history.length === 0 ? (
                <p className="text-[11px] text-white/35">This is the client's first request.</p>
              ) : (
                <ul className="divide-y divide-white/[0.06]">
                  {detail.history.map((row) => (
                    <li key={row.id}>
                      <button
                        type="button"
                        onClick={() => onOpenRequest(row.id)}
                        className="flex w-full items-center justify-between gap-2 py-2 text-left transition-colors hover:text-white"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-[11px] text-white/70">{row.category}</span>
                          <span className="mt-0.5 block text-[9px] uppercase tracking-[0.12em] text-white/30">
                            {formatWhen(row.created_at)} · {row.budget}
                          </span>
                        </span>
                        <RequestPill status={row.status} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </div>
      )}
    </div>
  );
}
