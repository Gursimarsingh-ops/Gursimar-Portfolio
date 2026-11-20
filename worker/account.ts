import {
  createSession,
  hashPassword,
  readAdminCredentials,
  SETTING_ADMIN_EMAIL,
  SETTING_ADMIN_PASSWORD_HASH,
  verifyPassword,
} from "./auth";

/**
 * Administrator account management (Security Dashboard → Admin account).
 *
 * The active email and password hash live in the D1 `settings` table, with the
 * Worker secrets as the fallback. Every change requires a live admin session,
 * a same-origin request and the current password. Password changes revoke all
 * existing sessions and issue a fresh cookie to the browser making the change.
 */

export interface AccountEnv {
  DB: D1Database;
  ADMIN_EMAIL?: string;
  ADMIN_PASSWORD_HASH?: string;
  DEV_ORIGIN?: string;
}

const MIN_PASSWORD_LENGTH = 12;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function json(data: unknown, status = 200, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...headers,
    },
  });
}

function fail(message: string, status = 400): Response {
  return json({ error: message }, status);
}

function isLoopback(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

/** Same-origin (or explicit dev origin) check for state changes. */
function originAllowed(request: Request, env: AccountEnv): boolean {
  const origin = request.headers.get("Origin");
  if (!origin) return true;
  const requestOrigin = new URL(request.url).origin;
  try {
    const from = new URL(origin);
    const to = new URL(requestOrigin);
    if (from.host === to.host) return true;
    if (isLoopback(from.hostname) && isLoopback(to.hostname)) return true;
    const configured = (env.DEV_ORIGIN ?? "").trim().replace(/\/$/, "");
    return Boolean(configured) && origin.replace(/\/$/, "") === configured;
  } catch {
    return false;
  }
}

async function readJson<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}

async function writeSetting(env: AccountEnv, key: string, value: string): Promise<void> {
  await env.DB.prepare(
    "INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?) " +
      "ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at"
  )
    .bind(key, value, new Date().toISOString())
    .run();
}

async function activeSessionCount(env: AccountEnv): Promise<number> {
  try {
    const row = await env.DB.prepare("SELECT COUNT(*) AS total FROM sessions WHERE expires_at > ?")
      .bind(new Date().toISOString())
      .first<{ total: number }>();
    return row?.total ?? 0;
  } catch {
    return 0;
  }
}

export async function adminAccountStatus(env: AccountEnv): Promise<Response> {
  const credentials = await readAdminCredentials(env);
  return json({
    email: credentials.email || null,
    source: credentials.source,
    activeSessions: await activeSessionCount(env),
    minPasswordLength: MIN_PASSWORD_LENGTH,
  });
}

export async function changeAdminAccount(request: Request, env: AccountEnv): Promise<Response> {
  if (!originAllowed(request, env)) return fail("Invalid origin", 403);
  if (!env.DB) return fail("The database is not available on this deployment.", 503);

  const body = await readJson<{
    currentPassword?: unknown;
    email?: unknown;
    confirmEmail?: unknown;
    password?: unknown;
    confirmPassword?: unknown;
  }>(request);
  if (!body) return fail("Invalid JSON body.");

  const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
  if (!currentPassword) return fail("Enter your current password to authorise this change.", 400);

  const credentials = await readAdminCredentials(env);
  if (!credentials.passwordHash) return fail("Administrator credentials are not configured.", 503);
  if (!(await verifyPassword(currentPassword, credentials.passwordHash))) {
    // Deliberately vague for the browser; the reason is not a credential detail.
    return fail("The current password is not correct.", 401);
  }

  const emailInput = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const confirmEmail = typeof body.confirmEmail === "string" ? body.confirmEmail.trim().toLowerCase() : "";
  const passwordInput = typeof body.password === "string" ? body.password : "";
  const confirmPassword = typeof body.confirmPassword === "string" ? body.confirmPassword : "";

  if (!emailInput && !passwordInput) {
    return fail("Enter a new email, a new password, or both.");
  }

  if (emailInput) {
    if (!EMAIL_RE.test(emailInput) || emailInput.length > 200) return fail("Enter a valid email address.");
    if (emailInput !== confirmEmail) return fail("The email addresses do not match.");
  }

  if (passwordInput) {
    if (passwordInput.length < MIN_PASSWORD_LENGTH) {
      return fail(`The new password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
    }
    if (passwordInput.length > 200) return fail("The new password is too long.");
    if (passwordInput !== confirmPassword) return fail("The new passwords do not match.");
    if (passwordInput === currentPassword) return fail("Choose a password that differs from the current one.");
  }

  try {
    if (emailInput) await writeSetting(env, SETTING_ADMIN_EMAIL, emailInput);
    if (passwordInput) await writeSetting(env, SETTING_ADMIN_PASSWORD_HASH, await hashPassword(passwordInput));
  } catch (error) {
    console.error("Admin credential write failed", error instanceof Error ? error.name : "error");
    return fail("The new credentials could not be saved. The database rejected the write.", 503);
  }

  const headers: Record<string, string> = {};
  let sessionsRevoked = 0;
  if (passwordInput) {
    // A password change invalidates every existing session, then re-issues one
    // for the administrator who made the change.
    try {
      const revoked = await env.DB.prepare("DELETE FROM sessions").run();
      sessionsRevoked = revoked.meta?.changes ?? 0;
      headers["Set-Cookie"] = await createSession(env, request);
    } catch (error) {
      console.error("Session rotation failed after password change", error instanceof Error ? error.name : "error");
    }
  }

  console.log(
    `Administrator credentials updated (email ${emailInput ? "changed" : "unchanged"}, password ${
      passwordInput ? "changed" : "unchanged"
    })`
  );

  return json(
    {
      email: emailInput || credentials.email,
      source: "dashboard",
      passwordChanged: Boolean(passwordInput),
      emailChanged: Boolean(emailInput),
      sessionsRevoked,
      activeSessions: await activeSessionCount(env),
    },
    200,
    headers
  );
}
