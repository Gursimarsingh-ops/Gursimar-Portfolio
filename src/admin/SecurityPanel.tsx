import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  KeyRound,
  Loader2,
  Lock,
  LogOut,
  ShieldCheck,
  Terminal,
  UserRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api, type SecurityInfo } from "@/admin/api";
import { Panel, StatCard, buttonClass, formatWhen } from "@/admin/ui";

export function SecurityPanel({ onSignedOut }: { onSignedOut: () => void }) {
  const [info, setInfo] = useState<SecurityInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .security()
      .then(setInfo)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not read security settings."))
      .finally(() => setLoading(false));
  }, []);

  const revoke = async (scope: "others" | "all") => {
    const label = scope === "all" ? "every session (including this one)" : "all other sessions";
    if (!window.confirm(`Sign out ${label}?`)) return;
    setBusy(true);
    setNotice(null);
    setError(null);
    try {
      const result = await api.revokeSessions(scope);
      setNotice(
        scope === "all"
          ? "All sessions revoked. Signing you out…"
          : `${result.revoked ?? 0} other session(s) revoked.`
      );
      if (scope === "all") window.setTimeout(onSignedOut, 900);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not revoke sessions.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <p className="flex items-center justify-center gap-2 py-16 text-[11px] text-white/40">
        <Loader2 className="h-4 w-4 animate-spin" /> Reading security settings…
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Administrator"
          value={info?.administrator.configured ? "Configured" : "Missing"}
          hint={info?.administrator.email ?? "ADMIN_EMAIL not set"}
          accent={info?.administrator.configured ? "emerald" : "amber"}
        />
        <StatCard
          label="Active sessions"
          value={info?.sessions.active ?? 0}
          hint={`${info?.controls.sessionTtlDays ?? 7}-day HttpOnly cookie`}
          accent="cyan"
        />
        <StatCard
          label="AI key"
          value={info?.ai.configured ? "Configured" : "Missing"}
          hint={info?.ai.provider ?? "openai-compatible"}
          accent={info?.ai.configured ? "emerald" : "amber"}
        />
      </div>

      {error && (
        <p className="flex items-start gap-2 rounded-lg border border-red-400/25 bg-red-500/10 px-3 py-2 text-[11px] text-red-200">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-12">
        <Panel title="Sessions" hint="Only token hashes are stored, never the cookie value" className="lg:col-span-7">
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void revoke("others")} disabled={busy} className={buttonClass}>
              <LogOut className="h-3 w-3" /> Sign out other sessions
            </button>
            <button
              type="button"
              onClick={() => void revoke("all")}
              disabled={busy}
              className="inline-flex items-center justify-center gap-1.5 rounded-full border border-red-400/25 bg-red-500/10 px-3.5 py-2 text-[10px] uppercase tracking-[0.14em] text-red-200 transition-colors hover:border-red-400/50 disabled:opacity-40"
            >
              <Lock className="h-3 w-3" /> Revoke every session
            </button>
          </div>
          {notice && <p className="mt-3 text-[10px] text-white/50">{notice}</p>}

          <ul className="mt-4 divide-y divide-white/[0.06]">
            {(info?.sessions.recent ?? []).length === 0 && (
              <li className="py-3 text-[11px] text-white/35">No active sessions recorded.</li>
            )}
            {(info?.sessions.recent ?? []).map((session) => (
              <li key={`${session.createdAt}-${session.expiresAt}`} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <span className="flex items-center gap-2 text-[11px] text-white/60">
                  <Clock className="h-3 w-3 text-white/30" />
                  Started {formatWhen(session.createdAt)}
                </span>
                <span className="text-[9px] uppercase tracking-[0.14em] text-white/30">
                  Expires {formatWhen(session.expiresAt)}
                </span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Controls in force" hint="Server-side, applied to every request" className="lg:col-span-5">
          <ul className="space-y-2 text-[11px]">
            {[
              ["Password hashing", info?.controls.passwordHash ?? "PBKDF2-SHA256"],
              ["Session cookie", info?.controls.httpOnlyCookie ? "HttpOnly · SameSite=Strict" : "unverified"],
              ["Origin checking", info?.controls.originCheck ? "Enforced on mutations" : "unverified"],
              ["Login throttling", info?.controls.loginAttempts ?? "8 per 15 minutes"],
              ["Admin API", "Re-validated on every request"],
            ].map(([label, value]) => (
              <li key={label} className="flex items-start justify-between gap-3 border-b border-white/[0.06] pb-2 last:border-b-0">
                <span className="text-white/40">{label}</span>
                <span className="flex items-center gap-1.5 text-right text-white/70">
                  <CheckCircle2 className="h-3 w-3 text-emerald-400/70" />
                  {value}
                </span>
              </li>
            ))}
          </ul>
          <a href="/security" className={cn(buttonClass, "mt-4 w-full")}>
            <ShieldCheck className="h-3 w-3" /> Open the vault
          </a>
        </Panel>
      </div>

      <Panel title="Rotate the administrator password" hint="The password is never stored in source or in the browser">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-white/45">
              <KeyRound className="h-3.5 w-3.5" /> Generate a new hash
            </p>
            <pre className="mt-2 overflow-x-auto rounded-lg border border-white/10 bg-black/40 p-3 font-mono text-[10px] leading-relaxed text-white/60">
{`# 1. Create the hash locally (never commit it)
node scripts/hash-admin-password.mjs "<new-long-password>"

# 2. Store it as a Worker secret
npx wrangler secret put ADMIN_PASSWORD_HASH

# 3. Redeploy, then revoke old sessions
npm run build && npx wrangler deploy`}
            </pre>
          </div>
          <div>
            <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-white/45">
              <Terminal className="h-3.5 w-3.5" /> Local development
            </p>
            <pre className="mt-2 overflow-x-auto rounded-lg border border-white/10 bg-black/40 p-3 font-mono text-[10px] leading-relaxed text-white/60">
{`# .dev.vars (git-ignored)
ADMIN_EMAIL=gursimarsingh9390@gmail.com
ADMIN_PASSWORD_HASH=pbkdf2:100000:<salt>:<hash>`}
            </pre>
            <p className="mt-3 flex items-start gap-2 text-[10px] leading-relaxed text-white/35">
              <UserRound className="mt-0.5 h-3 w-3 shrink-0" />
              Only the account for {info?.administrator.email ?? "the configured administrator email"} can sign in.
              Changing the email requires updating the ADMIN_EMAIL secret.
            </p>
          </div>
        </div>
      </Panel>
    </div>
  );
}
