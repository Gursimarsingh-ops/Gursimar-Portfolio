import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Eye, EyeOff, KeyRound, Loader2, Mail, Save, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { api, ApiError, type AdminAccountInfo } from "@/admin/api";

/**
 * Security Dashboard → Admin account.
 *
 * Email and password live in D1 (with the Worker secrets as the fallback).
 * Every save re-verifies the current password server-side, and a password
 * change revokes all older sessions.
 */
export function AdminAccountPanel() {
  const [info, setInfo] = useState<AdminAccountInfo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [email, setEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const next = await api.adminAccount();
      setInfo(next);
      setEmail(next.email ?? "");
      setConfirmEmail(next.email ?? "");
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not read the administrator account.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const minLength = info?.minPasswordLength ?? 12;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!currentPassword) {
      setError("Enter your current password to authorise this change.");
      return;
    }
    const emailChanged = email.trim().toLowerCase() !== (info?.email ?? "").toLowerCase();
    if (!emailChanged && !password) {
      setError("Change the email, the password, or both.");
      return;
    }
    if (emailChanged && email.trim().toLowerCase() !== confirmEmail.trim().toLowerCase()) {
      setError("The email addresses do not match.");
      return;
    }
    if (password && password !== confirmPassword) {
      setError("The new passwords do not match.");
      return;
    }
    if (password && password.length < minLength) {
      setError(`The new password must be at least ${minLength} characters.`);
      return;
    }

    setBusy(true);
    try {
      const result = await api.changeAdminAccount({
        currentPassword,
        ...(emailChanged ? { email: email.trim(), confirmEmail: confirmEmail.trim() } : {}),
        ...(password ? { password, confirmPassword } : {}),
      });
      setInfo({
        email: result.email,
        source: result.source,
        activeSessions: result.activeSessions,
        minPasswordLength: minLength,
      });
      setEmail(result.email);
      setConfirmEmail(result.email);
      setCurrentPassword("");
      setPassword("");
      setConfirmPassword("");
      const parts: string[] = [];
      if (result.emailChanged) parts.push("email updated");
      if (result.passwordChanged) {
        const count = result.sessionsRevoked;
        parts.push("password updated (" + count + " old session" + (count === 1 ? "" : "s") + " signed out)");
      }
      setSuccess("Saved — " + parts.join(" and ") + ". These credentials are active immediately.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The change could not be saved. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      aria-label="Administrator account"
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.055] to-white/[0.012] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)] backdrop-blur"
    >
      <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-emerald-400/[0.06] blur-3xl" />

      <div className="relative flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[9px] uppercase tracking-[0.3em] text-white/35">Credentials</p>
          <h2 className="mt-2 flex items-center gap-2 text-[15px] font-semibold tracking-[0.04em] text-white/90">
            <ShieldCheck className="h-4 w-4 text-emerald-300/80" />
            Admin account
          </h2>
          <p className="mt-1.5 text-[10px] leading-relaxed text-white/40">
            Change the email and password used to sign in. Your current password is required, and a password change
            signs out every other session.
          </p>
        </div>
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[9px] uppercase tracking-[0.14em] text-white/40">
          {info?.source === "dashboard" ? "Saved in D1" : info?.source === "environment" ? "Worker secrets" : "Not configured"}
          {info ? ` · ${info.activeSessions} session${info.activeSessions === 1 ? "" : "s"}` : ""}
        </span>
      </div>

      {loadError && (
        <p className="relative mt-3 flex items-start gap-2 rounded-lg border border-red-400/25 bg-red-500/10 px-3 py-2 text-[10px] text-red-200">
          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" /> {loadError}
        </p>
      )}

      <form onSubmit={submit} className="relative mt-4 grid gap-3 sm:grid-cols-2">
        <label className="sm:col-span-2">
          <span className="text-[9px] uppercase tracking-[0.18em] text-white/40">Current password</span>
          <div className="mt-1 flex items-center gap-2 rounded-xl border border-white/12 bg-black/40 px-3 focus-within:border-emerald-300/50">
            <KeyRound className="h-3.5 w-3.5 text-white/35" />
            <input
              type={showCurrent ? "text" : "password"}
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              autoComplete="current-password"
              className="h-10 w-full bg-transparent text-[12px] text-white outline-none placeholder:text-white/25"
              placeholder="Required to authorise any change"
            />
            <button
              type="button"
              onClick={() => setShowCurrent((value) => !value)}
              aria-label={showCurrent ? "Hide current password" : "Show current password"}
              className="text-white/40 transition-colors hover:text-white"
            >
              {showCurrent ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          </div>
        </label>

        <label>
          <span className="text-[9px] uppercase tracking-[0.18em] text-white/40">New email</span>
          <div className="mt-1 flex items-center gap-2 rounded-xl border border-white/12 bg-black/40 px-3 focus-within:border-sky-300/50">
            <Mail className="h-3.5 w-3.5 text-white/35" />
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              className="h-10 w-full bg-transparent text-[12px] text-white outline-none placeholder:text-white/25"
              placeholder="you@example.com"
            />
          </div>
        </label>

        <label>
          <span className="text-[9px] uppercase tracking-[0.18em] text-white/40">Confirm new email</span>
          <div className="mt-1 flex items-center gap-2 rounded-xl border border-white/12 bg-black/40 px-3 focus-within:border-sky-300/50">
            <Mail className="h-3.5 w-3.5 text-white/35" />
            <input
              type="email"
              value={confirmEmail}
              onChange={(event) => setConfirmEmail(event.target.value)}
              autoComplete="email"
              className="h-10 w-full bg-transparent text-[12px] text-white outline-none placeholder:text-white/25"
              placeholder="Repeat the email"
            />
          </div>
        </label>

        <label>
          <span className="text-[9px] uppercase tracking-[0.18em] text-white/40">New password</span>
          <div className="mt-1 flex items-center gap-2 rounded-xl border border-white/12 bg-black/40 px-3 focus-within:border-sky-300/50">
            <KeyRound className="h-3.5 w-3.5 text-white/35" />
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              minLength={minLength}
              className="h-10 w-full bg-transparent text-[12px] text-white outline-none placeholder:text-white/25"
              placeholder={`Leave blank to keep it · min ${minLength} characters`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? "Hide new password" : "Show new password"}
              className="text-white/40 transition-colors hover:text-white"
            >
              {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          </div>
        </label>

        <label>
          <span className="text-[9px] uppercase tracking-[0.18em] text-white/40">Confirm new password</span>
          <div className="mt-1 flex items-center gap-2 rounded-xl border border-white/12 bg-black/40 px-3 focus-within:border-sky-300/50">
            <KeyRound className="h-3.5 w-3.5 text-white/35" />
            <input
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              className="h-10 w-full bg-transparent text-[12px] text-white outline-none placeholder:text-white/25"
              placeholder="Repeat the new password"
            />
          </div>
        </label>

        <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[9px] leading-relaxed text-white/30">
            Passwords are hashed with PBKDF2-SHA256 (100,000 iterations); the hash is never returned to the browser.
          </p>
          <button
            type="submit"
            disabled={busy}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/[0.08] px-4 py-2 text-[10px] uppercase tracking-[0.16em] text-white transition-all hover:border-white/40 hover:bg-white/[0.14]",
              busy && "cursor-not-allowed opacity-50"
            )}
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {busy ? "Saving" : "Save changes"}
          </button>
        </div>
      </form>

      {error && (
        <p className="relative mt-3 flex items-start gap-2 rounded-lg border border-red-400/25 bg-red-500/10 px-3 py-2 text-[10px] text-red-200">
          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" /> {error}
        </p>
      )}
      {success && (
        <p className="relative mt-3 flex items-start gap-2 rounded-lg border border-emerald-400/25 bg-emerald-500/10 px-3 py-2 text-[10px] text-emerald-200">
          <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0" /> {success}
        </p>
      )}
    </section>
  );
}
