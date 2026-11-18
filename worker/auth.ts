export interface AuthEnv {
  DB: D1Database;
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

export async function createSession(env: AuthEnv, request: Request): Promise<string> {
  const tokenBytes = new Uint8Array(32);
  crypto.getRandomValues(tokenBytes);
  const token = bytesToBase64Url(tokenBytes);
  const tokenHash = await sha256Hex(token);
  const now = Date.now();

  await env.DB.prepare(
    "INSERT INTO sessions (token_hash, created_at, expires_at) VALUES (?, ?, ?)"
  )
    .bind(tokenHash, new Date(now).toISOString(), new Date(now + SESSION_TTL_SECONDS * 1000).toISOString())
    .run();

  // Opportunistic cleanup so expired rows do not accumulate.
  await env.DB.prepare("DELETE FROM sessions WHERE expires_at < ?").bind(new Date(now).toISOString()).run();

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

  const tokenHash = await sha256Hex(token);
  const row = await env.DB.prepare(
    "SELECT token_hash FROM sessions WHERE token_hash = ? AND expires_at > ?"
  )
    .bind(tokenHash, new Date().toISOString())
    .first<{ token_hash: string }>();

  return Boolean(row);
}

export async function destroySession(env: AuthEnv, request: Request): Promise<void> {
  const token = parseCookies(request.headers.get("Cookie"))[SESSION_COOKIE];
  if (!token) return;
  const tokenHash = await sha256Hex(token);
  await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(tokenHash).run();
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
