import {
  clearFailures,
  clearSessionCookie,
  clientKey,
  createSession,
  destroySession,
  getSession,
  isConfigured,
  isRateLimited,
  recordFailure,
  sha256Hex,
  verifyPassword,
} from "./auth";
import { aiRuntime, handlePortalApi } from "./portal";

export interface Env {
  DB: D1Database;
  FILES: R2Bucket;
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
}

const ADMIN = "/api/admin";

const GRAPHIC_CATEGORIES = new Set(["irl", "gaming", "doc", "other"]);
const VIDEO_CATEGORIES = new Set(["gaming", "doc", "corp", "motion", "estate", "saas"]);

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);

const LIMITS = {
  image: 8 * 1024 * 1024,
  video: 90 * 1024 * 1024,
  thumbnail: 5 * 1024 * 1024,
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

function toPublicProject(row: ProjectRow) {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    description: row.description,
    category: row.category,
    mediaUrl: `/media/${row.asset_key}`,
    thumbUrl: row.thumb_key ? `/media/${row.thumb_key}` : null,
    ratio: row.display_ratio ?? null,
    width: row.asset_width ?? null,
    height: row.asset_height ?? null,
    duration: row.duration_seconds ?? null,
    createdAt: row.created_at,
  };
}

function toAdminProject(row: ProjectRow) {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    description: row.description,
    category: row.category,
    status: row.status,
    assetUrl: `${ADMIN}/media/${row.asset_key}`,
    thumbUrl: row.thumb_key ? `${ADMIN}/media/${row.thumb_key}` : null,
    assetType: row.asset_type,
    assetSize: row.asset_size,
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
  return DISPLAY_RATIOS.has(value) ? value : fallback;
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

async function publicMedia(env: Env, key: string): Promise<Response> {
  // Only assets that belong to a *published* project can be read publicly.
  const row = await env.DB.prepare(
    `SELECT id FROM projects WHERE status = 'published' AND (asset_key = ? OR thumb_key = ?) LIMIT 1`
  )
    .bind(key, key)
    .first<{ id: string }>();

  if (!row) return new Response("Not found", { status: 404 });
  return serveObject(env, key, false);
}

async function serveObject(env: Env, key: string, isPrivate: boolean): Promise<Response> {
  const object = await env.FILES.get(key);
  if (!object) return new Response("Not found", { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set(
    "Cache-Control",
    isPrivate ? "private, no-store" : "public, max-age=31536000, immutable"
  );

  return new Response(object.body, { headers });
}

/* --------------------------------- auth ---------------------------------- */

async function login(request: Request, env: Env): Promise<Response> {
  if (!originAllowed(request, env)) return fail("Invalid origin", 403);
  if (!isConfigured(env)) {
    return fail(
      "Admin credentials are not configured. Set ADMIN_EMAIL and ADMIN_PASSWORD_HASH as Worker secrets.",
      503
    );
  }

  const key = clientKey(request);
  if (isRateLimited(key)) return fail("Too many attempts. Try again later.", 429);

  const body = await readJson<{ email?: unknown; password?: unknown }>(request);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!email || !password) {
    recordFailure(key);
    return fail("Email and password are required.", 400);
  }

  const expectedEmail = (env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  const passwordOk = await verifyPassword(password, env.ADMIN_PASSWORD_HASH);
  const emailOk = email === expectedEmail;

  if (!passwordOk || !emailOk) {
    recordFailure(key);
    return fail("Invalid email or password.", 401);
  }

  clearFailures(key);
  const cookie = await createSession(env, request);
  return json(
    { authenticated: true, email: expectedEmail },
    200,
    { "Set-Cookie": cookie }
  );
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
  const assetKey = typeof body.assetKey === "string" ? body.assetKey : "";
  const thumbKey = typeof body.thumbKey === "string" && body.thumbKey ? body.thumbKey : null;
  const displayRatio = readRatio(body.displayRatio, "auto") ?? "auto";
  const assetWidth = readNumber(body.assetWidth, 20000);
  const assetHeight = readNumber(body.assetHeight, 20000);
  const durationSeconds =
    typeof body.durationSeconds === "number" && Number.isFinite(body.durationSeconds) && body.durationSeconds > 0
      ? Math.min(body.durationSeconds, 86400)
      : null;

  if (!assetKey.startsWith(kind === "graphic" ? "graphics/" : "videos/")) {
    return fail("Asset does not match the project kind.");
  }
  if (thumbKey && !thumbKey.startsWith("thumbs/")) return fail("Invalid thumbnail key.");

  const asset = await env.FILES.head(assetKey);
  if (!asset) return fail("Uploaded asset was not found in storage.", 404);

  const thumb = thumbKey ? await env.FILES.head(thumbKey) : null;
  if (thumbKey && !thumb) return fail("Uploaded thumbnail was not found in storage.", 404);

  const ts = nowIso();
  const id = crypto.randomUUID();
  const hash = asset.customMetadata?.sha256 ?? null;

  await ensureSortOrder(env);
  const last = await env.DB.prepare("SELECT COALESCE(MAX(sort_order), -1) AS max FROM projects").first<{ max: number }>();
  const sortOrder = (last?.max ?? -1) + 1;

  try {
    await env.DB.prepare(
      `INSERT INTO projects
        (id, kind, title, description, category, status, asset_key, asset_type, asset_size, asset_hash, thumb_key, thumb_type, created_at, updated_at, sort_order, display_ratio, asset_width, asset_height, duration_seconds)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        id,
        kind,
        title,
        description,
        category,
        status,
        assetKey,
        asset.httpMetadata?.contentType ?? "",
        asset.size,
        hash,
        thumbKey,
        thumb?.httpMetadata?.contentType ?? null,
        ts,
        ts,
        sortOrder,
        displayRatio,
        assetWidth,
        assetHeight,
        durationSeconds
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
      const head = await env.FILES.head(next);
      if (!head) return fail("Uploaded thumbnail was not found in storage.", 404);
      replacedThumb = existing.thumb_key && existing.thumb_key !== next ? existing.thumb_key : null;
      thumbKey = next;
      thumbType = head.httpMetadata?.contentType ?? null;
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
  let nextWidth = assetWidth;
  let nextHeight = assetHeight;
  let nextDuration = durationSeconds;

  if (Object.prototype.hasOwnProperty.call(body, "assetKey")) {
    const next = typeof body.assetKey === "string" ? body.assetKey : "";
    const prefix = kind === "graphic" ? "graphics/" : "videos/";
    if (!next || !next.startsWith(prefix)) {
      return fail("Replacement media does not match the project kind.");
    }
    const head = await env.FILES.head(next);
    if (!head) return fail("Uploaded media was not found in storage.", 404);

    replacedAsset = existing.asset_key !== next ? existing.asset_key : null;
    replacedAssetHash = existing.asset_hash;
    assetKey = next;
    assetType = head.httpMetadata?.contentType ?? existing.asset_type;
    assetSize = head.size;
    assetHash = head.customMetadata?.sha256 ?? null;
    // Dimensions describe the new file; the client sends them with the replacement.
    nextWidth = assetWidth;
    nextHeight = assetHeight;
    nextDuration = durationSeconds;
  }

  try {
    await env.DB.prepare(
      `UPDATE projects
          SET title = ?, description = ?, category = ?, status = ?, thumb_key = ?, thumb_type = ?,
              asset_key = ?, asset_type = ?, asset_size = ?, asset_hash = ?, updated_at = ?,
              display_ratio = ?, asset_width = ?, asset_height = ?, duration_seconds = ?
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
        id
      )
      .run();
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("UNIQUE")) return fail("That file is already used by another project.", 409);
    throw error;
  }

  if (replacedThumb) {
    await env.FILES.delete(replacedThumb).catch(() => undefined);
    await env.DB.prepare("DELETE FROM upload_fingerprints WHERE key = ?").bind(replacedThumb).run();
  }

  if (replacedAsset) {
    await env.FILES.delete(replacedAsset).catch(() => undefined);
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

  await env.FILES.delete(key);
  await env.DB.prepare("DELETE FROM upload_fingerprints WHERE key = ?").bind(key).run();
  return json({ ok: true });
}

async function deleteProject(env: Env, id: string): Promise<Response> {
  const existing = await env.DB.prepare("SELECT * FROM projects WHERE id = ?").bind(id).first<ProjectRow>();
  if (!existing) return fail("Project not found.", 404);

  await env.DB.prepare("DELETE FROM projects WHERE id = ?").bind(id).run();

  const keys = [existing.asset_key, existing.thumb_key].filter(
    (key): key is string => typeof key === "string" && key.length > 0
  );
  if (keys.length) {
    await env.FILES.delete(keys).catch(() => undefined);
    for (const key of keys) {
      await env.DB.prepare("DELETE FROM upload_fingerprints WHERE key = ?").bind(key).run();
    }
  }

  return json({ ok: true });
}

/* --------------------------------- uploads -------------------------------- */

async function upload(request: Request, env: Env): Promise<Response> {
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

  await env.FILES.put(key, buffer, {
    httpMetadata: { contentType: type },
    customMetadata: { sha256: hash, originalName: file.name.slice(0, 120) },
  });

  if (trackFingerprint) {
    const claim = await env.DB.prepare(
      "INSERT OR IGNORE INTO upload_fingerprints (hash, key, created_at) VALUES (?, ?, ?)"
    )
      .bind(hash, key, nowIso())
      .run();

    if ((claim.meta?.changes ?? 0) === 0) {
      await env.FILES.delete(key).catch(() => undefined);
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
  let storageOk = true;
  try {
    await env.FILES.list({ limit: 1 });
  } catch {
    storageOk = false;
  }

  const aggregate = await env.DB.prepare(
    "SELECT COUNT(*) AS assets, COALESCE(SUM(asset_size), 0) AS bytes FROM projects"
  ).first<{ assets: number; bytes: number }>();

  return json({
    configured: isConfigured(env),
    email: env.ADMIN_EMAIL ?? null,
    database: { ok: true },
    storage: { ok: storageOk, objects: aggregate?.assets ?? 0, bytes: aggregate?.bytes ?? 0 },
    limits: {
      imageBytes: LIMITS.image,
      videoBytes: LIMITS.video,
      thumbnailBytes: LIMITS.thumbnail,
      imageTypes: [...IMAGE_TYPES],
      videoTypes: [...VIDEO_TYPES],
    },
  });
}

/* ------------------------- settings & system health ------------------------ */

const SETTINGS_MAINTENANCE = "maintenance";
/** R2 object key of the photo hanging in the public Artist portrait frame. */
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
async function serveActiveArtistPhoto(env: Env, key: string): Promise<Response> {
  const row = await readSetting(env, SETTINGS_ARTIST_PHOTO);
  if (!row?.value || row.value !== key) return new Response("Not found", { status: 404 });
  return serveObject(env, key, false);
}

function toAdminArtistPhoto(key: string, updatedAt: string, head: R2Object | null) {
  return {
    key,
    url: `${ADMIN}/media/${key}`,
    type: head?.httpMetadata?.contentType ?? "",
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
    const head = await env.FILES.head(row.value);
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
    if (row?.value) await env.FILES.delete(row.value).catch(() => undefined);
    if (originalRow?.value) await env.FILES.delete(originalRow.value).catch(() => undefined);
    return json({ ok: true });
  }

  const body = await readJson<{ assetKey?: unknown; originalKey?: unknown }>(request);
  const next = typeof body?.assetKey === "string" ? body.assetKey : "";
  if (!next.startsWith("artist/")) return fail("Invalid artist photo key.");

  const originalKey = typeof body?.originalKey === "string" && body.originalKey ? body.originalKey : "";
  if (originalKey && !originalKey.startsWith("originals/")) return fail("Invalid original image key.");

  const head = await env.FILES.head(next);
  if (!head) return fail("The uploaded photo was not found in storage.", 404);
  if (originalKey) {
    const originalHead = await env.FILES.head(originalKey);
    if (!originalHead) return fail("The stored original image was not found.", 404);
  }

  const previous = await readSetting(env, SETTINGS_ARTIST_PHOTO);
  const previousOriginal = await readSetting(env, SETTINGS_ARTIST_ORIGINAL);
  try {
    await writeSetting(env, SETTINGS_ARTIST_PHOTO, next);
    if (originalKey) await writeSetting(env, SETTINGS_ARTIST_ORIGINAL, originalKey);
  } catch {
    return fail("The settings table is missing. Apply worker/schema.sql to the D1 database first.", 503);
  }

  if (previous?.value && previous.value !== next) {
    await env.FILES.delete(previous.value).catch(() => undefined);
  }
  if (originalKey && previousOriginal?.value && previousOriginal.value !== originalKey) {
    await env.FILES.delete(previousOriginal.value).catch(() => undefined);
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

  const storageStart = Date.now();
  let storageOk = true;
  try {
    await env.FILES.head("__health_probe__");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.toLowerCase().includes("not found")) storageOk = false;
  }
  const storageLatency = Date.now() - storageStart;

  // Portfolio uploads: prove R2 accepts a write, reads it back and deletes it.
  const uploadStart = Date.now();
  let uploadsOk = false;
  let uploadsDetail = "Write probe failed";
  const probeKey = `health/probe-${crypto.randomUUID()}.txt`;
  try {
    await env.FILES.put(probeKey, "ok", { httpMetadata: { contentType: "text/plain" } });
    const written = await env.FILES.head(probeKey);
    await env.FILES.delete(probeKey);
    uploadsOk = Boolean(written);
    uploadsDetail = uploadsOk ? "Upload, read-back and delete verified" : "Wrote but could not read back";
  } catch (error) {
    uploadsDetail = `R2 write failed: ${error instanceof Error ? error.message.slice(0, 80) : "unknown"}`;
    await env.FILES.delete(probeKey).catch(() => undefined);
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
  const credentialsConfigured = isConfigured(env);

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
      detail: storageOk ? "R2 bucket reachable" : "R2 bucket unreachable",
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
    storage: { ok: storageOk },
    auth: { configured: credentialsConfigured, email: env.ADMIN_EMAIL?.trim() ?? null },
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
  const path = url.pathname;
  const method = request.method.toUpperCase();

  if (path === "/api/projects" && method === "GET") return publicProjects(env);
  if (path === "/api/artist" && method === "GET") return publicArtistPhoto(env);
  if (path === "/api/site/status" && method === "GET") return publicSiteStatus(env);

  if (path === `${ADMIN}/login` && method === "POST") return login(request, env);
  if (path === `${ADMIN}/session` && method === "GET") {
    const ok = await getSession(env, request);
    if (!ok) return fail("Unauthorized", 401);
    return json({ authenticated: true, email: env.ADMIN_EMAIL ?? null });
  }
  if (path === `${ADMIN}/logout` && method === "POST") return logout(request, env);

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

  const projectMatch = path.match(/^\/api\/admin\/projects\/([^/]+)$/);
  if (projectMatch) {
    const id = decodeURIComponent(projectMatch[1]);
    if (method === "PATCH" || method === "PUT") return updateProject(request, env, id);
    if (method === "DELETE") return deleteProject(env, id);
  }

  if (path.startsWith(`${ADMIN}/media/`)) {
    const key = decodeURIComponent(path.slice(`${ADMIN}/media/`.length));
    if (!key) return fail("Missing media key.", 400);
    if (method === "GET") return serveObject(env, key, true);
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
      return await handleApi(request, env, url);
    }

    if (url.pathname.startsWith("/media/")) {
      const key = decodeURIComponent(url.pathname.slice("/media/".length));
      if (!key) return new Response("Not found", { status: 404 });
      if (key.startsWith("artist/")) return await serveActiveArtistPhoto(env, key);
      return await publicMedia(env, key);
    }

    return fail("Not found", 404);
  } catch (error) {
    console.error("Unhandled request error", error);
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
