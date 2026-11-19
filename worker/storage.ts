/**
 * Server-side object storage for portfolio media.
 *
 * Backblaze B2 is the only store, accessed through its S3-compatible API with
 * SigV4 request signing done here in the Worker (Web Crypto only, no SDK, no
 * Cloudflare R2 binding). Cloudflare does not need R2 enabled to deploy this
 * project.
 *
 * Credentials never leave the server: the browser only ever talks to
 * /api/admin/media/* and /media/*, both served by this Worker.
 */

export interface StorageEnv {
  B2_APPLICATION_KEY_ID?: string;
  B2_APPLICATION_KEY?: string;
  B2_BUCKET_NAME?: string;
  B2_REGION?: string;
  B2_ENDPOINT?: string;
}

export interface StoredObject {
  size: number;
  contentType: string | null;
  sha256: string | null;
  originalName: string | null;
  etag: string | null;
}

export interface ReadResult {
  body: ReadableStream<Uint8Array> | null;
  status: number;
  contentType: string | null;
  contentLength: string | null;
  contentRange: string | null;
  etag: string | null;
  lastModified: string | null;
}

export interface ObjectSummary {
  key: string;
  size: number;
  lastModified: string | null;
  etag: string | null;
}

export interface ListResult {
  objects: ObjectSummary[];
  cursor: string | null;
}

export interface MultipartUpload {
  key: string;
  uploadId: string;
  initiated: string | null;
}

export type StorageProvider = "backblaze-b2" | "none";

const EMPTY_SHA256 = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

type B2Config = {
  endpoint: string;
  bucket: string;
  region: string;
  keyId: string;
  secret: string;
};

/** The 5 MB B2 minimum is respected with headroom; Workers accept these bodies. */
export const PART_SIZE = 8 * 1024 * 1024;
export const MAX_PARTS = 10_000;

export class StorageError extends Error {
  status: number;

  constructor(message: string, status = 502) {
    super(message);
    this.name = "StorageError";
    this.status = status;
  }
}

/* ------------------------------- signatures ------------------------------- */

function toHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256Hex(input: ArrayBuffer | string): Promise<string> {
  const data = typeof input === "string" ? new TextEncoder().encode(input) : input;
  return toHex(await crypto.subtle.digest("SHA-256", data));
}

async function hmac(key: ArrayBuffer, data: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(data));
}

/** RFC 3986 encoding. `keepSlash` preserves object-key separators. */
function encodeRfc3986(value: string, keepSlash = false): string {
  const bytes = new TextEncoder().encode(value);
  let out = "";
  for (const byte of bytes) {
    const char = String.fromCharCode(byte);
    const unreserved =
      (byte >= 0x41 && byte <= 0x5a) ||
      (byte >= 0x61 && byte <= 0x7a) ||
      (byte >= 0x30 && byte <= 0x39) ||
      char === "-" ||
      char === "_" ||
      char === "." ||
      char === "~";
    if (unreserved || (keepSlash && byte === 0x2f)) out += char;
    else out += `%${byte.toString(16).toUpperCase().padStart(2, "0")}`;
  }
  return out;
}

function deriveRegion(endpoint: string): string {
  const host = endpoint.replace(/^https?:\/\//i, "").split(/[/:]/)[0];
  const match = host.match(/s3\.([a-z0-9-]+)\.backblazeb2\.com$/i);
  return match ? match[1] : "us-east-005";
}

export function b2Config(env: StorageEnv): B2Config | null {
  const endpoint = (env.B2_ENDPOINT ?? "").trim().replace(/\/+$/, "");
  const bucket = (env.B2_BUCKET_NAME ?? "").trim();
  const keyId = (env.B2_APPLICATION_KEY_ID ?? "").trim();
  const secret = (env.B2_APPLICATION_KEY ?? "").trim();
  if (!endpoint || !bucket || !keyId || !secret) return null;
  return {
    endpoint,
    bucket,
    region: (env.B2_REGION ?? "").trim() || deriveRegion(endpoint),
    keyId,
    secret,
  };
}

export function storageProvider(env: StorageEnv): StorageProvider {
  return b2Config(env) ? "backblaze-b2" : "none";
}

export function storageConfigured(env: StorageEnv): boolean {
  return storageProvider(env) !== "none";
}

type RequestOptions = {
  method: string;
  key?: string;
  query?: [string, string][];
  headers?: Record<string, string>;
  body?: ArrayBuffer | string;
};

/**
 * Signs and sends one S3 request. Every header given here is signed, which is
 * stricter than required and keeps B2 from ignoring a content type or range.
 */
async function b2Fetch(config: B2Config, options: RequestOptions): Promise<Response> {
  const path =
    options.key === undefined
      ? `/${encodeRfc3986(config.bucket)}`
      : `/${encodeRfc3986(config.bucket)}/${encodeRfc3986(options.key, true)}`;

  const query = (options.query ?? []).slice().sort((a, b) => {
    const left = `${encodeRfc3986(a[0])}=${encodeRfc3986(a[1])}`;
    const right = `${encodeRfc3986(b[0])}=${encodeRfc3986(b[1])}`;
    return left < right ? -1 : left > right ? 1 : 0;
  });
  const canonicalQuery = query.map(([k, v]) => `${encodeRfc3986(k)}=${encodeRfc3986(v)}`).join("&");

  const payloadHash = options.body === undefined ? EMPTY_SHA256 : await sha256Hex(options.body);
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const url = new URL(config.endpoint + path);

  const allHeaders: Record<string, string> = {
    ...(options.headers ?? {}),
    host: url.host,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
  };

  const signedNames = Object.keys(allHeaders)
    .map((name) => name.toLowerCase())
    .sort();
  const canonicalHeaders = signedNames
    .map((name) => {
      const original = Object.keys(allHeaders).find((key) => key.toLowerCase() === name) as string;
      return `${name}:${allHeaders[original].trim().replace(/\s+/g, " ")}\n`;
    })
    .join("");
  const signedHeaders = signedNames.join(";");

  const canonicalRequest = [
    options.method.toUpperCase(),
    path,
    canonicalQuery,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const scope = `${dateStamp}/${config.region}/s3/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    scope,
    await sha256Hex(canonicalRequest),
  ].join("\n");

  let signingKey = await hmac(new TextEncoder().encode(`AWS4${config.secret}`).buffer as ArrayBuffer, dateStamp);
  signingKey = await hmac(signingKey, config.region);
  signingKey = await hmac(signingKey, "s3");
  signingKey = await hmac(signingKey, "aws4_request");
  const signature = toHex(await hmac(signingKey, stringToSign));

  const headers = new Headers();
  for (const [name, value] of Object.entries(allHeaders)) {
    if (name.toLowerCase() === "host") continue;
    headers.set(name, value);
  }
  headers.set(
    "Authorization",
    `AWS4-HMAC-SHA256 Credential=${config.keyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`
  );

  return fetch(`${config.endpoint}${path}${canonicalQuery ? `?${canonicalQuery}` : ""}`, {
    method: options.method,
    headers,
    body: options.body,
  });
}

async function b2Failure(response: Response, action: string): Promise<StorageError> {
  let detail = "";
  try {
    detail = (await response.text()).slice(0, 240);
  } catch {
    detail = "";
  }
  const hint =
    response.status === 401 || response.status === 403
      ? "Backblaze rejected the application key (check B2_APPLICATION_KEY_ID / B2_APPLICATION_KEY and its bucket capabilities)."
      : response.status === 404
        ? "The bucket or object was not found."
        : detail || response.statusText;
  return new StorageError(`${action} failed (${response.status}). ${hint}`, response.status);
}

/* ---------------------------------- XML ----------------------------------- */

function decodeXml(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/&amp;/g, "&");
}

function xmlValue(xml: string, tag: string): string | null {
  const match = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
  return match ? decodeXml(match[1]) : null;
}

function xmlBlocks(xml: string, tag: string): string[] {
  const blocks: string[] = [];
  const pattern = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "g");
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(xml))) blocks.push(match[1]);
  return blocks;
}

function xmlEscape(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/* ---------------------------------- reads --------------------------------- */

export async function headObject(env: StorageEnv, key: string): Promise<StoredObject | null> {
  const config = b2Config(env);
  if (!config) return null;

  const response = await b2Fetch(config, { method: "HEAD", key });
  if (response.ok) {
    const length = Number(response.headers.get("content-length") ?? "0");
    return {
      size: Number.isFinite(length) ? length : 0,
      contentType: response.headers.get("content-type"),
      sha256: response.headers.get("x-amz-meta-sha256"),
      originalName: response.headers.get("x-amz-meta-original-name"),
      etag: response.headers.get("etag"),
    };
  }
  if (response.status === 404) return null;
  throw await b2Failure(response, "Backblaze B2 metadata request");
}

export async function readObject(
  env: StorageEnv,
  key: string,
  range: string | null = null
): Promise<ReadResult | null> {
  const config = b2Config(env);
  if (!config) return null;

  const response = await b2Fetch(config, {
    method: "GET",
    key,
    headers: range ? { range } : {},
  });
  if (response.ok || response.status === 206) {
    return {
      body: response.body,
      status: response.status,
      contentType: response.headers.get("content-type"),
      contentLength: response.headers.get("content-length"),
      contentRange: response.headers.get("content-range"),
      etag: response.headers.get("etag"),
      lastModified: response.headers.get("last-modified"),
    };
  }
  if (response.status === 404) return null;
  throw await b2Failure(response, "Backblaze B2 download");
}

/** Reads a whole object into memory (attachments, AI image input, PDF text). */
export async function readObjectBytes(env: StorageEnv, key: string): Promise<ArrayBuffer | null> {
  const object = await readObject(env, key);
  if (!object?.body) return null;
  return new Response(object.body).arrayBuffer();
}

/* --------------------------------- writes --------------------------------- */

function asciiHeader(value: string): string {
  return value.replace(/[^\x20-\x7e]/g, "_").slice(0, 200);
}

export async function putObject(
  env: StorageEnv,
  key: string,
  body: ArrayBuffer,
  meta: { contentType: string; sha256?: string | null; originalName?: string | null }
): Promise<void> {
  const config = b2Config(env);
  if (!config) throw new StorageError("File storage is not configured on this deployment.", 503);

  const headers: Record<string, string> = { "content-type": meta.contentType || "application/octet-stream" };
  if (meta.sha256) headers["x-amz-meta-sha256"] = meta.sha256;
  if (meta.originalName) headers["x-amz-meta-original-name"] = asciiHeader(meta.originalName);

  const response = await b2Fetch(config, { method: "PUT", key, headers, body });
  if (!response.ok) throw await b2Failure(response, "Backblaze B2 upload");
}

export async function deleteObject(env: StorageEnv, keys: string[]): Promise<void> {
  const config = b2Config(env);
  if (!config) return;
  for (const key of keys) {
    const response = await b2Fetch(config, { method: "DELETE", key });
    if (!response.ok && response.status !== 404) throw await b2Failure(response, "Backblaze B2 delete");
  }
}

export async function listObjects(
  env: StorageEnv,
  options: { prefix?: string; cursor?: string | null; limit?: number } = {}
): Promise<ListResult> {
  const limit = Math.min(Math.max(options.limit ?? 100, 1), 1000);
  const config = b2Config(env);
  if (!config) return { objects: [], cursor: null };

  const query: [string, string][] = [
    ["list-type", "2"],
    ["max-keys", String(limit)],
  ];
  if (options.prefix) query.push(["prefix", options.prefix]);
  if (options.cursor) query.push(["continuation-token", options.cursor]);

  const response = await b2Fetch(config, { method: "GET", query });
  if (!response.ok) throw await b2Failure(response, "Backblaze B2 listing");
  const xml = await response.text();

  return {
    objects: xmlBlocks(xml, "Contents").map((block) => ({
      key: decodeXml(xmlValue(block, "Key") ?? ""),
      size: Number(xmlValue(block, "Size") ?? "0"),
      lastModified: xmlValue(block, "LastModified"),
      etag: xmlValue(block, "ETag"),
    })),
    cursor: xmlValue(xml, "IsTruncated") === "true" ? xmlValue(xml, "NextContinuationToken") : null,
  };
}

/* -------------------------------- multipart ------------------------------- */

function requireB2(env: StorageEnv): B2Config {
  const config = b2Config(env);
  if (!config) {
    throw new StorageError(
      "Large multipart uploads require Backblaze B2. Set B2_APPLICATION_KEY_ID, B2_APPLICATION_KEY, B2_BUCKET_NAME, B2_REGION and B2_ENDPOINT on this deployment.",
      503
    );
  }
  return config;
}

export async function createMultipartUpload(
  env: StorageEnv,
  key: string,
  contentType: string
): Promise<string> {
  const response = await b2Fetch(requireB2(env), {
    method: "POST",
    key,
    query: [["uploads", ""]],
    headers: { "content-type": contentType || "application/octet-stream" },
  });
  if (!response.ok) throw await b2Failure(response, "Backblaze B2 multipart start");
  const uploadId = xmlValue(await response.text(), "UploadId");
  if (!uploadId) throw new StorageError("Backblaze B2 did not return an upload id.", 502);
  return uploadId;
}

export async function uploadPart(
  env: StorageEnv,
  key: string,
  uploadId: string,
  partNumber: number,
  body: ArrayBuffer
): Promise<string> {
  const response = await b2Fetch(requireB2(env), {
    method: "PUT",
    key,
    query: [
      ["partNumber", String(partNumber)],
      ["uploadId", uploadId],
    ],
    body,
  });
  if (!response.ok) throw await b2Failure(response, `Backblaze B2 upload of part ${partNumber}`);
  const etag = response.headers.get("etag");
  if (!etag) throw new StorageError(`Backblaze B2 did not return an ETag for part ${partNumber}.`, 502);
  return etag;
}

export async function completeMultipartUpload(
  env: StorageEnv,
  key: string,
  uploadId: string,
  parts: { partNumber: number; etag: string }[]
): Promise<void> {
  const body =
    "<CompleteMultipartUpload>" +
    parts
      .slice()
      .sort((a, b) => a.partNumber - b.partNumber)
      .map(
        (part) =>
          `<Part><PartNumber>${part.partNumber}</PartNumber><ETag>${xmlEscape(part.etag)}</ETag></Part>`
      )
      .join("") +
    "</CompleteMultipartUpload>";

  const response = await b2Fetch(requireB2(env), {
    method: "POST",
    key,
    query: [["uploadId", uploadId]],
    headers: { "content-type": "application/xml" },
    body,
  });
  if (!response.ok) throw await b2Failure(response, "Backblaze B2 multipart completion");
  // B2 can return HTTP 200 with an <Error> body for a failed completion.
  const xml = await response.text();
  if (/<Error>/i.test(xml)) {
    throw new StorageError(
      `Backblaze B2 could not assemble the file: ${xmlValue(xml, "Message") ?? "unknown error"}`,
      502
    );
  }
}

export async function abortMultipartUpload(
  env: StorageEnv,
  key: string,
  uploadId: string
): Promise<void> {
  const response = await b2Fetch(requireB2(env), {
    method: "DELETE",
    key,
    query: [["uploadId", uploadId]],
  });
  if (!response.ok && response.status !== 404) throw await b2Failure(response, "Backblaze B2 multipart abort");
}

export async function listMultipartUploads(
  env: StorageEnv,
  prefix?: string
): Promise<MultipartUpload[]> {
  const query: [string, string][] = [["uploads", ""]];
  if (prefix) query.push(["prefix", prefix]);
  const response = await b2Fetch(requireB2(env), { method: "GET", query });
  if (!response.ok) throw await b2Failure(response, "Backblaze B2 multipart listing");
  const xml = await response.text();
  return xmlBlocks(xml, "Upload").map((block) => ({
    key: decodeXml(xmlValue(block, "Key") ?? ""),
    uploadId: xmlValue(block, "UploadId") ?? "",
    initiated: xmlValue(block, "Initiated"),
  }));
}

/** Aborts multipart uploads that were started but never completed. */
export async function cleanupMultipartUploads(
  env: StorageEnv,
  olderThanHours = 24
): Promise<{ aborted: number; failed: number }> {
  const uploads = await listMultipartUploads(env);
  const cutoff = Date.now() - olderThanHours * 60 * 60 * 1000;
  let aborted = 0;
  let failed = 0;
  for (const upload of uploads) {
    const started = upload.initiated ? Date.parse(upload.initiated) : Number.NaN;
    if (Number.isFinite(started) && started > cutoff) continue;
    try {
      await abortMultipartUpload(env, upload.key, upload.uploadId);
      aborted += 1;
    } catch {
      failed += 1;
    }
  }
  return { aborted, failed };
}
