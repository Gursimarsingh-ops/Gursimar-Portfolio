/**
 * Validation for externally hosted videos. Only providers that can actually be
 * embedded are accepted; an unsupported link is rejected instead of being
 * stored as something that claims to be playable.
 */

export type LinkProvider = "youtube" | "vimeo" | "file";

export interface ParsedVideoLink {
  provider: LinkProvider;
  /** Canonical URL stored in D1 (never credentials or tracking noise). */
  normalized: string;
  id: string | null;
}

const YOUTUBE_ID = /^[A-Za-z0-9_-]{6,20}$/;

export function parseVideoSourceUrl(raw: string): { provider: LinkProvider | "unknown"; normalized: string; id: string | null } {
  const value = raw.trim();
  if (!value || value.length > 600) return { provider: "unknown", normalized: "", id: null };

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return { provider: "unknown", normalized: "", id: null };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { provider: "unknown", normalized: "", id: null };
  }

  const host = url.hostname.replace(/^www\./, "").toLowerCase();

  if (host === "youtu.be") {
    const id = url.pathname.split("/").filter(Boolean)[0] ?? "";
    if (YOUTUBE_ID.test(id)) return youtube(id);
  }

  if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
    const param = url.searchParams.get("v");
    if (param && YOUTUBE_ID.test(param)) return youtube(param);
    const parts = url.pathname.split("/").filter(Boolean);
    const marker = parts.findIndex((part) => part === "embed" || part === "shorts" || part === "live");
    const id = marker >= 0 ? parts[marker + 1] : "";
    if (id && YOUTUBE_ID.test(id)) return youtube(id);
  }

  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const part = [...url.pathname.split("/")].reverse().find((segment) => /^\d{5,12}$/.test(segment));
    if (part) {
      return { provider: "vimeo", normalized: `https://vimeo.com/${part}`, id: part };
    }
  }

  if (/\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(url.pathname + url.search)) {
    return { provider: "file", normalized: url.toString(), id: null };
  }

  return { provider: "unknown", normalized: "", id: null };
}

function youtube(id: string): ParsedVideoLink {
  return { provider: "youtube", normalized: `https://www.youtube.com/watch?v=${id}`, id };
}
