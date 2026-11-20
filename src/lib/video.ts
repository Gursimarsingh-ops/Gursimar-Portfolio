/**
 * External video links and thumbnail presentation shared by the dashboard and
 * the public LED screens. Unsupported URLs are reported, never played.
 */

export type VideoProvider = "youtube" | "vimeo" | "file" | "unknown";

export interface VideoSource {
  provider: VideoProvider;
  embedUrl: string | null;
  id: string | null;
}

/** Presentation of the video itself: fit, crop and tone. */
export interface VideoStyle extends ThumbStyle {
  /** contain keeps the whole frame, cover fills the LED screen and crops. */
  fit?: "contain" | "cover";
}

export interface ThumbStyle {
  /** 1–3, applied as scale() so the image can be cropped without distortion. */
  zoom?: number;
  /** object-position percentages. */
  x?: number;
  y?: number;
  brightness?: number;
  contrast?: number;
  saturation?: number;
  grayscale?: number;
  blur?: number;
  preset?: "original" | "cinematic" | "vivid" | "mono" | "warm" | "cool";
}

const YOUTUBE_ID = /^[A-Za-z0-9_-]{6,20}$/;

export function parseVideoSource(raw: string | null | undefined): VideoSource {
  const value = (raw ?? "").trim();
  if (!value) return { provider: "unknown", embedUrl: null, id: null };

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return { provider: "unknown", embedUrl: null, id: null };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { provider: "unknown", embedUrl: null, id: null };
  }

  const host = url.hostname.replace(/^www\./, "").toLowerCase();

  if (host === "youtu.be") {
    const id = url.pathname.split("/").filter(Boolean)[0] ?? "";
    if (YOUTUBE_ID.test(id)) return youtube(id);
  }

  if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
    const params = url.searchParams.get("v");
    if (params && YOUTUBE_ID.test(params)) return youtube(params);
    const parts = url.pathname.split("/").filter(Boolean);
    const marker = parts.findIndex((part) => part === "embed" || part === "shorts" || part === "live");
    const id = marker >= 0 ? parts[marker + 1] : "";
    if (id && YOUTUBE_ID.test(id)) return youtube(id);
  }

  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const parts = url.pathname.split("/").filter(Boolean);
    const id = [...parts].reverse().find((part) => /^\d{5,12}$/.test(part));
    if (id) {
      return {
        provider: "vimeo",
        id,
        embedUrl: `https://player.vimeo.com/video/${id}?dnt=1&title=0&byline=0&portrait=0`,
      };
    }
  }

  if (/\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(url.pathname + url.search)) {
    return { provider: "file", embedUrl: value, id: null };
  }

  return { provider: "unknown", embedUrl: null, id: null };
}

function youtube(id: string): VideoSource {
  return {
    provider: "youtube",
    id,
    embedUrl: `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1&playsinline=1`,
  };
}

/** A YouTube poster frame, used only when no thumbnail was uploaded. */
export function fallbackPoster(raw: string | null | undefined): string | null {
  const source = parseVideoSource(raw);
  if (source.provider !== "youtube" || !source.id) return null;
  return `https://i.ytimg.com/vi/${source.id}/hqdefault.jpg`;
}

const PRESET_FILTERS: Record<string, string> = {
  cinematic: "saturate(0.85) contrast(1.12) brightness(0.96)",
  vivid: "saturate(1.35) contrast(1.06)",
  mono: "grayscale(1) contrast(1.08)",
  warm: "sepia(0.18) saturate(1.15) brightness(1.02)",
  cool: "saturate(0.95) hue-rotate(8deg) brightness(1.02)",
};

/** CSS filter chain for the thumbnail crop editor and the public LED screen. */
export function thumbFilter(style: ThumbStyle | null | undefined): string {
  const value = style ?? {};
  const parts: string[] = [];
  if (typeof value.brightness === "number" && value.brightness !== 100) parts.push(`brightness(${value.brightness / 100})`);
  if (typeof value.contrast === "number" && value.contrast !== 100) parts.push(`contrast(${value.contrast / 100})`);
  if (typeof value.saturation === "number" && value.saturation !== 100) parts.push(`saturate(${value.saturation / 100})`);
  if (typeof value.grayscale === "number" && value.grayscale > 0) parts.push(`grayscale(${value.grayscale / 100})`);
  if (typeof value.blur === "number" && value.blur > 0) parts.push(`blur(${Math.min(value.blur, 8)}px)`);
  const preset = value.preset && value.preset !== "original" ? PRESET_FILTERS[value.preset] : "";
  if (preset) parts.push(preset);
  return parts.join(" ") || "none";
}

export function videoFit(style: VideoStyle | null | undefined): "contain" | "cover" {
  return style?.fit === "cover" ? "cover" : "contain";
}

/** The same filter chain, applied to the player and its poster. */
export function videoFilter(style: VideoStyle | null | undefined): string {
  return thumbFilter(style);
}

export function thumbObjectPosition(style: ThumbStyle | null | undefined): string {
  const x = typeof style?.x === "number" ? Math.min(Math.max(style.x, 0), 100) : 50;
  const y = typeof style?.y === "number" ? Math.min(Math.max(style.y, 0), 100) : 50;
  return `${x}% ${y}%`;
}

export function thumbScale(style: ThumbStyle | null | undefined): number {
  const zoom = typeof style?.zoom === "number" ? style.zoom : 1;
  return Math.min(Math.max(zoom, 1), 3);
}

/** Values accepted for display_ratio; custom "w/h" pairs must be sane. */
export function ratioFromDimensions(width: number, height: number): string | null {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
  const ratio = width / height;
  if (ratio < 0.2 || ratio > 5) return null;
  return `${Math.round(width)}/${Math.round(height)}`;
}

export const ASPECT_OPTIONS = [
  { id: "16/9", label: "16:9 · Widescreen" },
  { id: "9/16", label: "9:16 · Vertical" },
  { id: "4/3", label: "4:3 · Classic" },
  { id: "3/4", label: "3:4 · Portrait" },
  { id: "1/1", label: "1:1 · Square" },
  { id: "3/2", label: "3:2 · Photo" },
  { id: "2/3", label: "2:3 · Tall photo" },
  { id: "16/10", label: "16:10 · Monitor" },
  { id: "21/9", label: "21:9 · Cinema" },
  { id: "custom", label: "Custom dimensions" },
] as const;

/**
 * Display presets. These are labels only: nothing is transcoded, and a YouTube
 * or Vimeo stream keeps whatever quality the provider serves. For uploaded
 * files the original quality is preserved.
 */
export const VIDEO_RESOLUTIONS = [
  { id: "auto", label: "Original / automatic", width: 0, height: 0 },
  { id: "480p", label: "480p · SD", width: 854, height: 480 },
  { id: "720p", label: "720p · HD", width: 1280, height: 720 },
  { id: "1080p", label: "1080p · Full HD", width: 1920, height: 1080 },
  { id: "1440p", label: "1440p · QHD", width: 2560, height: 1440 },
  { id: "2160p", label: "2160p · 4K UHD", width: 3840, height: 2160 },
] as const;

export function resolutionLabel(id: string | null | undefined): string {
  return VIDEO_RESOLUTIONS.find((option) => option.id === id)?.label ?? "Original / automatic";
}
