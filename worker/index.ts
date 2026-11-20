import {
  clearFailures,
  clearSessionCookie,
  clientKey,
  createSession,
  destroySession,
  getSession,
  isRateLimited,
  readAdminCredentials,
  recordFailure,
  sha256Hex,
  verifyPassword,
} from "./auth";
import { aiRuntime, handlePortalApi } from "./portal";
import { adminAccountStatus, changeAdminAccount } from "./account";
import { runStorageDiagnostic } from "./storage-diagnostic";
import { ensureSchema } from "./schema";
import {
  abortMultipartUpload,
  b2Config,
  cleanupMultipartUploads,
  completeMultipartUpload,
  createMultipartUpload,
  deleteObject,
  headObject,
  listMultipartUploads,
  listObjects,
  MAX_PARTS,
  PART_SIZE,
  putObject,
  readObject,
  StorageError,
  storageConfigured,
  storageProvider,
  uploadPart,
  type StoredObject,
} from "./storage";
import { parseVideoSourceUrl } from "./video";

export interface Env {
  DB: D1Database;
  /** Only present on the standalone Worker deploy; Pages serves the SPA itself. */
  ASSETS?: Fetcher;
  ADMIN_EMAIL?: string;
  ADMIN_PASSWORD_HASH?: string;
  APP_NAME?: string;
  AI_API_URL?: string;
  AI_API_KEY?: string;
  AI_MODEL?: string;
  AI_PROVIDER?: string;
  /** Optional origin allowed to call this Worker while developing against production. */
  DEV_ORIGIN?: string;
  /* Private Backblaze B2 bucket (S3-compatible API). Server-side only. */
  B2_APPLICATION_KEY_ID?: string;
  B2_APPLICATION_KEY?: string;
  B2_BUCKET_NAME?: string;
  B2_REGION?: string;
  B2_ENDPOINT?: string;
}

const ADMIN = "/api/admin";

const GRAPHIC_CATEGORIES = new Set(["irl", "gaming", "doc", "other"]);
const VIDEO_CATEGORIES = new Set(["gaming", "doc", "corp", "motion", "estate", "saas"]);

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);

const LIMITS = {
  image: 8 * 1024 * 1024,
  /** Single-request video ceiling (Cloudflare request body limit). */
  video: 90 * 1024 * 1024,
  thumbnail: 5 * 1024 * 1024,
  /** Multipart ceiling: parts are uploaded separately, so this is far above the
   * 100 MB Cloudflare request limit while staying well inside B2's limits. */
  videoMultipart: 5 * 1024 * 1024 * 1024,
};

function ascii(bytes: Uint8Array, offset: number, length: number): string {
  let out = "";
  for (let i = offset; i < offset + length && i < bytes.length; i += 1) out += String.fromCharCode(bytes[i]);
  return out;
}

/** Rejects files whose bytes do not match the declared MIME type. */
function signatureMatches(type: string, bytes: Uint8Array): boolean {
  switch (type) {
    case "image/jpeg":
      return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    case "image/png":
      return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
    case "image/gif":
      return ascii(bytes, 0, 3) === "GIF";
    case "image/webp":
      return ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP";
    case "video/mp4":
    case "video/quicktime":
      return ascii(bytes, 4, 4) === "ftyp";
    case "video/webm":
      return bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3;
    default:
      return false;
  }
}

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

type ProjectRow = {
  id: string;
  kind: "graphic" | "video";
  title: string;
  description: string;
  category: string;
  status: "published" | "draft";
  asset_key: string;
  asset_type: string;
  asset_size: number;
  asset_hash: string | null;
  thumb_key: string | null;
  thumb_type: string | null;
  created_at: string;
  updated_at: string;
  sort_order?: number;
  display_ratio?: string | null;
  asset_width?: number | null;
  asset_height?: number | null;
  duration_seconds?: number | null;
  /** Externally hosted video (YouTube/Vimeo/direct file); null for uploaded media. */
  source_url?: string | null;
  /** JSON crop/filter presentation for the thumbnail. */
  thumb_style?: string | null;
  /** Comma-separated tags, max 10. */
  tags?: string | null;
  /** JSON fit/crop/filter presentation for the video itself. */
  video_style?: string | null;
  /** Declared display preset (auto, 480p … 2160p). Metadata only. */
  resolution?: string | null;
};

/** Screen layouts that can be pinned from the dashboard ("auto" follows the file). */
const DISPLAY_RATIOS = new Set([
  "auto",
  "1/1",
  "4/5",
  "5/4",
  "3/2",
  "2/3",
  "4/3",
  "3/4",
  "16/9",
  "9/16",
  "16/10",
  "21/9",
]);

/**
 * Columns added after the first release. Existing local and deployed databases
 * get them on first use instead of failing every project query.
 */
let projectColumnsReady: Promise<void> | null = null;
function ensureSortOrder(env: Env): Promise<void> {
  if (!projectColumnsReady) {
    projectColumnsReady = (async () => {
      const info = await env.DB.prepare("PRAGMA table_info(projects)").all<{ name: string }>();
      const has = new Set((info.results ?? []).map((column) => column.name));
      const columns: [string, string][] = [
        ["sort_order", "ALTER TABLE projects ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0"],
        ["display_ratio", "ALTER TABLE projects ADD COLUMN display_ratio TEXT"],
        ["asset_width", "ALTER TABLE projects ADD COLUMN asset_width INTEGER"],
        ["asset_height", "ALTER TABLE projects ADD COLUMN asset_height INTEGER"],
        ["duration_seconds", "ALTER TABLE projects ADD COLUMN duration_seconds REAL"],
        ["source_url", "ALTER TABLE projects ADD COLUMN source_url TEXT"],
        ["thumb_style", "ALTER TABLE projects ADD COLUMN thumb_style TEXT"],
        ["tags", "ALTER TABLE projects ADD COLUMN tags TEXT"],
        ["video_style", "ALTER TABLE projects ADD COLUMN video_style TEXT"],
        ["resolution", "ALTER TABLE projects ADD COLUMN resolution TEXT"],
      ];
      for (const [name, sql] of columns) {
        if (!has.has(name)) await env.DB.prepare(sql).run();
      }
    })().catch((error) => {
      projectColumnsReady = null;
      console.error("Could not prepare project columns", error instanceof Error ? error.message : error);
    });
  }
  return projectColumnsReady;
}

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

function fail(message: string, status = 400, extra: Record<string, unknown> = {}): Response {
  return json({ error: message, ...extra }, status);
}

function categoriesFor(kind: string): Set<string> {
  return kind === "graphic" ? GRAPHIC_CATEGORIES : VIDEO_CATEGORIES;
}

function nowIso(): string {
  return new Date().toISOString();
}

function publicOrigin(request: Request): string {
  return new URL(request.url).origin;
}

/** Blocks cross-site state changes (defence in depth alongside SameSite=Strict). */
function isLoopbackHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || hostname === "[::1]";
}

function originAllowed(request: Request, env?: Env): boolean {
  const origin = request.headers.get("Origin");
  if (!origin) return true;
  const requestOrigin = publicOrigin(request);
  if (origin === requestOrigin) return true;

  // Page and API hosts always match on Cloudflare; accept that even if a
  // proxy reports a different scheme, so a valid same-site POST is not a 403.
  try {
    if (new URL(origin).host === new URL(requestOrigin).host) return true;
  } catch {
    return false;
  }

  // Explicit opt-in for a separate dev origin (e.g. Vite proxying to the deployed
  // Worker). Only an exact match on the configured origin is accepted.
  const configured = (env?.DEV_ORIGIN ?? "").trim().replace(/\/$/, "");
  if (configured && origin.replace(/\/$/, "") === configured) return true;

  // Local development only: Vite proxies /api to the Worker, so the browser
  // origin is the dev server while the Worker sees its own loopback origin.
  // Both sides must be loopback — deployed HTTPS hosts never qualify.
  try {
    const from = new URL(origin);
    const to = new URL(requestOrigin);
    return isLoopbackHost(from.hostname) && isLoopbackHost(to.hostname);
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

function parseStoredStyle(raw: string | null | undefined): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function toPublicProject(row: ProjectRow) {
  const link = Boolean(row.source_url);
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    description: row.description,
    category: row.category,
    mediaUrl: link ? row.source_url : `/media/${row.asset_key}`,
    thumbUrl: row.thumb_key ? `/media/${row.thumb_key}` : null,
    sourceUrl: row.source_url ?? null,
    thumbStyle: parseStoredStyle(row.thumb_style),
    videoStyle: parseStoredStyle(row.video_style),
    tags: readStoredTags(row.tags),
    resolution: row.resolution ?? null,
    ratio: row.display_ratio ?? null,
    width: row.asset_width ?? null,
    height: row.asset_height ?? null,
    duration: row.duration_seconds ?? null,
    createdAt: row.created_at,
  };
}

function toAdminProject(row: ProjectRow) {
  const link = Boolean(row.source_url);
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    description: row.description,
    category: row.category,
    status: row.status,
    assetUrl: link ? row.source_url : `${ADMIN}/media/${row.asset_key}`,
    thumbUrl: row.thumb_key ? `${ADMIN}/media/${row.thumb_key}` : null,
    assetType: row.asset_type,
    assetSize: row.asset_size,
    sourceUrl: row.source_url ?? null,
    thumbStyle: parseStoredStyle(row.thumb_style),
    videoStyle: parseStoredStyle(row.video_style),
    tags: readStoredTags(row.tags),
    resolution: row.resolution ?? "auto",
    sortOrder: row.sort_order ?? 0,
    displayRatio: row.display_ratio ?? "auto",
    assetWidth: row.asset_width ?? null,
    assetHeight: row.asset_height ?? null,
    durationSeconds: row.duration_seconds ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function readRatio(value: unknown, fallback: string | null): string | null {
  if (value === undefined) return fallback;
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (DISPLAY_RATIOS.has(trimmed)) return trimmed;
  // Custom dimensions arrive as "w/h" and must produce a sane screen shape.
  const match = trimmed.match(/^([1-9]\d{0,4})\/([1-9]\d{0,4})$/);
  if (match) {
    const ratio = Number(match[1]) / Number(match[2]);
    if (ratio >= 0.2 && ratio <= 5) return `${match[1]}/${match[2]}`;
  }
  return fallback;
}

function readThumbStyle(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
  const number = (key: string, min: number, max: number, fallback: number): number => {
    const raw = input[key];
    if (typeof raw !== "number" || !Number.isFinite(raw)) return fallback;
    return Math.min(Math.max(raw, min), max);
  };
  const presets = ["original", "cinematic", "vivid", "mono", "warm", "cool"];
  const preset = typeof input.preset === "string" && presets.includes(input.preset) ? input.preset : "original";
  return JSON.stringify({
    zoom: Number(number("zoom", 1, 3, 1).toFixed(2)),
    x: Math.round(number("x", 0, 100, 50)),
    y: Math.round(number("y", 0, 100, 50)),
    brightness: Math.round(number("brightness", 40, 180, 100)),
    contrast: Math.round(number("contrast", 40, 200, 100)),
    saturation: Math.round(number("saturation", 0, 200, 100)),
    grayscale: Math.round(number("grayscale", 0, 100, 0)),
    blur: Math.round(number("blur", 0, 8, 0)),
    preset,
  });
}

/** Comma-separated tags, trimmed and de-duplicated, at most 10. */
function readTags(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const list = Array.isArray(value)
    ? value.filter((tag): tag is string => typeof tag === "string")
    : typeof value === "string"
      ? value.split(",")
      : [];
  const clean: string[] = [];
  for (const tag of list) {
    const normalized = tag.trim().replace(/\s+/g, " ").slice(0, 24);
    if (!normalized) continue;
    if (clean.some((existing) => existing.toLowerCase() === normalized.toLowerCase())) continue;
    clean.push(normalized);
    if (clean.length >= 10) break;
  }
  return clean.length ? clean.join(",") : null;
}

function readStoredTags(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 10);
}

/**
 * Presentation of the video itself (fit, crop, filters). Only values the public
 * player can actually apply are accepted, so a crafted request cannot store an
 * arbitrary CSS string.
 */
function readVideoStyle(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
  const number = (key: string, min: number, max: number, fallback: number): number => {
    const raw = input[key];
    if (typeof raw !== "number" || !Number.isFinite(raw)) return fallback;
    return Math.min(Math.max(raw, min), max);
  };
  const presets = ["original", "cinematic", "vivid", "mono", "warm", "cool"];
  const preset = typeof input.preset === "string" && presets.includes(input.preset) ? input.preset : "original";
  return JSON.stringify({
    fit: input.fit === "cover" ? "cover" : "contain",
    zoom: Number(number("zoom", 1, 3, 1).toFixed(2)),
    x: Math.round(number("x", 0, 100, 50)),
    y: Math.round(number("y", 0, 100, 50)),
    brightness: Math.round(number("brightness", 40, 180, 100)),
    contrast: Math.round(number("contrast", 40, 200, 100)),
    saturation: Math.round(number("saturation", 0, 200, 100)),
    grayscale: Math.round(number("grayscale", 0, 100, 0)),
    blur: Math.round(number("blur", 0, 8, 0)),
    preset,
  });
}

/** Display presets are labels; nothing is transcoded, so they are honest metadata. */
const VIDEO_RESOLUTIONS = new Set(["auto", "480p", "720p", "1080p", "1440p", "2160p"]);

function readResolution(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return VIDEO_RESOLUTIONS.has(trimmed) ? trimmed : fallback;
}

function readSortOrder(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.round(Math.min(Math.max(value, 0), 100000));
}

function readNumber(value: unknown, max: number): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return null;
  return Math.round(Math.min(value, max));
}

/* ------------------------------- public API ------------------------------- */

async function publicProjects(env: Env): Promise<Response> {
  // While the site is closed for maintenance, published work is not served either.
  const maintenance = await readSetting(env, SETTINGS_MAINTENANCE);
  if (maintenance?.value === "on") {
    return json({ projects: [] }, 200, { "Cache-Control": "no-store" });
  }

  await ensureSortOrder(env);

  const { results } = await env.DB.prepare(
    `SELECT * FROM projects WHERE status = 'published'
      ORDER BY sort_order ASC, created_at DESC`
  ).all<ProjectRow>();

  return json(
    { projects: (results ?? []).map(toPublicProject) },
    200,
    { "Cache-Control": "public, max-age=30, stale-while-revalidate=300" }
  );
}

async function publicMedia(env: Env, key: string, range: string | null): Promise<Response> {
  // Only assets that belong to a *published* project can be read publicly.
  const row = await env.DB.prepare(
    `SELECT id FROM projects WHERE status = 'published' AND (asset_key = ? OR thumb_key = ?) LIMIT 1`
  )
    .bind(key, key)
    .first<{ id: string }>();

  if (!row) return new Response("Not found", { status: 404 });
  return serveObject(env, key, false, range);
}

/**
 * Streams one stored object from the private Backblaze B2 bucket through the
 * Worker, so the bucket never needs to be public. Range requests are forwarded,
 * which is what lets large videos seek.
 */
async function serveObject(
  env: Env,
  key: string,
  isPrivate: boolean,
  range: string | null = null
): Promise<Response> {
  if (!storageConfigured(env)) return new Response("File storage is not configured", { status: 503 });

  let object;
  try {
    object = await readObject(env, key, range);
  } catch (error) {
    console.error("Media read failed", error instanceof Error ? error.message : error);
    return new Response("Storage unavailable", { status: 502 });
  }
  if (!object) return new Response("Not found", { status: 404 });

  const headers = new Headers();
  headers.set("Content-Type", object.contentType ?? "application/octet-stream");
  if (object.contentLength) headers.set("Content-Length", object.contentLength);
  if (object.contentRange) headers.set("Content-Range", object.contentRange);
  if (object.etag) headers.set("etag", object.etag);
  headers.set("Accept-Ranges", "bytes");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set(
    "Cache-Control",
    isPrivate ? "private, no-store" : "public, max-age=31536000, immutable"
  );

  return new Response(object.body, { status: object.status, headers });
}

/* --------------------------------- auth ---------------------------------- */

async function login(request: Request, env: Env): Promise<Response> {
  if (!originAllowed(request, env)) {
    console.warn("Login rejected: origin not allowed");
    return fail("Invalid origin", 403);
  }
  const credentials = await readAdminCredentials(env);
  if (!credentials.email || !credentials.passwordHash) {
    console.error("Login rejected: no administrator credentials (dashboard or Worker secrets)");
    return fail(
      "Admin credentials are not configured. Set ADMIN_EMAIL and ADMIN_PASSWORD_HASH as Worker secrets.",
      503
    );
  }

  const key = clientKey(request);
  if (isRateLimited(key)) return fail("Too many attempts. Try again later.", 429);

  try {
    const body = await readJson<{ email?: unknown; password?: unknown }>(request);
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!email || !password) {
      recordFailure(key);
      return fail("Email and password are required.", 400);
    }

    const expectedEmail = credentials.email;
    const passwordOk = await verifyPassword(password, credentials.passwordHash);
    const emailOk = email === expectedEmail;

    if (!passwordOk || !emailOk) {
      recordFailure(key);
      console.warn(
        `Login rejected: ${passwordOk ? "email mismatch" : "password verification failed"}`
      );
      return fail("Invalid email or password.", 401);
    }

    clearFailures(key);

    let cookie: string;
    try {
      cookie = await createSession(env, request);
    } catch (error) {
      // A failed session write must never surface as an opaque 500 after a
      // password has already been accepted.
      console.error("Session creation failed", error instanceof Error ? error.message : String(error));
      return fail(
        "Signed in, but the session could not be stored. The D1 database is not accepting writes — check the DB binding in Cloudflare Pages → Settings → Functions → Bindings.",
        503
      );
    }
    return json(
      { authenticated: true, email: expectedEmail },
      200,
      { "Set-Cookie": cookie }
    );
  } catch (error) {
    // Log the real exception server-side; the browser only gets a safe message.
    console.error(
      "Login handler failed",
      error instanceof Error ? `${error.name}: ${error.message}\n${error.stack ?? ""}` : String(error)
    );
    return fail("Sign-in could not be completed because of a server error. Please try again.", 500);
  }
}

function methodNotAllowed(allow: string): Response {
  return json({ error: `Method not allowed. Use ${allow}.` }, 405, { Allow: allow });
}

/** Same-origin preflight; harmless for normal form posts and fixes 405s. */
function preflight(request: Request): Response {
  const origin = request.headers.get("Origin");
  return new Response(null, {
    status: 204,
    headers: {
      Allow: "GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Methods": "GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Accept",
      "Access-Control-Max-Age": "86400",
      ...(origin ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" } : {}),
      "Cache-Control": "no-store",
    },
  });
}

async function logout(request: Request, env: Env): Promise<Response> {
  if (!originAllowed(request, env)) return fail("Invalid origin", 403);
  await destroySession(env, request);
  return json({ ok: true }, 200, { "Set-Cookie": clearSessionCookie() });
}

async function requireAdmin(request: Request, env: Env, mutating: boolean): Promise<Response | null> {
  if (mutating && !originAllowed(request, env)) return fail("Invalid origin", 403);
  const ok = await getSession(env, request);
  if (!ok) return fail("Unauthorized", 401);
  return null;
}

/* -------------------------------- projects -------------------------------- */

function validateProjectFields(input: {
  kind?: unknown;
  title?: unknown;
  description?: unknown;
  category?: unknown;
  status?: unknown;
}): { error: string } | null {
  if (input.kind !== "graphic" && input.kind !== "video") return { error: "Invalid project kind." };
  if (typeof input.title !== "string" || !input.title.trim() || input.title.trim().length > 120) {
    return { error: "Title must be between 1 and 120 characters." };
  }
  if (input.description !== undefined) {
    if (typeof input.description !== "string" || input.description.length > 2000) {
      return { error: "Description must be 2000 characters or fewer." };
    }
  }
  if (typeof input.category !== "string" || !categoriesFor(input.kind).has(input.category)) {
    return { error: "Category is not valid for this project type." };
  }
  if (input.status !== undefined && input.status !== "published" && input.status !== "draft") {
    return { error: "Status must be published or draft." };
  }
  return null;
}

async function listAdminProjects(env: Env, url: URL): Promise<Response> {
  await ensureSortOrder(env);
  const kind = url.searchParams.get("kind");
  const query =
    kind === "graphic" || kind === "video"
      ? env.DB.prepare("SELECT * FROM projects WHERE kind = ? ORDER BY sort_order ASC, created_at DESC").bind(kind)
      : env.DB.prepare("SELECT * FROM projects ORDER BY sort_order ASC, created_at DESC");

  const { results } = await query.all<ProjectRow>();
  return json({ projects: (results ?? []).map(toAdminProject) });
}

async function createProject(request: Request, env: Env): Promise<Response> {
  const body = await readJson<Record<string, unknown>>(request);
  if (!body) return fail("Invalid JSON body.");

  const invalid = validateProjectFields(body);
  if (invalid) return fail(invalid.error);

  const title = String(body.title).trim();
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const category = String(body.category);
  const kind = body.kind as "graphic" | "video";
  const status = body.status === "draft" ? "draft" : "published";
  let assetKey = typeof body.assetKey === "string" ? body.assetKey : "";
  const thumbKey = typeof body.thumbKey === "string" && body.thumbKey ? body.thumbKey : null;
  const displayRatio = readRatio(body.displayRatio, "auto") ?? "auto";
  const assetWidth = readNumber(body.assetWidth, 20000);
  const assetHeight = readNumber(body.assetHeight, 20000);
  const thumbStyle = readThumbStyle(body.thumbStyle);
  const videoStyle = readVideoStyle(body.videoStyle);
  const tags = readTags(body.tags);
  const resolution = readResolution(body.resolution, "auto");
  const durationSeconds =
    typeof body.durationSeconds === "number" && Number.isFinite(body.durationSeconds) && body.durationSeconds > 0
      ? Math.min(body.durationSeconds, 86400)
      : null;

  /* A video link replaces the uploaded file: no bytes are stored, only the URL. */
  const sourceRaw = typeof body.sourceUrl === "string" ? body.sourceUrl.trim().slice(0, 600) : "";
  const isLink = sourceRaw.length > 0;
  let sourceUrl: string | null = null;

  if (isLink) {
    if (kind !== "video") return fail("External video links can only be published as video projects.");
    const parsed = parseVideoSourceUrl(sourceRaw);
    if (parsed.provider === "unknown") {
      return fail("Unsupported video URL. Use a YouTube, Vimeo or direct MP4/WebM/MOV link.", 415);
    }
    sourceUrl = parsed.normalized;
    assetKey = `link/${crypto.randomUUID()}`;
  } else if (!assetKey.startsWith(kind === "graphic" ? "graphics/" : "videos/")) {
    return fail("Asset does not match the project kind.");
  }
  if (thumbKey && !thumbKey.startsWith("thumbs/")) return fail("Invalid thumbnail key.");

  let asset: StoredObject | null = null;
  let thumb: StoredObject | null = null;
  try {
    if (!isLink) asset = await headObject(env, assetKey);
    thumb = thumbKey ? await headObject(env, thumbKey) : null;
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Storage is unavailable.", 502);
  }
  if (!isLink && !asset) return fail("Uploaded asset was not found in storage.", 404);
  if (thumbKey && !thumb) return fail("Uploaded thumbnail was not found in storage.", 404);

  const ts = nowIso();
  const id = crypto.randomUUID();
  const hash = asset?.sha256 ?? null;

  await ensureSortOrder(env);
  const last = await env.DB.prepare("SELECT COALESCE(MAX(sort_order), -1) AS max FROM projects").first<{ max: number }>();
  const sortOrder =
    body.sortOrder !== undefined
      ? readSortOrder(body.sortOrder, (last?.max ?? -1) + 1)
      : (last?.max ?? -1) + 1;

  try {
    await env.DB.prepare(
      `INSERT INTO projects
        (id, kind, title, description, category, status, asset_key, asset_type, asset_size, asset_hash, thumb_key, thumb_type, created_at, updated_at, sort_order, display_ratio, asset_width, asset_height, duration_seconds, source_url, thumb_style, tags, video_style, resolution)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        id,
        kind,
        title,
        description,
        category,
        status,
        assetKey,
        asset?.contentType ?? (isLink ? "video/link" : ""),
        asset?.size ?? 0,
        hash,
        thumbKey,
        thumb?.contentType ?? null,
        ts,
        ts,
        sortOrder,
        displayRatio,
        assetWidth,
        assetHeight,
        durationSeconds,
        sourceUrl,
        thumbStyle,
        tags,
        videoStyle,
        resolution
      )
      .run();
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("UNIQUE")) {
      return fail("This file has already been uploaded to the portfolio.", 409);
    }
    throw error;
  }

  const row = await env.DB.prepare("SELECT * FROM projects WHERE id = ?").bind(id).first<ProjectRow>();
  return json({ project: row ? toAdminProject(row) : null }, 201);
}

async function updateProject(request: Request, env: Env, id: string): Promise<Response> {
  const existing = await env.DB.prepare("SELECT * FROM projects WHERE id = ?").bind(id).first<ProjectRow>();
  if (!existing) return fail("Project not found.", 404);

  const body = await readJson<Record<string, unknown>>(request);
  if (!body) return fail("Invalid JSON body.");

  const kind = (body.kind ?? existing.kind) as "graphic" | "video";
  const merged = {
    kind,
    title: body.title ?? existing.title,
    description: body.description ?? existing.description,
    category: body.category ?? existing.category,
    status: body.status ?? existing.status,
  };

  const invalid = validateProjectFields(merged);
  if (invalid) return fail(invalid.error);

  const title = String(merged.title).trim();
  const description = String(merged.description ?? "").trim();
  const category = String(merged.category);
  const status = merged.status === "draft" ? "draft" : "published";

  let thumbKey = existing.thumb_key;
  let thumbType = existing.thumb_type;
  let replacedThumb: string | null = null;
  const displayRatio = readRatio(body.displayRatio, existing.display_ratio ?? null);
  const thumbStyle = body.thumbStyle === undefined ? existing.thumb_style : readThumbStyle(body.thumbStyle);
  const videoStyle =
    body.videoStyle === undefined ? existing.video_style ?? null : readVideoStyle(body.videoStyle);
  const tags =
    body.tags === undefined ? existing.tags ?? null : readTags(body.tags);
  const resolution = readResolution(body.resolution, existing.resolution ?? "auto");
  const sortOrder = readSortOrder(body.sortOrder, existing.sort_order ?? 0);
  const assetWidth = body.assetWidth === undefined ? existing.asset_width ?? null : readNumber(body.assetWidth, 20000);
  const assetHeight = body.assetHeight === undefined ? existing.asset_height ?? null : readNumber(body.assetHeight, 20000);
  const durationSeconds =
    body.durationSeconds === undefined
      ? existing.duration_seconds ?? null
      : typeof body.durationSeconds === "number" && Number.isFinite(body.durationSeconds) && body.durationSeconds > 0
        ? Math.min(body.durationSeconds, 86400)
        : null;

  if (Object.prototype.hasOwnProperty.call(body, "thumbKey")) {
    const next = typeof body.thumbKey === "string" && body.thumbKey ? body.thumbKey : null;
    if (next && !next.startsWith("thumbs/")) return fail("Invalid thumbnail key.");
    if (next) {
      let head: StoredObject | null = null;
      try {
        head = await headObject(env, next);
      } catch (error) {
        return fail(error instanceof Error ? error.message : "Storage is unavailable.", 502);
      }
      if (!head) return fail("Uploaded thumbnail was not found in storage.", 404);
      replacedThumb = existing.thumb_key && existing.thumb_key !== next ? existing.thumb_key : null;
      thumbKey = next;
      thumbType = head.contentType ?? null;
    } else {
      replacedThumb = existing.thumb_key;
      thumbKey = null;
      thumbType = null;
    }
  }

  /* Replace the media file itself (used by "replace" in media management). */
  let assetKey = existing.asset_key;
  let assetType = existing.asset_type;
  let assetSize = existing.asset_size;
  let assetHash = existing.asset_hash;
  let replacedAsset: string | null = null;
  let replacedAssetHash: string | null = null;
  let sourceUrl = existing.source_url ?? null;
  let nextWidth = assetWidth;
  let nextHeight = assetHeight;
  let nextDuration = durationSeconds;

  if (Object.prototype.hasOwnProperty.call(body, "assetKey")) {
    const next = typeof body.assetKey === "string" ? body.assetKey : "";
    const prefix = kind === "graphic" ? "graphics/" : "videos/";
    if (!next || !next.startsWith(prefix)) {
      return fail("Replacement media does not match the project kind.");
    }
    let head: StoredObject | null = null;
    try {
      head = await headObject(env, next);
    } catch (error) {
      return fail(error instanceof Error ? error.message : "Storage is unavailable.", 502);
    }
    if (!head) return fail("Uploaded media was not found in storage.", 404);

    replacedAsset = existing.asset_key !== next ? existing.asset_key : null;
    replacedAssetHash = existing.asset_hash;
    assetKey = next;
    assetType = head.contentType ?? existing.asset_type;
    assetSize = head.size;
    assetHash = head.sha256 ?? null;
    // Dimensions describe the new file; the client sends them with the replacement.
    nextWidth = assetWidth;
    nextHeight = assetHeight;
    nextDuration = durationSeconds;
  }

  /* Replace an uploaded video with an external link (or change the link URL). */
  if (Object.prototype.hasOwnProperty.call(body, "sourceUrl")) {
    const raw = typeof body.sourceUrl === "string" ? body.sourceUrl.trim().slice(0, 600) : "";
    if (!raw) return fail("A video URL is required.");
    if (kind !== "video") return fail("External video links can only be used for video projects.");
    const parsed = parseVideoSourceUrl(raw);
    if (parsed.provider === "unknown") {
      return fail("Unsupported video URL. Use a YouTube, Vimeo or direct MP4/WebM/MOV link.", 415);
    }
    if (existing.asset_key && !existing.asset_key.startsWith("link/")) {
      replacedAsset = existing.asset_key;
      replacedAssetHash = existing.asset_hash;
    }
    sourceUrl = parsed.normalized;
    assetKey = `link/${crypto.randomUUID()}`;
    assetType = "video/link";
    assetSize = 0;
    assetHash = null;
  }

  try {
    await env.DB.prepare(
      `UPDATE projects
          SET title = ?, description = ?, category = ?, status = ?, thumb_key = ?, thumb_type = ?,
              asset_key = ?, asset_type = ?, asset_size = ?, asset_hash = ?, updated_at = ?,
              display_ratio = ?, asset_width = ?, asset_height = ?, duration_seconds = ?,
              source_url = ?, thumb_style = ?, sort_order = ?, tags = ?, video_style = ?, resolution = ?
        WHERE id = ?`
    )
      .bind(
        title,
        description,
        category,
        status,
        thumbKey,
        thumbType,
        assetKey,
        assetType,
        assetSize,
        assetHash,
        nowIso(),
        displayRatio,
        nextWidth,
        nextHeight,
        nextDuration,
        sourceUrl,
        thumbStyle,
        sortOrder,
        tags,
        videoStyle,
        resolution,
        id
      )
      .run();
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("UNIQUE")) return fail("That file is already used by another project.", 409);
    throw error;
  }

  if (replacedThumb) {
    await deleteObject(env, [replacedThumb]).catch(() => undefined);
    await env.DB.prepare("DELETE FROM upload_fingerprints WHERE key = ?").bind(replacedThumb).run();
  }

  if (replacedAsset && !replacedAsset.startsWith("link/")) {
    await deleteObject(env, [replacedAsset]).catch(() => undefined);
    await env.DB.prepare("DELETE FROM upload_fingerprints WHERE key = ?").bind(replacedAsset).run();
    // The old fingerprint row may have used the hash column; free it for a re-upload.
    if (replacedAssetHash) {
      await env.DB.prepare("DELETE FROM upload_fingerprints WHERE hash = ? AND key = ?")
        .bind(replacedAssetHash, replacedAsset)
        .run();
    }
  }

  const row = await env.DB.prepare("SELECT * FROM projects WHERE id = ?").bind(id).first<ProjectRow>();
  return json({ project: row ? toAdminProject(row) : null });
}

/** Persist a manual ordering for the media manager (up/down moves). */
async function reorderProjects(request: Request, env: Env): Promise<Response> {
  const body = await readJson<{ ids?: unknown }>(request);
  const ids = Array.isArray(body?.ids)
    ? body.ids.filter((id): id is string => typeof id === "string" && id.length > 0)
    : [];

  if (ids.length === 0 || ids.length > 500) return fail("Provide an ordered list of project ids.");

  await ensureSortOrder(env);

  const known = await env.DB.prepare("SELECT id FROM projects").all<{ id: string }>();
  const existing = new Set((known.results ?? []).map((row) => row.id));
  const unknown = ids.find((id) => !existing.has(id));
  if (unknown) return fail("Unknown project in the new order.", 404);

  const ts = nowIso();
  await env.DB.batch(
    ids.map((id, index) =>
      env.DB.prepare("UPDATE projects SET sort_order = ?, updated_at = ? WHERE id = ?").bind(index, ts, id)
    )
  );

  return json({ ok: true, order: ids });
}

async function deleteUnusedUpload(env: Env, key: string): Promise<Response> {
  const validPrefix =
    key.startsWith("graphics/") ||
    key.startsWith("videos/") ||
    key.startsWith("thumbs/") ||
    key.startsWith("artist/") ||
    key.startsWith("originals/");
  if (!validPrefix) return fail("Invalid media key.", 400);

  // The live artist portrait and its original are removed through the artist endpoints only.
  if (key.startsWith("artist/")) {
    const active = await readSetting(env, SETTINGS_ARTIST_PHOTO);
    if (active?.value === key) {
      return fail("This is the active artist photo. Use Artist Profile Management to replace or delete it.", 409);
    }
  }
  if (key.startsWith("originals/")) {
    const activeOriginal = await readSetting(env, SETTINGS_ARTIST_ORIGINAL);
    if (activeOriginal?.value === key) {
      return fail("This original is kept for re-editing the artist photo.", 409);
    }
  }

  const referenced = await env.DB.prepare(
    "SELECT id FROM projects WHERE asset_key = ? OR thumb_key = ? LIMIT 1"
  )
    .bind(key, key)
    .first<{ id: string }>();

  if (referenced) return fail("This file is attached to a project and cannot be removed here.", 409);

  await deleteObject(env, [key]);
  await env.DB.prepare("DELETE FROM upload_fingerprints WHERE key = ?").bind(key).run();
  return json({ ok: true });
}

async function deleteProject(env: Env, id: string): Promise<Response> {
  const existing = await env.DB.prepare("SELECT * FROM projects WHERE id = ?").bind(id).first<ProjectRow>();
  if (!existing) return fail("Project not found.", 404);

  await env.DB.prepare("DELETE FROM projects WHERE id = ?").bind(id).run();

  const keys = [existing.asset_key, existing.thumb_key].filter(
    (key): key is string => typeof key === "string" && key.length > 0 && !key.startsWith("link/")
  );
  if (keys.length) {
    await deleteObject(env, keys).catch(() => undefined);
    for (const key of keys) {
      await env.DB.prepare("DELETE FROM upload_fingerprints WHERE key = ?").bind(key).run();
    }
  }

  return json({ ok: true });
}

/* --------------------------------- uploads -------------------------------- */

async function upload(request: Request, env: Env): Promise<Response> {
  if (!storageConfigured(env)) {
    return fail(
      "File storage is not configured. Set the Backblaze B2 credentials (B2_APPLICATION_KEY_ID, B2_APPLICATION_KEY, B2_BUCKET_NAME, B2_REGION, B2_ENDPOINT) on this deployment.",
      503
    );
  }

  const contentType = request.headers.get("Content-Type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return fail("Uploads must use multipart/form-data.", 415);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail("Could not read the uploaded file.", 400);
  }

  const kindRaw = String(form.get("kind") ?? "");
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return fail("No file was provided.", 400);

  const kind =
    kindRaw === "thumbnail"
      ? "thumbnail"
      : kindRaw === "video"
        ? "video"
        : kindRaw === "graphic"
          ? "graphic"
          : kindRaw === "artist"
            ? "artist"
            : kindRaw === "original"
              ? "original"
              : null;
  if (!kind) return fail("Upload kind must be graphic, video, artist, original or thumbnail.", 400);

  const allowed = kind === "video" ? VIDEO_TYPES : IMAGE_TYPES;
  const maxBytes = kind === "thumbnail" ? LIMITS.thumbnail : kind === "video" ? LIMITS.video : LIMITS.image;

  const declaredType = (file.type || "").toLowerCase();
  const type = allowed.has(declaredType) ? declaredType : "";
  if (!type) {
    return fail(
      kind === "video"
        ? "Unsupported video format. Use MP4, WebM or MOV."
        : "Unsupported image format. Use JPG, PNG, WebP or GIF.",
      415
    );
  }
  if (file.size > maxBytes) {
    return fail(`File is too large. Maximum size is ${Math.round(maxBytes / (1024 * 1024))} MB.`, 413);
  }

  const buffer = await file.arrayBuffer();
  if (!signatureMatches(type, new Uint8Array(buffer))) {
    return fail("File content does not match its declared type.", 415);
  }

  const hash = await sha256Hex(buffer);

  const trackFingerprint = kind === "graphic" || kind === "video";

  if (trackFingerprint) {
    const duplicate = await env.DB.prepare("SELECT key FROM upload_fingerprints WHERE hash = ?")
      .bind(hash)
      .first<{ key: string }>();
    if (duplicate) {
      return fail("This file has already been uploaded.", 409, { duplicateOf: duplicate.key });
    }

    const published = await env.DB.prepare("SELECT title FROM projects WHERE asset_hash = ? LIMIT 1")
      .bind(hash)
      .first<{ title: string }>();
    if (published) {
      return fail("This file has already been uploaded as a project.", 409, { duplicateOf: published.title });
    }
  }

  const prefix =
    kind === "video"
      ? "videos"
      : kind === "graphic"
        ? "graphics"
        : kind === "artist"
          ? "artist"
          : kind === "original"
            ? "originals"
            : "thumbs";
  const key = `${prefix}/${crypto.randomUUID()}.${EXTENSIONS[type] ?? "bin"}`;

  await putObject(env, key, buffer, {
    contentType: type,
    sha256: hash,
    originalName: file.name.slice(0, 120),
  });

  if (trackFingerprint) {
    const claim = await env.DB.prepare(
      "INSERT OR IGNORE INTO upload_fingerprints (hash, key, created_at) VALUES (?, ?, ?)"
    )
      .bind(hash, key, nowIso())
      .run();

    if ((claim.meta?.changes ?? 0) === 0) {
      await deleteObject(env, [key]).catch(() => undefined);
      return fail("This file has already been uploaded.", 409);
    }
  }

  return json({
    key,
    type,
    size: file.size,
    hash,
    url: `${ADMIN}/media/${key}`,
  });
}

/* ---------------------------------- stats --------------------------------- */

/* ---------------------------- multipart uploads --------------------------- */

/** Rules shared by the multipart endpoints; mirrors the single-request upload. */
const MULTIPART_RULES: Record<
  "graphic" | "video" | "thumbnail" | "artist" | "original",
  { types: Set<string>; prefix: string; max: number }
> = {
  graphic: { types: IMAGE_TYPES, prefix: "graphics", max: LIMITS.image },
  video: { types: VIDEO_TYPES, prefix: "videos", max: LIMITS.videoMultipart },
  thumbnail: { types: IMAGE_TYPES, prefix: "thumbs", max: LIMITS.thumbnail },
  artist: { types: IMAGE_TYPES, prefix: "artist", max: LIMITS.image },
  original: { types: IMAGE_TYPES, prefix: "originals", max: LIMITS.image },
};

const MEDIA_KEY_PREFIXES = ["graphics/", "videos/", "thumbs/", "artist/", "originals/"];

function validMediaKey(key: string): boolean {
  return MEDIA_KEY_PREFIXES.some((prefix) => key.startsWith(prefix)) && !key.includes("..");
}

/**
 * Multipart upload, step 1: reserve an object key and open a B2 multipart
 * upload. The browser then streams each part to this Worker; the B2
 * credentials and the signed requests never leave the server, and no single
 * request comes near Cloudflare's body-size limit.
 */
async function multipartStart(request: Request, env: Env): Promise<Response> {
  if (storageProvider(env) !== "backblaze-b2") {
    return fail(
      "Large multipart uploads need Backblaze B2. Configure B2_APPLICATION_KEY_ID, B2_APPLICATION_KEY, B2_BUCKET_NAME, B2_REGION and B2_ENDPOINT.",
      503
    );
  }

  const body = await readJson<{ kind?: unknown; filename?: unknown; type?: unknown; size?: unknown }>(request);
  if (!body) return fail("Invalid JSON body.");

  const kind = typeof body.kind === "string" ? body.kind : "";
  if (!(kind in MULTIPART_RULES)) return fail("Upload kind must be graphic, video, artist, original or thumbnail.");
  const rule = MULTIPART_RULES[kind as keyof typeof MULTIPART_RULES];

  const type = typeof body.type === "string" ? body.type.toLowerCase() : "";
  if (!rule.types.has(type)) {
    return fail(
      kind === "video"
        ? "Unsupported video format. Use MP4, WebM or MOV."
        : "Unsupported image format. Use JPG, PNG, WebP or GIF.",
      415
    );
  }

  const size = typeof body.size === "number" && Number.isFinite(body.size) ? Math.round(body.size) : 0;
  if (size <= 0) return fail("The file size is required.", 400);
  if (size > rule.max) {
    return fail(`File is too large. Maximum size is ${Math.round(rule.max / (1024 * 1024))} MB.`, 413);
  }

  const partCount = Math.ceil(size / PART_SIZE);
  if (partCount > MAX_PARTS) return fail("File needs more upload parts than Backblaze B2 accepts.", 413);

  const filename = typeof body.filename === "string" ? body.filename : "";
  const key = `${rule.prefix}/${crypto.randomUUID()}.${EXTENSIONS[type] ?? "bin"}`;

  try {
    const uploadId = await createMultipartUpload(env, key, type);
    return json({
      key,
      uploadId,
      partSize: PART_SIZE,
      partCount,
      type,
      filename: filename.slice(0, 120),
      provider: "backblaze-b2",
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Could not start the upload.", 502);
  }
}

/** Multipart step 2: forward one part (<= PART_SIZE) to B2. */
async function multipartPart(request: Request, env: Env, url: URL): Promise<Response> {
  const key = url.searchParams.get("key") ?? "";
  const uploadId = url.searchParams.get("uploadId") ?? "";
  const partNumber = Number(url.searchParams.get("partNumber"));

  if (!validMediaKey(key)) return fail("Invalid media key.", 400);
  if (!uploadId || uploadId.length > 1024) return fail("Missing upload id.", 400);
  if (!Number.isInteger(partNumber) || partNumber < 1 || partNumber > MAX_PARTS) {
    return fail("Invalid part number.", 400);
  }

  const length = Number(request.headers.get("content-length") ?? "0");
  if (length > PART_SIZE + 1024 * 1024) return fail("Upload part is too large.", 413);

  let buffer: ArrayBuffer;
  try {
    buffer = await request.arrayBuffer();
  } catch {
    return fail("Could not read the upload part.", 400);
  }
  if (!buffer.byteLength) return fail("Upload part was empty.", 400);

  try {
    const etag = await uploadPart(env, key, uploadId, partNumber, buffer);
    return json({ partNumber, etag, size: buffer.byteLength });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Upload part failed.", 502);
  }
}

/** Multipart step 3: complete the object and confirm it is readable. */
async function multipartComplete(request: Request, env: Env): Promise<Response> {
  const body = await readJson<{
    key?: unknown;
    uploadId?: unknown;
    parts?: unknown;
    contentType?: unknown;
  }>(request);
  if (!body) return fail("Invalid JSON body.");

  const key = typeof body.key === "string" ? body.key : "";
  const uploadId = typeof body.uploadId === "string" ? body.uploadId : "";
  if (!validMediaKey(key)) return fail("Invalid media key.", 400);
  if (!uploadId) return fail("Missing upload id.", 400);

  const parts = Array.isArray(body.parts)
    ? body.parts
        .filter(
          (part): part is { partNumber: number; etag: string } =>
            typeof part === "object" &&
            part !== null &&
            typeof (part as { partNumber?: unknown }).partNumber === "number" &&
            typeof (part as { etag?: unknown }).etag === "string"
        )
        .map((part) => ({ partNumber: part.partNumber, etag: part.etag }))
    : [];

  if (!parts.length || parts.length > MAX_PARTS) return fail("Upload parts are required.", 400);

  try {
    await completeMultipartUpload(env, key, uploadId, parts);
    const head = await headObject(env, key);
    if (!head) return fail("Backblaze B2 accepted the upload but the file is not readable yet.", 502);
    return json({
      key,
      type: head.contentType ?? (typeof body.contentType === "string" ? body.contentType : ""),
      size: head.size,
      hash: head.sha256 ?? "",
      url: `${ADMIN}/media/${key}`,
      provider: "backblaze-b2",
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Could not finish the upload.", 502);
  }
}

/** Multipart cleanup: discard an upload the browser abandoned. */
async function multipartAbort(request: Request, env: Env): Promise<Response> {
  const body = await readJson<{ key?: unknown; uploadId?: unknown }>(request);
  const key = typeof body?.key === "string" ? body.key : "";
  const uploadId = typeof body?.uploadId === "string" ? body.uploadId : "";
  if (!validMediaKey(key) || !uploadId) return fail("A key and upload id are required.");

  try {
    await abortMultipartUpload(env, key, uploadId);
    return json({ ok: true });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Could not cancel the upload.", 502);
  }
}

/** Incomplete uploads still open on the bucket (used for cleanup). */
async function multipartList(env: Env): Promise<Response> {
  try {
    return json({ uploads: await listMultipartUploads(env), provider: "backblaze-b2" });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Could not list uploads.", 502);
  }
}

async function multipartCleanup(request: Request, env: Env): Promise<Response> {
  const body = await readJson<{ olderThanHours?: unknown }>(request);
  const olderThanHours =
    typeof body?.olderThanHours === "number" && Number.isFinite(body.olderThanHours) && body.olderThanHours >= 0
      ? Math.min(body.olderThanHours, 24 * 30)
      : 24;
  try {
    const result = await cleanupMultipartUploads(env, olderThanHours);
    return json({ ...result, olderThanHours });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Could not clean up uploads.", 502);
  }
}

/** Listing + metadata for stored objects (admin only). */
async function listMedia(env: Env, url: URL): Promise<Response> {
  const prefix = url.searchParams.get("prefix") ?? "";
  const cursor = url.searchParams.get("cursor");
  const limit = Number(url.searchParams.get("limit") ?? "100");
  try {
    const result = await listObjects(env, {
      prefix: prefix || undefined,
      cursor,
      limit: Number.isFinite(limit) ? limit : 100,
    });
    return json({ ...result, provider: storageProvider(env), bucket: env.B2_BUCKET_NAME ?? null });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Could not list stored media.", 502);
  }
}

async function mediaInfo(env: Env, url: URL): Promise<Response> {
  const key = url.searchParams.get("key") ?? "";
  if (!validMediaKey(key)) return fail("Invalid media key.", 400);

  try {
    const head = await headObject(env, key);
    if (!head) return json({ key, exists: false, provider: storageProvider(env) });
    const used = await env.DB.prepare(
      "SELECT id, title FROM projects WHERE asset_key = ? OR thumb_key = ? LIMIT 1"
    )
      .bind(key, key)
      .first<{ id: string; title: string }>();
    return json({
      key,
      exists: true,
      ...head,
      provider: storageProvider(env),
      project: used ? { id: used.id, title: used.title } : null,
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Could not read file metadata.", 502);
  }
}

async function stats(env: Env): Promise<Response> {
  const counts = await env.DB.prepare(
    "SELECT kind, status, COUNT(*) AS total FROM projects GROUP BY kind, status"
  ).all<{ kind: string; status: string; total: number }>();

  const aggregate = await env.DB.prepare(
    "SELECT COUNT(*) AS assets, COALESCE(SUM(asset_size), 0) AS bytes FROM projects"
  ).first<{ assets: number; bytes: number }>();

  const recent = await env.DB.prepare(
    "SELECT * FROM projects ORDER BY created_at DESC LIMIT 6"
  ).all<ProjectRow>();

  let graphics = 0;
  let videos = 0;
  let published = 0;
  let drafts = 0;
  for (const row of counts.results ?? []) {
    if (row.kind === "graphic") graphics += row.total;
    if (row.kind === "video") videos += row.total;
    if (row.status === "published") published += row.total;
    if (row.status === "draft") drafts += row.total;
  }

  return json({
    counts: {
      graphics,
      videos,
      total: graphics + videos,
      published,
      drafts,
      assets: aggregate?.assets ?? 0,
      bytes: aggregate?.bytes ?? 0,
    },
    recent: (recent.results ?? []).map(toAdminProject),
  });
}

async function status(env: Env): Promise<Response> {
  const provider = storageProvider(env);
  let storageOk = provider !== "none";
  try {
    if (storageOk) await headObject(env, "__health_probe__");
  } catch {
    storageOk = false;
  }

  const aggregate = await env.DB.prepare(
    "SELECT COUNT(*) AS assets, COALESCE(SUM(asset_size), 0) AS bytes FROM projects"
  ).first<{ assets: number; bytes: number }>();

  const adminCredentials = await readAdminCredentials(env);
  return json({
    configured: Boolean(adminCredentials.email && adminCredentials.passwordHash),
    email: adminCredentials.email || null,
    database: { ok: true },
    storage: {
      ok: storageOk,
      provider,
      bucket: provider === "backblaze-b2" ? (env.B2_BUCKET_NAME ?? null) : null,
      region: provider === "backblaze-b2" ? (b2Config(env)?.region ?? env.B2_REGION ?? null) : null,
      objects: aggregate?.assets ?? 0,
      bytes: aggregate?.bytes ?? 0,
    },
    limits: {
      imageBytes: LIMITS.image,
      videoBytes: LIMITS.video,
      videoMultipartBytes: LIMITS.videoMultipart,
      thumbnailBytes: LIMITS.thumbnail,
      imageTypes: [...IMAGE_TYPES],
      videoTypes: [...VIDEO_TYPES],
    },
  });
}

/* ------------------------- settings & system health ------------------------ */

const SETTINGS_MAINTENANCE = "maintenance";
/** Storage object key of the photo hanging in the public Artist portrait frame. */
const SETTINGS_ARTIST_PHOTO = "artist_photo";
/** Untouched upload kept so the photograph can be re-edited from the original. */
const SETTINGS_ARTIST_ORIGINAL = "artist_photo_original";
/** Set lazily on the first request this isolate serves. */
let isolateStartedAt = 0;

async function readSetting(env: Env, key: string): Promise<{ value: string; updatedAt: string } | null> {
  try {
    const row = await env.DB.prepare("SELECT value, updated_at FROM settings WHERE key = ?")
      .bind(key)
      .first<{ value: string; updated_at: string }>();
    return row ? { value: row.value, updatedAt: row.updated_at } : null;
  } catch {
    return null;
  }
}

async function writeSetting(env: Env, key: string, value: string): Promise<void> {
  await env.DB.prepare(
    "INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?) " +
      "ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at"
  )
    .bind(key, value, nowIso())
    .run();
}

/* --------------------------- artist portrait ------------------------------ */

/** Public: the active artist portrait URL (used by the Artist section). */
async function publicArtistPhoto(env: Env): Promise<Response> {
  const row = await readSetting(env, SETTINGS_ARTIST_PHOTO);
  if (!row?.value) {
    return json({ photoUrl: null, updatedAt: null }, 200, { "Cache-Control": "no-store" });
  }
  return json(
    {
      photoUrl: `/media/${row.value}?v=${encodeURIComponent(row.updatedAt)}`,
      updatedAt: row.updatedAt,
    },
    200,
    { "Cache-Control": "no-store" }
  );
}

/** Public: serve an artist asset only while it is the active portrait. */
async function serveActiveArtistPhoto(env: Env, key: string, range: string | null): Promise<Response> {
  const row = await readSetting(env, SETTINGS_ARTIST_PHOTO);
  if (!row?.value || row.value !== key) return new Response("Not found", { status: 404 });
  return serveObject(env, key, false, range);
}

function toAdminArtistPhoto(key: string, updatedAt: string, head: StoredObject | null) {
  return {
    key,
    url: `${ADMIN}/media/${key}`,
    type: head?.contentType ?? "",
    size: head?.size ?? 0,
    updatedAt,
  };
}

async function adminArtistPhoto(request: Request, env: Env): Promise<Response> {
  if (request.method === "GET") {
    const row = await readSetting(env, SETTINGS_ARTIST_PHOTO);
    const originalRow = await readSetting(env, SETTINGS_ARTIST_ORIGINAL);
    const original = originalRow?.value
      ? { key: originalRow.value, url: `${ADMIN}/media/${originalRow.value}`, updatedAt: originalRow.updatedAt }
      : null;
    if (!row?.value) return json({ photo: null, original });
    let head: StoredObject | null = null;
    try {
      head = await headObject(env, row.value);
    } catch (error) {
      return fail(error instanceof Error ? error.message : "Storage is unavailable.", 502);
    }
    if (!head) return json({ photo: null, original, warning: "The stored artist photo is missing from storage." });
    return json({ photo: toAdminArtistPhoto(row.value, row.updatedAt, head), original });
  }

  if (request.method === "DELETE") {
    const row = await readSetting(env, SETTINGS_ARTIST_PHOTO);
    const originalRow = await readSetting(env, SETTINGS_ARTIST_ORIGINAL);
    try {
      await env.DB.prepare("DELETE FROM settings WHERE key IN (?, ?)")
        .bind(SETTINGS_ARTIST_PHOTO, SETTINGS_ARTIST_ORIGINAL)
        .run();
    } catch {
      return fail("The settings table is missing. Apply worker/schema.sql to the D1 database first.", 503);
    }
    if (row?.value) await deleteObject(env, [row.value]).catch(() => undefined);
    if (originalRow?.value) await deleteObject(env, [originalRow.value]).catch(() => undefined);
    return json({ ok: true });
  }

  const body = await readJson<{ assetKey?: unknown; originalKey?: unknown }>(request);
  const next = typeof body?.assetKey === "string" ? body.assetKey : "";
  if (!next.startsWith("artist/")) return fail("Invalid artist photo key.");

  const originalKey = typeof body?.originalKey === "string" && body.originalKey ? body.originalKey : "";
  if (originalKey && !originalKey.startsWith("originals/")) return fail("Invalid original image key.");

  let head: StoredObject | null = null;
  try {
    head = await headObject(env, next);
    if (originalKey && !(await headObject(env, originalKey))) {
      return fail("The stored original image was not found.", 404);
    }
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Storage is unavailable.", 502);
  }
  if (!head) return fail("The uploaded photo was not found in storage.", 404);

  const previous = await readSetting(env, SETTINGS_ARTIST_PHOTO);
  const previousOriginal = await readSetting(env, SETTINGS_ARTIST_ORIGINAL);
  try {
    await writeSetting(env, SETTINGS_ARTIST_PHOTO, next);
    if (originalKey) await writeSetting(env, SETTINGS_ARTIST_ORIGINAL, originalKey);
  } catch {
    return fail("The settings table is missing. Apply worker/schema.sql to the D1 database first.", 503);
  }

  if (previous?.value && previous.value !== next) {
    await deleteObject(env, [previous.value]).catch(() => undefined);
  }
  if (originalKey && previousOriginal?.value && previousOriginal.value !== originalKey) {
    await deleteObject(env, [previousOriginal.value]).catch(() => undefined);
  }

  const savedOriginal = originalKey
    ? { key: originalKey, url: `${ADMIN}/media/${originalKey}`, updatedAt: nowIso() }
    : previousOriginal?.value
      ? { key: previousOriginal.value, url: `${ADMIN}/media/${previousOriginal.value}`, updatedAt: previousOriginal.updatedAt }
      : null;

  return json({ photo: toAdminArtistPhoto(next, nowIso(), head), original: savedOriginal });
}

async function publicSiteStatus(env: Env): Promise<Response> {
  const maintenance = await readSetting(env, SETTINGS_MAINTENANCE);
  return json({
    maintenance: maintenance?.value === "on",
    updatedAt: maintenance?.updatedAt ?? null,
  });
}

async function adminMaintenance(request: Request, env: Env): Promise<Response> {
  if (request.method === "GET") {
    const current = await readSetting(env, SETTINGS_MAINTENANCE);
    return json({ enabled: current?.value === "on", updatedAt: current?.updatedAt ?? null });
  }

  let body: { enabled?: unknown } | null = null;
  try {
    body = (await request.json()) as { enabled?: unknown };
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  if (typeof body?.enabled !== "boolean") return fail("`enabled` must be true or false.", 400);

  try {
    await writeSetting(env, SETTINGS_MAINTENANCE, body.enabled ? "on" : "off");
  } catch {
    return fail(
      "The settings table is missing. Apply worker/schema.sql to the D1 database first.",
      503
    );
  }

  return json({ enabled: body.enabled, updatedAt: nowIso() });
}

async function adminHealth(request: Request, env: Env): Promise<Response> {
  const dbStart = Date.now();
  let dbOk = true;
  let assets = 0;
  let bytes = 0;
  try {
    const row = await env.DB.prepare(
      "SELECT COUNT(*) AS assets, COALESCE(SUM(asset_size), 0) AS bytes FROM projects"
    ).first<{ assets: number; bytes: number }>();
    assets = row?.assets ?? 0;
    bytes = row?.bytes ?? 0;
  } catch {
    dbOk = false;
  }
  const dbLatency = Date.now() - dbStart;

  const provider = storageProvider(env);
  const storageLabel = provider === "backblaze-b2" ? "Backblaze B2" : "no storage";

  const storageStart = Date.now();
  let storageOk = provider !== "none";
  try {
    if (storageOk) await headObject(env, "__health_probe__");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.toLowerCase().includes("not found")) storageOk = false;
  }
  const storageLatency = Date.now() - storageStart;

  // Portfolio uploads: prove the private bucket accepts a write, reads it back
  // and deletes it. This is a real B2 round trip, not a binding check.
  const uploadStart = Date.now();
  let uploadsOk = false;
  let uploadsDetail = "Write probe failed";
  const probeKey = `health/probe-${crypto.randomUUID()}.txt`;
  try {
    await putObject(env, probeKey, new TextEncoder().encode("ok").buffer as ArrayBuffer, {
      contentType: "text/plain",
    });
    const written = await headObject(env, probeKey);
    await deleteObject(env, [probeKey]);
    uploadsOk = Boolean(written);
    uploadsDetail = uploadsOk
      ? `Upload, read-back and delete verified on ${storageLabel}`
      : "Wrote but could not read back";
  } catch (error) {
    uploadsDetail = `${storageLabel} write failed: ${error instanceof Error ? error.message.slice(0, 120) : "unknown"}`;
    await deleteObject(env, [probeKey]).catch(() => undefined);
  }
  const uploadLatency = Date.now() - uploadStart;

  // Frontend: prove the deployed SPA actually serves HTML (not just that a route exists).
  const frontendStart = Date.now();
  let frontendOk = false;
  let frontendDetail = "Assets binding unreachable";
  try {
    if (!env.ASSETS) {
      // Cloudflare Pages serves ./dist itself and never binds ASSETS here.
      const own = await fetch(new URL("/", request.url).toString(), { method: "HEAD" });
      const contentType = own.headers.get("content-type") ?? "";
      frontendOk = own.ok && contentType.includes("text/html");
      frontendDetail = own.ok
        ? `Pages static build · ${contentType.split(";")[0] || "text/html"}`
        : `Pages static build returned ${own.status}`;
    } else {
      const assetResponse = await env.ASSETS.fetch(new Request(new URL("/", request.url).toString()));
      const contentType = assetResponse.headers.get("content-type") ?? "";
      frontendOk = assetResponse.ok && contentType.includes("text/html");
      frontendDetail = `${assetResponse.status} · ${contentType.split(";")[0] || "unknown"}`;
    }
  } catch (error) {
    frontendDetail = error instanceof Error ? error.message : "Asset fetch failed";
  }
  const frontendLatency = Date.now() - frontendStart;

  // Auth: credentials configured *and* the session store actually queryable.
  let sessionRows: number | null = null;
  try {
    const row = await env.DB.prepare("SELECT COUNT(*) AS total FROM sessions").first<{ total: number }>();
    sessionRows = row?.total ?? 0;
  } catch {
    sessionRows = null;
  }
  const adminCredentials = await readAdminCredentials(env);
  const credentialsConfigured = Boolean(adminCredentials.email && adminCredentials.passwordHash);

  const ai = await aiRuntime(env);
  const aiConfigured = ai.configured && ai.enabled;

  const maintenance = await readSetting(env, SETTINGS_MAINTENANCE);
  const cf = (request as Request & { cf?: { colo?: string; country?: string } }).cf;

  if (!isolateStartedAt) isolateStartedAt = Date.now();

  type ServiceStatus = "operational" | "warning" | "failure";
  const services: {
    id: string;
    label: string;
    status: ServiceStatus;
    detail: string;
    latencyMs: number | null;
    verified: boolean;
  }[] = [
    {
      id: "frontend",
      label: "Website frontend",
      status: frontendOk ? "operational" : "failure",
      detail: frontendDetail,
      latencyMs: frontendLatency,
      verified: true,
    },
    {
      id: "backend",
      label: "Backend worker",
      status: "operational",
      detail: "Responding to this request",
      latencyMs: null,
      verified: true,
    },
    {
      id: "auth",
      label: "Authentication",
      status: !credentialsConfigured ? "failure" : sessionRows === null ? "warning" : "operational",
      detail: !credentialsConfigured
        ? "ADMIN_EMAIL / ADMIN_PASSWORD_HASH missing"
        : sessionRows === null
          ? "Session store unreachable"
          : `Credentials valid · ${sessionRows} stored session${sessionRows === 1 ? "" : "s"}`,
      latencyMs: null,
      verified: true,
    },
    {
      id: "database",
      label: "Database",
      status: dbOk ? "operational" : "failure",
      detail: dbOk ? `D1 responding · ${assets} project rows` : "D1 query failed",
      latencyMs: dbLatency,
      verified: true,
    },
    {
      id: "storage",
      label: "File storage",
      status: storageOk ? "operational" : "failure",
      detail: storageOk
        ? `Backblaze B2 private bucket reachable${env.B2_BUCKET_NAME ? ` · ${env.B2_BUCKET_NAME}` : ""}`
        : `${storageLabel} bucket unreachable`,
      latencyMs: storageLatency,
      verified: true,
    },
    {
      id: "uploads",
      label: "Portfolio uploads",
      status: uploadsOk ? "operational" : "failure",
      detail: uploadsDetail,
      latencyMs: uploadLatency,
      verified: true,
    },
    {
      id: "ai",
      label: "AI assistant",
      status: aiConfigured ? "operational" : "warning",
      detail: aiConfigured
        ? `${ai.provider} · ${ai.model}${ai.lastSuccessAt ? " · verified" : " · key stored"}`
        : ai.configured
          ? "Assistant disabled in the dashboard"
          : "No NVIDIA API key configured (dashboard or AI_API_KEY secret)",
      latencyMs: null,
      verified: true,
    },
  ];

  const failures = services.filter((service) => service.status === "failure").length;
  const warnings = services.filter((service) => service.status === "warning").length;
  const operational = services.filter((service) => service.status === "operational").length;

  return json({
    checkedAt: nowIso(),
    uptimeSeconds: Math.max(0, Math.floor((Date.now() - isolateStartedAt) / 1000)),
    database: { ok: dbOk, latencyMs: dbLatency, objects: assets, bytes },
    storage: {
      ok: storageOk,
      provider,
      bucket: provider === "backblaze-b2" ? (env.B2_BUCKET_NAME ?? null) : null,
    },
    auth: { configured: credentialsConfigured, email: adminCredentials.email || null },
    maintenance: { enabled: maintenance?.value === "on", updatedAt: maintenance?.updatedAt ?? null },
    edge: { colo: cf?.colo ?? null, country: cf?.country ?? null },
    limits: { imageBytes: LIMITS.image, videoBytes: LIMITS.video, thumbnailBytes: LIMITS.thumbnail },
    services,
    summary: {
      operational,
      warnings,
      failures,
      healthy: failures === 0,
      label:
        failures > 0
          ? "SYSTEM HEALTH: ATTENTION REQUIRED"
          : "SYSTEM HEALTH: WORKING WELL",
    },
  });
}

/* --------------------------------- router --------------------------------- */

async function handleApi(request: Request, env: Env, url: URL): Promise<Response> {
  // Tolerate a trailing slash so /api/admin/login/ is the same route.
  const path = url.pathname.replace(/\/+$/, "") || "/";
  const method = request.method.toUpperCase();

  if (method === "OPTIONS") return preflight(request);

  if (path === "/api/projects" && method === "GET") return publicProjects(env);
  if (path === "/api/artist" && method === "GET") return publicArtistPhoto(env);
  if (path === "/api/site/status" && method === "GET") return publicSiteStatus(env);

  // `/api/login` is kept as an alias so an older cached bundle cannot 404.
  const loginPaths = new Set([`${ADMIN}/login`, "/api/login"]);
  if (loginPaths.has(path) && method === "POST") return login(request, env);
  if (loginPaths.has(path)) return methodNotAllowed("POST");

  if (path === `${ADMIN}/session` && method === "GET") {
    const ok = await getSession(env, request);
    if (!ok) return fail("Unauthorized", 401);
    const credentials = await readAdminCredentials(env);
    return json({ authenticated: true, email: credentials.email || null });
  }
  if (path === `${ADMIN}/session`) return methodNotAllowed("GET");
  if (path === `${ADMIN}/logout` && method === "POST") return logout(request, env);
  if (path === `${ADMIN}/logout`) return methodNotAllowed("POST");

  // Administrator account (email/password) and the storage diagnostic own their
  // origin checks and validation, but still require a live admin session here.
  if (path === `${ADMIN}/account` && (method === "GET" || method === "POST")) {
    const denied = await requireAdmin(request, env, method === "POST");
    if (denied) return denied;
    return method === "GET" ? adminAccountStatus(env) : changeAdminAccount(request, env);
  }
  if (path === `${ADMIN}/storage/diagnostic` && method === "POST") {
    const denied = await requireAdmin(request, env, true);
    if (denied) return denied;
    return runStorageDiagnostic(env);
  }

  const portal = await handlePortalApi(request, env, url, {
    requireAdmin: (req, portalEnv, mutating) => requireAdmin(req, portalEnv as Env, mutating),
  });
  if (portal) return portal;

  const mutating = method !== "GET" && method !== "HEAD";
  const denied = await requireAdmin(request, env, mutating);
  if (denied) return denied;

  if (path === `${ADMIN}/projects` && method === "GET") return listAdminProjects(env, url);
  if (path === `${ADMIN}/projects` && method === "POST") return createProject(request, env);
  if (path === `${ADMIN}/projects/reorder` && method === "POST") return reorderProjects(request, env);
  if (path === `${ADMIN}/stats` && method === "GET") return stats(env);
  if (path === `${ADMIN}/status` && method === "GET") return status(env);
  if (path === `${ADMIN}/health` && method === "GET") return adminHealth(request, env);
  if (path === `${ADMIN}/maintenance` && (method === "GET" || method === "POST"))
    return adminMaintenance(request, env);
  if (path === `${ADMIN}/artist` && (method === "GET" || method === "POST" || method === "DELETE"))
    return adminArtistPhoto(request, env);
  if (path === `${ADMIN}/upload` && method === "POST") return upload(request, env);

  // Backblaze B2 multipart uploads, listing and metadata (admin session required).
  if (path === `${ADMIN}/media/multipart/start` && method === "POST") return multipartStart(request, env);
  if (path === `${ADMIN}/media/multipart/part` && method === "PUT") return multipartPart(request, env, url);
  if (path === `${ADMIN}/media/multipart/complete` && method === "POST") return multipartComplete(request, env);
  if (path === `${ADMIN}/media/multipart/abort` && method === "POST") return multipartAbort(request, env);
  if (path === `${ADMIN}/media/multipart/uploads` && method === "GET") return multipartList(env);
  if (path === `${ADMIN}/media/multipart/cleanup` && method === "POST") return multipartCleanup(request, env);
  if (path === `${ADMIN}/media/list` && method === "GET") return listMedia(env, url);
  if (path === `${ADMIN}/media/info` && method === "GET") return mediaInfo(env, url);

  const projectMatch = path.match(/^\/api\/admin\/projects\/([^/]+)$/);
  if (projectMatch) {
    const id = decodeURIComponent(projectMatch[1]);
    if (method === "PATCH" || method === "PUT") return updateProject(request, env, id);
    if (method === "DELETE") return deleteProject(env, id);
  }

  if (path.startsWith(`${ADMIN}/media/`)) {
    const key = decodeURIComponent(path.slice(`${ADMIN}/media/`.length));
    if (!key) return fail("Missing media key.", 400);
    if (method === "GET") return serveObject(env, key, true, request.headers.get("Range"));
    if (method === "DELETE") return deleteUnusedUpload(env, key);
  }

  return fail("Not found", 404);
}

/**
 * The one backend used by both deployment targets:
 *
 * - Cloudflare Pages Functions (`functions/api/[[path]].ts` and
 *   `functions/media/[[path]].ts`) on gursimar-portfolio.pages.dev, where Pages
 *   serves the static build from ./dist itself;
 * - the standalone Worker (`wrangler.worker.toml`) which additionally serves
 *   ./dist through the ASSETS binding.
 *
 * Neither path has its own database: both read the same D1 database and R2
 * bucket, which is what keeps localhost and production in sync.
 */
export async function handleBackendRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);

  try {
    if (url.pathname.startsWith("/api/")) {
      // Sign-in must work even on a deployment whose database is missing or
      // unhealthy: the password is verified from secrets and the fallback
      // session cookie is signed, so there is no reason to block it.
      const authPath = url.pathname.replace(/\/+$/, "");
      const authRoute =
        authPath === `${ADMIN}/login` ||
        authPath === "/api/login" ||
        authPath === `${ADMIN}/session` ||
        authPath === `${ADMIN}/logout`;

      if (!env.DB) {
        if (!authRoute) {
          return json(
            {
              error:
                "The backend has no D1 database bound. In Cloudflare Pages → Settings → Functions → Bindings add DB (D1 database portfolio-db), then redeploy.",
            },
            503
          );
        }
      } else if (!(await ensureSchema(env))) {
        // Create missing tables before routing so a fresh database can still
        // sign in instead of failing with "no such table: sessions" (HTTP 500).
        if (!authRoute) {
          return json(
            {
              error:
                "The D1 database is unreachable or its schema could not be created. Verify the DB binding in Cloudflare Pages → Settings → Functions → Bindings.",
            },
            503
          );
        }
      }

      return await handleApi(request, env, url);
    }

    if (url.pathname.startsWith("/media/")) {
      const key = decodeURIComponent(url.pathname.slice("/media/".length));
      if (!key) return new Response("Not found", { status: 404 });
      const range = request.headers.get("Range");
      if (key.startsWith("artist/")) return await serveActiveArtistPhoto(env, key, range);
      return await publicMedia(env, key, range);
    }

    return fail("Not found", 404);
  } catch (error) {
    console.error(
      `Unhandled request error ${request.method} ${url.pathname}`,
      error instanceof Error ? `${error.name}: ${error.message}\n${error.stack ?? ""}` : String(error)
    );
    // A storage failure is a dependency problem with a actionable message and its
    // own status code — it must not be flattened into an opaque 500.
    if (error instanceof StorageError) return fail(error.message, error.status);
    return json({ error: "Unexpected server error." }, 500);
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const isBackendRoute = url.pathname.startsWith("/api/") || url.pathname.startsWith("/media/");

    if (!isBackendRoute && env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return handleBackendRequest(request, env);
  },
};
