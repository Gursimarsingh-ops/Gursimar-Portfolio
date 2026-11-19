export type ProjectKind = "graphic" | "video";
export type ProjectStatus = "published" | "draft";

export interface AdminProject {
  id: string;
  kind: ProjectKind;
  title: string;
  description: string;
  category: string;
  status: ProjectStatus;
  assetUrl: string;
  thumbUrl: string | null;
  assetType: string;
  assetSize: number;
  sortOrder: number;
  displayRatio: string;
  assetWidth: number | null;
  assetHeight: number | null;
  durationSeconds: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminStats {
  counts: {
    graphics: number;
    videos: number;
    total: number;
    published: number;
    drafts: number;
    assets: number;
    bytes: number;
  };
  recent: AdminProject[];
}

export interface StorageStatus {
  configured: boolean;
  email: string | null;
  database: { ok: boolean };
  storage: {
    ok: boolean;
    objects: number;
    bytes: number;
    /** "backblaze-b2" when the private B2 bucket is wired up. */
    provider?: "backblaze-b2" | "r2" | "none";
    bucket?: string | null;
    region?: string | null;
  };
  limits: {
    imageBytes: number;
    videoBytes: number;
    videoMultipartBytes?: number;
    thumbnailBytes: number;
    imageTypes: string[];
    videoTypes: string[];
  };
}

export type RequestStatus = "new" | "reviewed" | "discussion" | "accepted" | "rejected";

export interface ClientRequest {
  id: string;
  name: string;
  email: string;
  company: string;
  discord: string;
  category: string;
  budget: string;
  description: string;
  extra: string;
  deadline: string;
  references: string;
  status: RequestStatus;
  adminNotes: string;
  createdAt: string;
  updatedAt: string;
  fileCount: number;
}

export interface RequestFile {
  id: string;
  name: string;
  type: string;
  size: number;
  createdAt: string;
}

export interface RequestDetail {
  request: ClientRequest;
  files: RequestFile[];
  history: { id: string; category: string; status: RequestStatus; budget: string; created_at: string }[];
}

export interface AdminOverview {
  requests: { total: number; new: number; reviewed: number; discussion: number; accepted: number; rejected: number };
  conversations: { open: number; unread: number; total: number };
  projects: { published: number; total: number };
  availability: { online: boolean; updatedAt: string | null };
  ai: { enabled: boolean; configured: boolean; provider: string; model: string };
  recentRequests: ClientRequest[];
}

export interface ConversationSummary {
  id: string;
  name: string;
  email: string;
  status: "open" | "resolved";
  unread: number;
  messageCount: number;
  lastMessage: string | null;
  lastSender: "visitor" | "admin" | null;
  lastMessageAt: string | null;
  createdAt: string;
}

export interface ConversationMessage {
  id: string;
  sender: "visitor" | "admin";
  body: string;
  createdAt: string;
}

export interface ConversationDetail {
  conversation: { id: string; name: string; email: string; status: "open" | "resolved"; createdAt: string; lastMessageAt: string | null };
  messages: ConversationMessage[];
}

export interface ClientRecord {
  email: string;
  name: string;
  requestCount: number;
  newCount: number;
  lastRequestAt: string;
  conversationCount: number;
  lastConversationAt: string | null;
}

export interface AiSettingsResponse {
  settings: {
    enabled: boolean;
    model: string;
    provider: string;
    apiUrl: string;
    knowledge: string;
    updatedAt: string | null;
    lastTestAt: string | null;
    lastSuccessAt: string | null;
    lastError: string | null;
    lastLatencyMs: number | null;
  };
  configured: boolean;
  keyHint: string | null;
  keySource: "dashboard" | "environment" | "none";
  model: string;
  vision: boolean;
  defaultModel: string;
  defaultApiUrl: string;
  defaultProvider: string;
  envModel: string | null;
  providerEnv: string | null;
}

export interface AiTestResult {
  ok: boolean;
  status: number | null;
  latencyMs: number;
  endpoint: string;
  model: string;
  message: string;
  reply?: string;
  diagnostics?: string;
}

export interface SecurityInfo {
  administrator: { email: string | null; configured: boolean };
  sessions: { active: number; recent: { createdAt: string; expiresAt: string }[] };
  ai: { configured: boolean; provider: string };
  controls: {
    sessionTtlDays: number;
    loginAttempts: string;
    originCheck: boolean;
    httpOnlyCookie: boolean;
    passwordHash: string;
  };
}

export type HealthStatus = "operational" | "warning" | "failure";

export interface HealthService {
  id: "frontend" | "backend" | "auth" | "database" | "storage" | "ai" | string;
  label: string;
  status: HealthStatus;
  detail: string;
  latencyMs: number | null;
  verified: boolean;
}

export interface HealthInfo {
  checkedAt: string;
  uptimeSeconds: number;
  database: { ok: boolean; latencyMs: number; objects: number; bytes: number };
  storage: { ok: boolean; provider?: string; bucket?: string | null };
  auth: { configured: boolean; email: string | null };
  maintenance: { enabled: boolean; updatedAt: string | null };
  edge: { colo: string | null; country: string | null };
  limits: { imageBytes: number; videoBytes: number; thumbnailBytes: number };
  services: HealthService[];
  summary: {
    operational: number;
    warnings: number;
    failures: number;
    healthy: boolean;
    label: string;
  };
}

export interface UploadResult {
  key: string;
  type: string;
  size: number;
  hash: string;
  url: string;
  provider?: string;
}

export interface MultipartStart {
  key: string;
  uploadId: string;
  partSize: number;
  partCount: number;
  type: string;
  provider: string;
}

export interface MediaObject {
  key: string;
  size: number;
  lastModified: string | null;
  etag: string | null;
}

export interface ArtistPhoto {
  key: string;
  url: string;
  type: string;
  size: number;
  updatedAt: string;
}

export interface ArtistOriginal {
  key: string;
  url: string;
  updatedAt: string;
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function unauthorized(): void {
  window.dispatchEvent(new Event("admin:unauthorized"));
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });

  const text = await response.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!response.ok) {
    if (response.status === 401 && !path.endsWith("/login")) unauthorized();
    const message =
      data && typeof data === "object" && "error" in data && typeof (data as { error: unknown }).error === "string"
        ? (data as { error: string }).error
        : `Request failed (${response.status}).`;
    throw new ApiError(message, response.status);
  }

  return data as T;
}

export const api = {
  login: (email: string, password: string) =>
    request<{ authenticated: boolean; email: string }>("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  session: () => request<{ authenticated: boolean; email: string | null }>("/api/admin/session"),

  logout: () => request<{ ok: boolean }>("/api/admin/logout", { method: "POST" }),

  stats: () => request<AdminStats>("/api/admin/stats"),

  status: () => request<StorageStatus>("/api/admin/status"),

  projects: (kind?: ProjectKind) =>
    request<{ projects: AdminProject[] }>(
      `/api/admin/projects${kind ? `?kind=${encodeURIComponent(kind)}` : ""}`
    ),

  createProject: (payload: {
    kind: ProjectKind;
    title: string;
    description: string;
    category: string;
    assetKey: string;
    thumbKey?: string | null;
    status?: ProjectStatus;
    displayRatio?: string;
    assetWidth?: number | null;
    assetHeight?: number | null;
    durationSeconds?: number | null;
  }) =>
    request<{ project: AdminProject }>("/api/admin/projects", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateProject: (
    id: string,
    payload: Partial<{
      title: string;
      description: string;
      category: string;
      status: ProjectStatus;
      thumbKey: string | null;
      assetKey: string;
      displayRatio: string;
      assetWidth: number | null;
      assetHeight: number | null;
      durationSeconds: number | null;
    }>
  ) =>
    request<{ project: AdminProject }>(`/api/admin/projects/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  reorderProjects: (ids: string[]) =>
    request<{ ok: boolean; order: string[] }>("/api/admin/projects/reorder", {
      method: "POST",
      body: JSON.stringify({ ids }),
    }),

  deleteProject: (id: string) =>
    request<{ ok: boolean }>(`/api/admin/projects/${encodeURIComponent(id)}`, { method: "DELETE" }),

  deleteUpload: (key: string) =>
    request<{ ok: boolean }>(`/api/admin/media/${encodeURIComponent(key)}`, { method: "DELETE" }),

  overview: () => request<AdminOverview>("/api/admin/overview"),

  requests: (params: { search?: string; status?: string } = {}) => {
    const query = new URLSearchParams();
    if (params.search) query.set("search", params.search);
    if (params.status) query.set("status", params.status);
    const suffix = query.toString();
    return request<{ requests: ClientRequest[] }>(`/api/admin/requests${suffix ? `?${suffix}` : ""}`);
  },

  requestDetail: (id: string) =>
    request<RequestDetail>(`/api/admin/requests/${encodeURIComponent(id)}`),

  updateRequest: (id: string, payload: { status?: RequestStatus; adminNotes?: string }) =>
    request<{ request: ClientRequest }>(`/api/admin/requests/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  deleteRequest: (id: string) =>
    request<{ ok: boolean }>(`/api/admin/requests/${encodeURIComponent(id)}`, { method: "DELETE" }),

  clients: () => request<{ clients: ClientRecord[] }>("/api/admin/clients"),

  conversations: () =>
    request<{ conversations: ConversationSummary[]; availability: { online: boolean; updatedAt: string | null } }>(
      "/api/admin/conversations"
    ),

  conversation: (id: string) =>
    request<ConversationDetail>(`/api/admin/conversations/${encodeURIComponent(id)}`),

  replyConversation: (id: string, body: string) =>
    request<{ message: ConversationMessage }>(`/api/admin/conversations/${encodeURIComponent(id)}/messages`, {
      method: "POST",
      body: JSON.stringify({ body }),
    }),

  setConversationStatus: (id: string, status: "open" | "resolved") =>
    request<{ ok: boolean; status: string }>(`/api/admin/conversations/${encodeURIComponent(id)}/status`, {
      method: "POST",
      body: JSON.stringify({ status }),
    }),

  availability: () =>
    request<{ online: boolean; updatedAt: string | null }>("/api/admin/availability"),

  setAvailability: (online: boolean) =>
    request<{ online: boolean; updatedAt: string | null }>("/api/admin/availability", {
      method: "POST",
      body: JSON.stringify({ online }),
    }),

  aiSettings: () => request<AiSettingsResponse>("/api/admin/ai-settings"),

  saveAiSettings: (payload: {
    enabled?: boolean;
    model?: string;
    provider?: string;
    apiUrl?: string;
    apiKey?: string;
    clearApiKey?: boolean;
    knowledge?: string;
  }) =>
    request<AiSettingsResponse>("/api/admin/ai-settings", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  testAiConnection: (payload: { apiKey?: string; apiUrl?: string; model?: string }) =>
    request<AiTestResult>("/api/admin/ai-settings/test", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  health: () => request<HealthInfo>("/api/admin/health"),

  maintenance: () =>
    request<{ enabled: boolean; updatedAt: string | null }>("/api/admin/maintenance"),

  setMaintenance: (enabled: boolean) =>
    request<{ enabled: boolean; updatedAt: string | null }>("/api/admin/maintenance", {
      method: "POST",
      body: JSON.stringify({ enabled }),
    }),

  security: () => request<SecurityInfo>("/api/admin/security"),

  revokeSessions: (scope: "others" | "all") =>
    request<{ ok: boolean; scope: string; revoked?: number; note?: string }>("/api/admin/security/revoke", {
      method: "POST",
      body: JSON.stringify({ scope }),
    }),

  artistPhoto: () =>
    request<{ photo: ArtistPhoto | null; original: ArtistOriginal | null; warning?: string }>("/api/admin/artist"),

  setArtistPhoto: (assetKey: string, originalKey?: string) =>
    request<{ photo: ArtistPhoto; original: ArtistOriginal | null }>("/api/admin/artist", {
      method: "POST",
      body: JSON.stringify({ assetKey, originalKey }),
    }),

  clearArtistPhoto: () => request<{ ok: boolean }>("/api/admin/artist", { method: "DELETE" }),

  /** Stored objects in the private B2 bucket. */
  listMedia: (prefix?: string, cursor?: string | null) => {
    const query = new URLSearchParams();
    if (prefix) query.set("prefix", prefix);
    if (cursor) query.set("cursor", cursor);
    const suffix = query.toString();
    return request<{
      objects: MediaObject[];
      cursor: string | null;
      provider: string;
      bucket: string | null;
    }>(`/api/admin/media/list${suffix ? `?${suffix}` : ""}`);
  },

  /** Size, content type, checksum and project usage for one stored object. */
  mediaInfo: (key: string) =>
    request<{
      key: string;
      exists: boolean;
      size?: number;
      contentType?: string | null;
      sha256?: string | null;
      provider: string;
      project?: { id: string; title: string } | null;
    }>(`/api/admin/media/info?key=${encodeURIComponent(key)}`),

  /** Incomplete multipart uploads left on the bucket. */
  incompleteUploads: () =>
    request<{ uploads: { key: string; uploadId: string; initiated: string | null }[]; provider: string }>(
      "/api/admin/media/multipart/uploads"
    ),

  /** Abort multipart uploads that were started but never finished. */
  cleanupUploads: (olderThanHours = 24) =>
    request<{ aborted: number; failed: number; olderThanHours: number }>(
      "/api/admin/media/multipart/cleanup",
      { method: "POST", body: JSON.stringify({ olderThanHours }) }
    ),
};

type UploadKind = ProjectKind | "thumbnail" | "artist" | "original";

/** Above this size an upload is split into B2 multipart parts. */
export const MULTIPART_THRESHOLD = 8 * 1024 * 1024;
/** Parts are loaded in parallel; kept small so retries stay cheap. */
const PART_CONCURRENCY = 3;
const PART_ATTEMPTS = 3;
const SINGLE_REQUEST_VIDEO_LIMIT = 90 * 1024 * 1024;

function errorFrom(xhr: XMLHttpRequest): ApiError {
  let data: unknown = null;
  try {
    data = JSON.parse(xhr.responseText);
  } catch {
    data = null;
  }
  if (xhr.status === 401) unauthorized();
  const message =
    data && typeof data === "object" && "error" in data && typeof (data as { error: unknown }).error === "string"
      ? (data as { error: string }).error
      : `Upload failed (${xhr.status}).`;
  return new ApiError(message, xhr.status);
}

/** Single-request upload with real progress events (fetch cannot report upload progress). */
function uploadSingle(
  file: File,
  kind: UploadKind,
  onProgress: (percent: number) => void
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/admin/upload");
    xhr.withCredentials = true;
    xhr.setRequestHeader("Accept", "application/json");
    xhr.timeout = 10 * 60 * 1000;

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };

    xhr.onload = () => {
      let data: unknown = null;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        data = null;
      }
      if (xhr.status >= 200 && xhr.status < 300 && data) {
        resolve(data as UploadResult);
        return;
      }
      reject(errorFrom(xhr));
    };

    xhr.onerror = () => reject(new ApiError("Network error while uploading.", 0));
    xhr.ontimeout = () => reject(new ApiError("Upload timed out.", 0));

    const form = new FormData();
    form.append("kind", kind);
    form.append("file", file);
    xhr.send(form);
  });
}

function putPart(
  url: string,
  blob: Blob,
  onLoaded: (loaded: number) => void
): Promise<{ partNumber: number; etag: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.withCredentials = true;
    xhr.setRequestHeader("Accept", "application/json");
    xhr.setRequestHeader("Content-Type", "application/octet-stream");
    xhr.timeout = 10 * 60 * 1000;

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onLoaded(event.loaded);
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText) as { partNumber: number; etag: string };
          if (typeof data?.etag === "string" && typeof data?.partNumber === "number") {
            resolve(data);
            return;
          }
        } catch {
          /* fall through to the error below */
        }
        reject(new ApiError("The server returned an unexpected upload-part response.", xhr.status));
        return;
      }
      reject(errorFrom(xhr));
    };

    xhr.onerror = () => reject(new ApiError("Network error while uploading a part.", 0));
    xhr.ontimeout = () => reject(new ApiError("Upload part timed out.", 0));
    xhr.send(blob);
  });
}

/**
 * Large uploads go straight to the private B2 bucket in parts through the
 * Worker: the browser never holds credentials, no request is large enough to
 * hit Cloudflare's body limit, progress is real, and failed parts retry.
 */
async function uploadMultipart(
  file: File,
  kind: UploadKind,
  onProgress: (percent: number) => void
): Promise<UploadResult> {
  const start = await request<MultipartStart>("/api/admin/media/multipart/start", {
    method: "POST",
    body: JSON.stringify({ kind, filename: file.name, type: file.type, size: file.size }),
  });

  const loaded = new Map<number, number>();
  const report = () => {
    let total = 0;
    loaded.forEach((value) => {
      total += value;
    });
    onProgress(Math.min(99, Math.round((total / file.size) * 100)));
  };

  const completed: { partNumber: number; etag: string }[] = [];
  let failure: unknown = null;
  let next = 0;

  const worker = async () => {
    for (;;) {
      if (failure) return;
      const index = next;
      next += 1;
      if (index >= start.partCount) return;

      const partNumber = index + 1;
      const from = index * start.partSize;
      const blob = file.slice(from, Math.min(from + start.partSize, file.size));
      const url =
        "/api/admin/media/multipart/part" +
        `?key=${encodeURIComponent(start.key)}` +
        `&uploadId=${encodeURIComponent(start.uploadId)}` +
        `&partNumber=${partNumber}`;

      for (let attempt = 1; ; attempt += 1) {
        try {
          const result = await putPart(url, blob, (bytes) => {
            loaded.set(partNumber, bytes);
            report();
          });
          loaded.set(partNumber, blob.size);
          report();
          completed.push({ partNumber, etag: result.etag });
          break;
        } catch (error) {
          loaded.set(partNumber, 0);
          report();
          if (attempt >= PART_ATTEMPTS) {
            failure = error;
            return;
          }
          await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
        }
      }
    }
  };

  try {
    await Promise.all(
      Array.from({ length: Math.min(PART_CONCURRENCY, start.partCount) }, () => worker())
    );
    if (failure) throw failure;

    const result = await request<UploadResult>("/api/admin/media/multipart/complete", {
      method: "POST",
      body: JSON.stringify({
        key: start.key,
        uploadId: start.uploadId,
        contentType: start.type,
        parts: completed.sort((a, b) => a.partNumber - b.partNumber),
      }),
    });
    onProgress(100);
    return result;
  } catch (error) {
    // Never leave half-finished parts billing storage.
    await request<{ ok: boolean }>("/api/admin/media/multipart/abort", {
      method: "POST",
      body: JSON.stringify({ key: start.key, uploadId: start.uploadId }),
    }).catch(() => undefined);
    throw error;
  }
}

export async function uploadFile(
  file: File,
  kind: UploadKind,
  onProgress: (percent: number) => void
): Promise<UploadResult> {
  if (file.size > MULTIPART_THRESHOLD) {
    try {
      return await uploadMultipart(file, kind, onProgress);
    } catch (error) {
      // R2-only development can still take a single request up to 90 MB.
      if (error instanceof ApiError && error.status === 503 && file.size <= SINGLE_REQUEST_VIDEO_LIMIT) {
        return uploadSingle(file, kind, onProgress);
      }
      throw error;
    }
  }
  return uploadSingle(file, kind, onProgress);
}

export function formatBytes(bytes: number): string {
  if (!bytes) return "0 KB";
  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${value >= 10 || exponent === 0 ? Math.round(value) : value.toFixed(1)} ${units[exponent]}`;
}
