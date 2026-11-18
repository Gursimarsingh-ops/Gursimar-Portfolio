import { useCallback, useEffect, useRef, useState } from "react";
import {
  Check,
  Crop,
  Image as ImageIcon,
  Loader2,
  Minus,
  Plus,
  RotateCcw,
  RotateCw,
  Save,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Reusable media editor used by the artist photo, graphic designs and video
 * covers. Everything is rendered on a canvas at full output resolution, so the
 * saved file is the edited composition — no CSS-only preview lies.
 */

export const ASPECT_OPTIONS = [
  { id: "original", label: "Original" },
  { id: "1:1", label: "1:1" },
  { id: "4:5", label: "4:5" },
  { id: "5:4", label: "5:4" },
  { id: "3:2", label: "3:2" },
  { id: "2:3", label: "2:3" },
  { id: "4:3", label: "4:3" },
  { id: "3:4", label: "3:4" },
  { id: "16:9", label: "16:9" },
  { id: "9:16", label: "9:16" },
  { id: "16:10", label: "16:10" },
  { id: "custom", label: "Custom" },
] as const;

export type AspectId = (typeof ASPECT_OPTIONS)[number]["id"];

export interface EditedImage {
  file: File;
  width: number;
  height: number;
  ratio: number;
  aspectId: AspectId;
}

interface EditorState {
  aspectId: AspectId;
  customW: string;
  customH: string;
  zoom: number;
  rotation: number;
  offsetX: number;
  offsetY: number;
  brightness: number;
  contrast: number;
  saturation: number;
  sharpness: number;
  preset: FilterId;
}

type FilterId = "none" | "mono" | "vivid" | "warm" | "cool" | "film";

const PRESETS: Record<FilterId, { label: string; contrast?: number; saturate?: number; sepia?: number; hue?: number }> = {
  none: { label: "None" },
  mono: { label: "Mono", contrast: 1.08, saturate: 0 },
  vivid: { label: "Vivid", contrast: 1.1, saturate: 1.35 },
  warm: { label: "Warm", saturate: 1.12, sepia: 0.24 },
  cool: { label: "Cool", saturate: 1.08, hue: -10 },
  film: { label: "Film", contrast: 1.06, saturate: 0.88, sepia: 0.12 },
};

const FILTERS = Object.keys(PRESETS) as FilterId[];

function ratioFor(state: EditorState, iw: number, ih: number): number {
  if (state.aspectId === "original") return iw / ih;
  if (state.aspectId === "custom") {
    const w = Number(state.customW);
    const h = Number(state.customH);
    if (w > 0 && h > 0) return w / h;
    return iw / ih;
  }
  const [w, h] = state.aspectId.split(":").map(Number);
  return w / h;
}

const DEFAULTS: EditorState = {
  aspectId: "original",
  customW: "",
  customH: "",
  zoom: 1,
  rotation: 0,
  offsetX: 0,
  offsetY: 0,
  brightness: 100,
  contrast: 100,
  saturation: 100,
  sharpness: 0,
  preset: "none",
};

function filterString(state: EditorState): string {
  const preset = PRESETS[state.preset];
  const contrast = state.contrast * (preset.contrast ?? 1);
  const saturate = state.saturation * (preset.saturate ?? 1);
  return [
    `brightness(${state.brightness}%)`,
    `contrast(${contrast}%)`,
    `saturate(${saturate}%)`,
    `sepia(${Math.round((preset.sepia ?? 0) * 100)}%)`,
    `hue-rotate(${preset.hue ?? 0}deg)`,
  ].join(" ");
}

function drawComposition(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  image: HTMLImageElement,
  state: EditorState
) {
  const radians = (state.rotation * Math.PI) / 180;
  const cos = Math.abs(Math.cos(radians));
  const sin = Math.abs(Math.sin(radians));
  const boundW = image.naturalWidth * cos + image.naturalHeight * sin;
  const boundH = image.naturalWidth * sin + image.naturalHeight * cos;
  const cover = Math.max(width / boundW, height / boundH);
  const scale = cover * state.zoom;

  ctx.save();
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, width, height);
  ctx.translate(width / 2 + state.offsetX * width, height / 2 + state.offsetY * height);
  ctx.rotate(radians);
  ctx.scale(scale, scale);
  ctx.filter = filterString(state);
  ctx.drawImage(
    image,
    -image.naturalWidth / 2,
    -image.naturalHeight / 2,
    image.naturalWidth,
    image.naturalHeight
  );
  ctx.restore();
}

/** Unsharp-mask style sharpening applied to the exported pixels. */
function sharpen(ctx: CanvasRenderingContext2D, width: number, height: number, amount: number) {
  if (amount <= 0) return;
  const strength = (amount / 100) * 0.9;
  const source = ctx.getImageData(0, 0, width, height);
  const copy = new Uint8ClampedArray(source.data);
  const data = source.data;
  const center = 1 + 4 * strength;
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const i = (y * width + x) * 4;
      for (let c = 0; c < 3; c += 1) {
        const value =
          copy[i + c] * center -
          strength *
            (copy[i - 4 + c] + copy[i + 4 + c] + copy[i - width * 4 + c] + copy[i + width * 4 + c]);
        data[i + c] = value < 0 ? 0 : value > 255 ? 255 : value;
      }
    }
  }
  ctx.putImageData(source, 0, 0);
}

function outputSize(state: EditorState, iw: number, ih: number): { width: number; height: number } {
  if (state.aspectId === "custom") {
    const w = Math.round(Number(state.customW));
    const h = Math.round(Number(state.customH));
    if (w > 0 && h > 0) {
      return { width: Math.min(w, 4096), height: Math.min(h, 4096) };
    }
  }
  const ratio = ratioFor(state, iw, ih);
  const longEdge = Math.min(2400, Math.max(iw, ih) < 2400 ? Math.max(iw, ih) : 2400);
  if (ratio >= 1) return { width: longEdge, height: Math.max(1, Math.round(longEdge / ratio)) };
  return { width: Math.max(1, Math.round(longEdge * ratio)), height: longEdge };
}

/* --------------------------------- editor --------------------------------- */

interface MediaEditorProps {
  open: boolean;
  file?: File | null;
  /** Existing stored image (used to re-edit the artist original). */
  url?: string | null;
  name?: string;
  title: string;
  subtitle?: string;
  defaultAspect?: AspectId;
  onCancel: () => void;
  onApply: (result: EditedImage) => void;
  applying?: boolean;
}

export function MediaEditor({
  open,
  file,
  url,
  name,
  title,
  subtitle,
  defaultAspect = "original",
  onCancel,
  onApply,
  applying = false,
}: MediaEditorProps) {
  const [state, setState] = useState<EditorState>({ ...DEFAULTS, aspectId: defaultAspect });
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{ pointerId: number; x: number; y: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    setState({ ...DEFAULTS, aspectId: defaultAspect });
    setLoadError(null);
    setImage(null);
  }, [open, file, url, defaultAspect]);

  // The object URL lives inside this effect so React's StrictMode remount
  // recreates it instead of revoking the URL the <img> was still loading.
  useEffect(() => {
    if (!open) return;
    const source = file ? URL.createObjectURL(file) : url;
    if (!source) return;
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (!cancelled) setImage(img);
    };
    img.onerror = () => {
      if (!cancelled) setLoadError("This image could not be opened in the browser.");
    };
    img.src = source;
    return () => {
      cancelled = true;
      if (file) URL.revokeObjectURL(source);
    };
  }, [open, file, url]);

  const frameRatio = image ? ratioFor(state, image.naturalWidth, image.naturalHeight) : 16 / 9;
  const output = image ? outputSize(state, image.naturalWidth, image.naturalHeight) : null;

  // Paint the preview whenever the composition changes.
  useEffect(() => {
    if (!image || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const previewWidth = 760;
    const previewHeight = Math.round(previewWidth / frameRatio);
    canvas.width = previewWidth;
    canvas.height = previewHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawComposition(ctx, previewWidth, previewHeight, image, state);
  }, [image, state, frameRatio]);

  const update = (patch: Partial<EditorState>) => setState((current) => ({ ...current, ...patch }));

  const reset = () => setState({ ...DEFAULTS, aspectId: defaultAspect });

  const apply = useCallback(() => {
    if (!image || !output) return;
    setExporting(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = output.width;
      canvas.height = output.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas is unavailable in this browser.");
      drawComposition(ctx, output.width, output.height, image, state);
      sharpen(ctx, output.width, output.height, state.sharpness);

      canvas.toBlob(
        (blob) => {
          setExporting(false);
          if (!blob) {
            setLoadError("The edited image could not be generated.");
            return;
          }
          const base = (name ?? file?.name ?? "image").replace(/\.[^.]+$/, "").slice(0, 80) || "image";
          const edited = new File([blob], `${base}-edited.jpg`, { type: "image/jpeg" });
          onApply({
            file: edited,
            width: output.width,
            height: output.height,
            ratio: output.width / output.height,
            aspectId: state.aspectId,
          });
        },
        "image/jpeg",
        0.95
      );
    } catch {
      setExporting(false);
      setLoadError("The edited image could not be generated in this browser.");
    }
  }, [image, output, state, name, file, onApply]);

  const dragging = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    dragRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    void rect;
  };

  const move = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragRef.current || dragRef.current.pointerId !== event.pointerId) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const dx = (event.clientX - dragRef.current.x) / rect.width;
    const dy = (event.clientY - dragRef.current.y) / rect.height;
    dragRef.current.x = event.clientX;
    dragRef.current.y = event.clientY;
    setState((current) => ({
      ...current,
      offsetX: Math.max(-1.5, Math.min(1.5, current.offsetX + dx)),
      offsetY: Math.max(-1.5, Math.min(1.5, current.offsetY + dy)),
    }));
  };

  const endDrag = () => {
    dragRef.current = null;
  };

  if (!open) return null;

  const busy = applying || exporting;

  return (
    <div
      className="fixed inset-0 z-[95] overflow-y-auto bg-black/85 p-3 backdrop-blur-md sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={() => {
        if (!busy) onCancel();
      }}
    >
      <div
        className="mx-auto my-2 w-full max-w-6xl overflow-hidden rounded-2xl border border-white/12 bg-[linear-gradient(165deg,#181d24_0%,#0b0e13_55%,#06080b_100%)] shadow-[0_60px_140px_-60px_rgba(0,0,0,1)]"
        onClick={(event) => event.stopPropagation()}
      >
        <span className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />

        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3.5 sm:px-5">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[9px] uppercase tracking-[0.28em] text-white/40">
              <Crop className="h-3 w-3" /> Media editor
            </p>
            <p className="mt-1 truncate text-[13px] font-medium text-white">{title}</p>
            {subtitle && <p className="mt-0.5 truncate text-[10px] text-white/40">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            aria-label="Close editor"
            className="grid h-8 w-8 place-items-center rounded-full border border-white/12 text-white/55 transition-colors hover:border-white/30 hover:text-white disabled:opacity-40"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </header>

        <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          {/* ------------------------------ preview ------------------------------ */}
          <div className="min-w-0">
            <div className="relative grid place-items-center overflow-hidden rounded-xl border border-white/10 bg-[radial-gradient(90%_80%_at_50%_0%,#151b22_0%,#05070a_75%)] p-3">
              {loadError ? (
                <div className="grid aspect-video w-full place-items-center text-center">
                  <div>
                    <ImageIcon className="mx-auto h-7 w-7 text-white/25" />
                    <p className="mt-2 text-[11px] text-amber-200/80">{loadError}</p>
                  </div>
                </div>
              ) : image ? (
                <canvas
                  ref={canvasRef}
                  onPointerDown={dragging}
                  onPointerMove={move}
                  onPointerUp={endDrag}
                  onPointerCancel={endDrag}
                  onWheel={(event) => {
                    event.preventDefault();
                    update({ zoom: Math.max(1, Math.min(4, state.zoom - event.deltaY * 0.0015)) });
                  }}
                  className="max-h-[52vh] w-auto max-w-full cursor-grab touch-none rounded-lg shadow-[0_24px_60px_-30px_rgba(0,0,0,1)] active:cursor-grabbing"
                  style={{ aspectRatio: String(frameRatio) }}
                  aria-label="Edited image preview"
                />
              ) : (
                <div className="grid aspect-video w-full place-items-center">
                  <Loader2 className="h-5 w-5 animate-spin text-white/40" />
                </div>
              )}

              {image && (
                <div className="pointer-events-none absolute inset-x-3 top-3 flex items-start justify-between gap-2">
                  <span className="rounded-full border border-white/15 bg-black/60 px-2.5 py-1 text-[8px] uppercase tracking-[0.16em] text-white/65 backdrop-blur">
                    Drag to reposition · scroll to zoom
                  </span>
                  <span className="rounded-full border border-cyan-300/30 bg-cyan-400/10 px-2.5 py-1 text-[8px] uppercase tracking-[0.14em] text-cyan-100 backdrop-blur">
                    {ASPECT_OPTIONS.find((option) => option.id === state.aspectId)?.label} ·{" "}
                    {frameRatio.toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded-lg border border-white/[0.08] bg-black/25 px-2.5 py-2">
                <p className="text-[8px] uppercase tracking-[0.18em] text-white/30">Source</p>
                <p className="mt-0.5 truncate text-[10px] text-white/70">
                  {image ? `${image.naturalWidth} × ${image.naturalHeight}` : "—"}
                </p>
              </div>
              <div className="rounded-lg border border-white/[0.08] bg-black/25 px-2.5 py-2">
                <p className="text-[8px] uppercase tracking-[0.18em] text-white/30">Output</p>
                <p className="mt-0.5 truncate text-[10px] text-white/70">
                  {output ? `${output.width} × ${output.height}` : "—"}
                </p>
              </div>
              <div className="rounded-lg border border-white/[0.08] bg-black/25 px-2.5 py-2">
                <p className="text-[8px] uppercase tracking-[0.18em] text-white/30">Zoom</p>
                <p className="mt-0.5 text-[10px] text-white/70">{Math.round(state.zoom * 100)}%</p>
              </div>
              <div className="rounded-lg border border-white/[0.08] bg-black/25 px-2.5 py-2">
                <p className="text-[8px] uppercase tracking-[0.18em] text-white/30">Quality</p>
                <p className="mt-0.5 truncate text-[10px] text-white/70">JPEG 95%</p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => update({ rotation: state.rotation - 90 })}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.04] px-2.5 py-1.5 text-[9px] uppercase tracking-[0.14em] text-white/65 transition-colors hover:border-white/30 hover:text-white"
              >
                <RotateCcw className="h-3 w-3" /> Rotate left
              </button>
              <button
                type="button"
                onClick={() => update({ rotation: state.rotation + 90 })}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.04] px-2.5 py-1.5 text-[9px] uppercase tracking-[0.14em] text-white/65 transition-colors hover:border-white/30 hover:text-white"
              >
                <RotateCw className="h-3 w-3" /> Rotate right
              </button>
              <span className="text-[9px] text-white/35">{((state.rotation % 360) + 360) % 360}°</span>
              <span className="ml-auto text-[9px] uppercase tracking-[0.14em] text-white/30">
                Sharpening is baked in on save
              </span>
            </div>
          </div>

          {/* ------------------------------ controls ----------------------------- */}
          <div className="min-w-0 space-y-3">
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-3">
              <p className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.22em] text-white/45">
                <Crop className="h-3 w-3" /> Aspect ratio
              </p>
              <div className="mt-2 grid grid-cols-3 gap-1.5">
                {ASPECT_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() =>
                      update({
                        aspectId: option.id,
                        customW:
                          option.id === "custom" && !state.customW && image
                            ? String(state.aspectId === "original" && image ? image.naturalWidth : "")
                            : state.customW,
                        customH:
                          option.id === "custom" && !state.customH && image
                            ? String(state.aspectId === "original" && image ? image.naturalHeight : "")
                            : state.customH,
                      })
                    }
                    className={cn(
                      "rounded-md border px-1.5 py-1.5 text-[9px] uppercase tracking-[0.1em] transition-colors",
                      state.aspectId === option.id
                        ? "border-white/50 bg-white text-neutral-950"
                        : "border-white/12 bg-black/25 text-white/55 hover:border-white/30 hover:text-white"
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              {state.aspectId === "custom" && (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="text-[8px] uppercase tracking-[0.16em] text-white/35">Width px</span>
                    <input
                      type="number"
                      min={64}
                      max={4096}
                      value={state.customW}
                      onChange={(event) => update({ customW: event.target.value })}
                      className="mt-1 w-full rounded-md border border-white/12 bg-black/40 px-2 py-1.5 text-[11px] text-white outline-none focus:border-cyan-300/40"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[8px] uppercase tracking-[0.16em] text-white/35">Height px</span>
                    <input
                      type="number"
                      min={64}
                      max={4096}
                      value={state.customH}
                      onChange={(event) => update({ customH: event.target.value })}
                      className="mt-1 w-full rounded-md border border-white/12 bg-black/40 px-2 py-1.5 text-[11px] text-white outline-none focus:border-cyan-300/40"
                    />
                  </label>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.22em] text-white/45">
                  <SlidersHorizontal className="h-3 w-3" /> Zoom
                </p>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label="Zoom out"
                    onClick={() => update({ zoom: Math.max(1, Number((state.zoom - 0.1).toFixed(2))) })}
                    className="grid h-6 w-6 place-items-center rounded-md border border-white/12 text-white/60 hover:border-white/30 hover:text-white"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    aria-label="Zoom in"
                    onClick={() => update({ zoom: Math.min(4, Number((state.zoom + 0.1).toFixed(2))) })}
                    className="grid h-6 w-6 place-items-center rounded-md border border-white/12 text-white/60 hover:border-white/30 hover:text-white"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>
              <input
                type="range"
                min={1}
                max={4}
                step={0.01}
                value={state.zoom}
                onChange={(event) => update({ zoom: Number(event.target.value) })}
                className="mt-2 w-full accent-white"
                aria-label="Zoom"
              />
            </div>

            <div className="space-y-2.5 rounded-xl border border-white/[0.08] bg-white/[0.025] p-3">
              {(
                [
                  ["brightness", "Brightness", 50, 150],
                  ["contrast", "Contrast", 50, 150],
                  ["saturation", "Saturation", 0, 200],
                  ["sharpness", "Sharpness", 0, 100],
                ] as const
              ).map(([key, label, min, max]) => (
                <label key={key} className="block">
                  <span className="flex items-center justify-between text-[8px] uppercase tracking-[0.16em] text-white/35">
                    {label}
                    <span className="text-white/55">{state[key]}%</span>
                  </span>
                  <input
                    type="range"
                    min={min}
                    max={max}
                    value={state[key]}
                    onChange={(event) => update({ [key]: Number(event.target.value) } as Partial<EditorState>)}
                    className="mt-1 w-full accent-white"
                  />
                </label>
              ))}
            </div>

            <div className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-3">
              <p className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.22em] text-white/45">
                <Sparkles className="h-3 w-3" /> Filters
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {FILTERS.map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => update({ preset: filter })}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-[9px] uppercase tracking-[0.12em] transition-colors",
                      state.preset === filter
                        ? "border-white/50 bg-white text-neutral-950"
                        : "border-white/12 text-white/55 hover:border-white/30 hover:text-white"
                    )}
                  >
                    {PRESETS[filter].label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-[1fr_auto] gap-2">
              <button
                type="button"
                onClick={apply}
                disabled={busy || !image}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-950 transition-all hover:-translate-y-0.5 hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                {applying ? "Uploading…" : exporting ? "Rendering…" : "Save & apply"}
              </button>
              <button
                type="button"
                onClick={reset}
                disabled={busy}
                className="inline-flex items-center justify-center gap-1.5 rounded-full border border-white/15 px-3 py-2.5 text-[9px] uppercase tracking-[0.14em] text-white/60 transition-colors hover:border-white/30 hover:text-white disabled:opacity-40"
              >
                <RotateCcw className="h-3 w-3" /> Reset
              </button>
            </div>
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-white/12 px-3 py-2 text-[9px] uppercase tracking-[0.14em] text-white/45 transition-colors hover:border-white/30 hover:text-white disabled:opacity-40"
            >
              <X className="h-3 w-3" /> Cancel without saving
            </button>
            <p className="flex items-start gap-1.5 text-[9px] leading-relaxed text-white/25">
              <Check className="mt-0.5 h-2.5 w-2.5 shrink-0" />
              The uploaded file is the edited composition. Choose “Original” to keep the exact source
              framing; nothing is stretched automatically.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
