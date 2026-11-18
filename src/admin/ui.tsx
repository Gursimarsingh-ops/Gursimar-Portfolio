import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { RequestStatus } from "@/admin/api";

export function formatWhen(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function StatCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: "amber" | "emerald" | "cyan";
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.015] p-4 backdrop-blur">
      <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">{label}</p>
        {accent && (
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              accent === "amber" && "bg-amber-400",
              accent === "emerald" && "bg-emerald-400",
              accent === "cyan" && "bg-cyan-400"
            )}
          />
        )}
      </div>
      <p className="mt-2 font-serif text-2xl text-white">{value}</p>
      {hint && <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-white/30">{hint}</p>}
    </div>
  );
}

export function Panel({
  title,
  hint,
  action,
  children,
  className,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] backdrop-blur",
        className
      )}
    >
      <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
        <div>
          <h2 className="text-[11px] uppercase tracking-[0.2em] text-white/60">{title}</h2>
          {hint && <p className="mt-1 text-[10px] text-white/30">{hint}</p>}
        </div>
        {action}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

export const REQUEST_STATUS_META: Record<RequestStatus, { label: string; className: string }> = {
  new: { label: "New", className: "border-cyan-400/30 bg-cyan-400/10 text-cyan-200" },
  reviewed: { label: "Reviewed", className: "border-white/20 bg-white/10 text-white/80" },
  discussion: { label: "In discussion", className: "border-amber-400/30 bg-amber-400/10 text-amber-200" },
  accepted: { label: "Accepted", className: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200" },
  rejected: { label: "Rejected", className: "border-red-400/25 bg-red-500/10 text-red-200" },
};

export function RequestPill({ status }: { status: RequestStatus }) {
  const meta = REQUEST_STATUS_META[status] ?? REQUEST_STATUS_META.new;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-[0.14em]",
        meta.className
      )}
    >
      {meta.label}
    </span>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: typeof import("lucide-react").Inbox;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="grid place-items-center px-6 py-14 text-center">
      <span className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-white/40">
        <Icon className="h-5 w-5" />
      </span>
      <p className="mt-4 text-sm text-white/70">{title}</p>
      <p className="mt-1.5 max-w-sm text-[11px] leading-relaxed text-white/35">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export const inputClass =
  "w-full rounded-lg border border-white/12 bg-black/40 px-3 py-2 text-[12px] text-white outline-none transition-colors placeholder:text-white/25 focus:border-white/40";

export const buttonClass =
  "inline-flex items-center justify-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3.5 py-2 text-[10px] uppercase tracking-[0.14em] text-white/70 transition-all hover:-translate-y-0.5 hover:border-white/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-40";

export const primaryButtonClass =
  "inline-flex items-center justify-center gap-1.5 rounded-full bg-white px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-950 transition-all hover:-translate-y-0.5 hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-40";
