/** Public (unauthenticated) API used by the inquiry form, live chat and AI assistant. */

export class PublicApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "PublicApiError";
    this.status = status;
  }
}

async function parse(response: Response): Promise<unknown> {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

function errorMessage(data: unknown, fallback: string): string {
  return data && typeof data === "object" && "error" in data && typeof (data as { error: unknown }).error === "string"
    ? (data as { error: string }).error
    : fallback;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...init.headers,
      },
    });
  } catch {
    throw new PublicApiError("Network error. Please check your connection and try again.", 0);
  }

  const data = await parse(response);
  if (!response.ok) {
    throw new PublicApiError(errorMessage(data, `Request failed (${response.status}).`), response.status);
  }
  return data as T;
}

/** Multipart POST with real upload progress (fetch has no upload progress event). */
function upload<T>(path: string, form: FormData, onProgress?: (percent: number) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", path);
    xhr.withCredentials = true;
    xhr.setRequestHeader("Accept", "application/json");
    xhr.timeout = 10 * 60 * 1000;

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) onProgress(Math.round((event.loaded / event.total) * 100));
    };

    xhr.onload = () => {
      let data: unknown = null;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        data = null;
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(data as T);
        return;
      }
      reject(new PublicApiError(errorMessage(data, `Upload failed (${xhr.status}).`), xhr.status));
    };

    xhr.onerror = () => reject(new PublicApiError("Network error while uploading.", 0));
    xhr.ontimeout = () => reject(new PublicApiError("The upload timed out. Please try again.", 0));
    xhr.send(form);
  });
}

/* ------------------------------- availability ------------------------------ */

export interface Availability {
  online: boolean;
  updatedAt: string | null;
}

export function getAvailability(): Promise<Availability> {
  return request<Availability>("/api/availability");
}

/* -------------------------------- inquiries -------------------------------- */

export interface InquiryPayload {
  name: string;
  email: string;
  company?: string;
  discord?: string;
  category: string;
  budget: string;
  description: string;
  extra?: string;
  deadline?: string;
  references?: string;
}

export function submitInquiry(
  payload: InquiryPayload,
  files: File[],
  onProgress?: (percent: number) => void
): Promise<{ request: { id: string; createdAt: string } }> {
  if (files.length === 0) {
    return request<{ request: { id: string; createdAt: string } }>("/api/requests", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  const form = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (value) form.append(key, value);
  });
  files.forEach((file) => form.append("files", file));
  return upload<{ request: { id: string; createdAt: string } }>("/api/requests", form, onProgress);
}

/* -------------------------------- live chat -------------------------------- */

export type ChatSender = "visitor" | "admin";

export interface ChatMessage {
  id: string;
  sender: ChatSender;
  body: string;
  createdAt: string;
}

export interface ChatSession {
  id: string;
  token: string;
  name: string;
  email: string;
  status: "open" | "resolved";
  createdAt: string;
}

export function startChat(name: string, email: string): Promise<{ conversation: ChatSession }> {
  return request<{ conversation: ChatSession }>("/api/chat/start", {
    method: "POST",
    body: JSON.stringify({ name, email }),
  });
}

export function readChat(
  id: string,
  token: string
): Promise<{
  conversation: { id: string; name: string; email: string; status: "open" | "resolved"; createdAt: string };
  messages: ChatMessage[];
  availability: Availability;
}> {
  return request(`/api/chat/${encodeURIComponent(id)}?token=${encodeURIComponent(token)}`);
}

export function sendChatMessage(id: string, token: string, body: string): Promise<{ message: ChatMessage }> {
  return request<{ message: ChatMessage }>(`/api/chat/${encodeURIComponent(id)}/messages`, {
    method: "POST",
    body: JSON.stringify({ token, body }),
  });
}

/* ------------------------------- AI assistant ------------------------------ */

export interface AiStatus {
  enabled: boolean;
  configured: boolean;
  provider: string;
  model: string;
  /** Model used when the visitor has not chosen one. */
  defaultModel?: string;
  /** Models the administrator made public and that have answered a real test. */
  models?: { id: string; label: string }[];
  publicModelSelector?: boolean;
  vision?: boolean;
  assistantName?: string;
  welcomeMessage?: string;
  placeholder?: string;
  availability?: "online" | "away" | "offline";
  appearance?: {
    theme: "dark" | "light";
    accent: string;
    position: "left" | "right";
    welcomeAnimation: boolean;
    buttonLabel: string;
  };
  limits: { messageChars: number; files: number; imageBytes: number; totalBytes: number };
}

export interface AiAttachment {
  name: string;
  type: string;
  size: number;
}

export function getAiStatus(): Promise<AiStatus> {
  return request<AiStatus>("/api/ai/status");
}

export function askAssistant(
  threadId: string,
  message: string,
  files: File[],
  model?: string | null,
  onProgress?: (percent: number) => void
): Promise<{ threadId: string; reply: string; model?: string; attachments: AiAttachment[] }> {
  const form = new FormData();
  form.append("threadId", threadId);
  form.append("message", message);
  if (model) form.append("model", model);
  files.forEach((file) => form.append("files", file));
  return upload<{ threadId: string; reply: string; model?: string; attachments: AiAttachment[] }>(
    "/api/ai/chat",
    form,
    onProgress
  );
}

export interface AiHistoryMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  attachments: AiAttachment[];
  createdAt: string;
}

/** Server-side thread history, so reconnecting restores the conversation. */
export function getAiHistory(threadId: string): Promise<{ threadId: string; messages: AiHistoryMessage[] }> {
  return request(`/api/ai/thread/${encodeURIComponent(threadId)}`);
}

export function clearAiHistory(threadId: string): Promise<{ ok: boolean; threadId: string }> {
  return request(`/api/ai/thread/${encodeURIComponent(threadId)}`, { method: "DELETE" });
}

export function formatFileSize(bytes: number): string {
  if (!bytes) return "0 KB";
  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${value >= 10 || exponent === 0 ? Math.round(value) : value.toFixed(1)} ${units[exponent]}`;
}
