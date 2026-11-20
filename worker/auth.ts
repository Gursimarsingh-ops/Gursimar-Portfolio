export interface AuthEnv {
  /** Absent when the Pages project has no D1 binding yet. */
  DB?: D1Database;
  ADMIN_EMAIL?: string;
  ADMIN_PASSWORD_HASH?: string;
}

export const SESSION_COOKIE = "portfolio_admin";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
const encoder = new TextEncoder();

export function parseCookies(header: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index === -1) continue;
    const name = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (name) out[name] = decodeURIComponent(value);
  }
  return out;
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function sha256Hex(input: string | ArrayBuffer): Promise<string> {
  const data = typeof input === "string" ? encoder.encode(input) : input;
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
}

/**
 * Verifies a password against the `pbkdf2:iterations:salt:hash` value produced
 * by scripts/hash-admin-password.mjs. The plaintext password never leaves env.
 *
 * `$` is also accepted as a separator for hashes created before the format
 * changed: dotenv-style .dev.vars files expand `$` sequences, which silently
 * corrupted those hashes during local development, so `:` is now preferred.
 */
export async function verifyPassword(password: string, storedRaw: string | undefined): Promise<boolean> {
  // Env files edited on Windows arrive with a trailing CR; left in place it makes
  // every correct password fail (the base64 hash no longer decodes). Trim first.
  const stored = storedRaw?.trim();
  if (!stored) return false;
  const separator = stored.includes(":") ? ":" : "$";
  const [scheme, iterationsRaw, saltRaw, hashRaw] = stored.split(separator).map((part) => part.trim());
  if (scheme !== "pbkdf2" || !iterationsRaw || !saltRaw || !hashRaw) return false;

  const iterations = Number(iterationsRaw);
  if (!Number.isFinite(iterations) || iterations < 10000) return false;
  if (iterations > 100000) {
    // Workers WebCrypto rejects PBKDF2 above 100,000 iterations, which would fail
    // every sign-in. Regenerate the hash with scripts/hash-admin-password.mjs.
    console.error("ADMIN_PASSWORD_HASH exceeds the 100000-iteration Workers limit; regenerate it");
    return false;
  }

  try {
    const salt = base64ToBytes(saltRaw);
    const expected = base64ToBytes(hashRaw);
    const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits(
      { name: "PBKDF2", hash: "SHA-256", salt, iterations },
      key,
      expected.length * 8
    );
    return timingSafeEqual(new Uint8Array(bits), expected);
  } catch (error) {
    // Never log the password or the hash — only the reason verification could not run.
    console.error("Password verification failed", error instanceof Error ? error.message : String(error));
    return false;
  }
}

export function isConfigured(env: AuthEnv): boolean {
  const stored = env.ADMIN_PASSWORD_HASH?.trim() ?? "";
  return Boolean(env.ADMIN_EMAIL?.trim() && stored && stored.split(stored.includes(":") ? ":" : "$").length === 4);
}

/* ------------------------- administrator account -------------------------- */

/** D1 settings keys that override the ADMIN_EMAIL / ADMIN_PASSWORD_HASH secrets. */
export const SETTING_ADMIN_EMAIL = "admin_email";
export const SETTING_ADMIN_PASSWORD_HASH = "admin_password_hash";

export interface AdminCredentials {
  email: string;
  passwordHash: string;
  /** dashboard = changed in the Security Dashboard; environment = Worker secret. */
  source: "dashboard" | "environment" | "none";
}

async function readSetting(db: D1Database, key: string): Promise<string> {
  try {
    const row = await db.prepare("SELECT value FROM settings WHERE key = ?").bind(key).first<{ value: string }>();
    return (row?.value ?? "").trim();
  } catch {
    return "";
  }
}

/**
 * Resolves the active administrator credentials. A value saved from the
 * dashboard wins; the Worker secrets remain the fallback, so an existing
 * deployment keeps working and a lost database still allows sign-in.
 */
export async function readAdminCredentials(env: AuthEnv): Promise<AdminCredentials> {
  let email = "";
  let passwordHash = "";
  if (env.DB) {
    email = await readSetting(env.DB, SETTING_ADMIN_EMAIL);
    passwordHash = await readSetting(env.DB, SETTING_ADMIN_PASSWORD_HASH);
  }
  if (email && passwordHash) return { email: email.toLowerCase(), passwordHash, source: "dashboard" };

  const envEmail = (env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  const envHash = (env.ADMIN_PASSWORD_HASH ?? "").trim();
  if (envEmail && envHash) return { email: envEmail, passwordHash: envHash, source: "environment" };
  return { email: email || envEmail, passwordHash: passwordHash || envHash, source: "none" };
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

/**
 * Produces the `pbkdf2:iterations:salt:hash` value accepted by verifyPassword.
 * 100,000 PBKDF2-SHA256 iterations is the Workers WebCrypto ceiling and matches
 * the format produced by scripts/hash-admin-password.mjs.
 */
export async function hashPassword(password: string): Promise<string> {
  const iterations = 100_000;
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    key,
    256
  );
  return `pbkdf2:${iterations}:${bytesToBase64(salt)}:${bytesToBase64(new Uint8Array(bits))}`;
}

const SIGNED_PREFIX = "v1";

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Stateless fallback token: `v1.<expiry>.<hmac>` signed with the admin
 * password hash (which never leaves the Worker). Used only when the session
 * table cannot be written, so a verified administrator still gets in on a
 * deployment whose D1 binding is missing or unhealthy.
 */
async function signedToken(env: AuthEnv, expiresAt: number): Promise<string | null> {
  const secret = env.ADMIN_PASSWORD_HASH?.trim();
  if (!secret) return null;
  const payload = `${SIGNED_PREFIX}.${expiresAt}`;
  return `${payload}.${await hmacHex(secret, payload)}`;
}

async function verifySignedToken(env: AuthEnv, token: string): Promise<boolean> {
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== SIGNED_PREFIX) return false;
  const expiresAt = Number(parts[1]);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return false;
  const secret = env.ADMIN_PASSWORD_HASH?.trim();
  if (!secret) return false;
  const expected = await hmacHex(secret, `${SIGNED_PREFIX}.${parts[1]}`);
  return timingSafeEqual(encoder.encode(expected), encoder.encode(parts[2]));
}

export async function createSession(env: AuthEnv, request: Request): Promise<string> {
  const now = Date.now();
  const expiresAt = now + SESSION_TTL_SECONDS * 1000;
  let token: string | null = null;

  // Preferred: an opaque session row that the dashboard can revoke.
  try {
    const tokenBytes = new Uint8Array(32);
    crypto.getRandomValues(tokenBytes);
    const random = bytesToBase64Url(tokenBytes);
    const tokenHash = await sha256Hex(random);

    await env.DB!.prepare(
      "INSERT INTO sessions (token_hash, created_at, expires_at) VALUES (?, ?, ?)"
    )
      .bind(tokenHash, new Date(now).toISOString(), new Date(expiresAt).toISOString())
      .run();

    // Opportunistic cleanup so expired rows do not accumulate.
    await env.DB!.prepare("DELETE FROM sessions WHERE expires_at < ?").bind(new Date(now).toISOString()).run();
    token = random;
  } catch (error) {
    // Never turn this into an HTTP 500 after the password was already accepted.
    console.error(
      "Session store unavailable; issuing a signed session cookie:",
      error instanceof Error ? error.message : String(error)
    );
    token = await signedToken(env, expiresAt);
  }

  if (!token) throw new Error("No session secret available");

  const secure = new URL(request.url).protocol === "https:";
  return [
    `${SESSION_COOKIE}=${token}`,
    "HttpOnly",
    "Path=/",
    "SameSite=Strict",
    `Max-Age=${SESSION_TTL_SECONDS}`,
    secure ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; HttpOnly; Path=/; SameSite=Strict; Max-Age=0`;
}

export async function getSession(env: AuthEnv, request: Request): Promise<boolean> {
  const token = parseCookies(request.headers.get("Cookie"))[SESSION_COOKIE];
  if (!token) return false;

  // Signed fallback cookies are verified without touching the database.
  if (token.startsWith(`${SIGNED_PREFIX}.`)) return verifySignedToken(env, token);

  try {
    const tokenHash = await sha256Hex(token);
    const row = await env.DB!.prepare(
      "SELECT token_hash FROM sessions WHERE token_hash = ? AND expires_at > ?"
    )
      .bind(tokenHash, new Date().toISOString())
      .first<{ token_hash: string }>();

    return Boolean(row);
  } catch (error) {
    console.error(
      "Session lookup failed:",
      error instanceof Error ? error.message : String(error)
    );
    return false;
  }
}

export async function destroySession(env: AuthEnv, request: Request): Promise<void> {
  const token = parseCookies(request.headers.get("Cookie"))[SESSION_COOKIE];
  if (!token || token.startsWith(`${SIGNED_PREFIX}.`)) return;
  try {
    const tokenHash = await sha256Hex(token);
    await env.DB!.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(tokenHash).run();
  } catch (error) {
    console.error(
      "Session revoke failed:",
      error instanceof Error ? error.message : String(error)
    );
  }
}

/* --------------------------- login rate limiting --------------------------- */

const MAX_ATTEMPTS = 8;
const WINDOW_MS = 15 * 60 * 1000;
const attempts = new Map<string, { count: number; resetAt: number }>();

export function isRateLimited(key: string): boolean {
  const entry = attempts.get(key);
  if (!entry) return false;
  if (Date.now() > entry.resetAt) {
    attempts.delete(key);
    return false;
  }
  return entry.count >= MAX_ATTEMPTS;
}

export function recordFailure(key: string): void {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || now > entry.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }
  entry.count += 1;
}

export function clearFailures(key: string): void {
  attempts.delete(key);
}

export function clientKey(request: Request): string {
  return request.headers.get("CF-Connecting-IP") ?? request.headers.get("X-Forwarded-For") ?? "local";
}
