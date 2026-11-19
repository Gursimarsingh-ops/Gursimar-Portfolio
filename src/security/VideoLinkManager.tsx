import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clapperboard,
  Eye,
  Image as ImageIcon,
  Link2,
  Loader2,
  Pencil,
  Play,
  Plus,
  Save,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api, ApiError, uploadFile, type AdminProject, type ProjectStatus } from "@/admin/api";
import { CATEGORY_OPTIONS } from "@/admin/categories";
import { invalidatePublishedProjects } from "@/lib/portfolio";
import {
  ASPECT_OPTIONS,
  VIDEO_RESOLUTIONS,
  parseVideoSource,
  ratioFromDimensions,
  thumbFilter,
  thumbObjectPosition,
  thumbScale,
  type ThumbStyle,
} from "@/lib/video";

const inputCls =
  "mt-1.5 w-full rounded-lg border border-white/12 bg-black/45 px-3 py-2.5 text-[12px] text-white outline-none transition-colors placeholder:text-white/25 focus:border-cyan-300/45 focus:bg-black/65";
const labelCls = "block text-[9px] uppercase tracking-[0.2em] text-white/40";

type Draft = {
  id: string | null;
  title: string;
  description: string;
  sourceUrl: string;
  category: string;
  status: ProjectStatus;
  ratio: string;
  customWidth: string;
  customHeight: string;
  resolution: string;
  sortOrder: string;
  thumbKey: string | null;
  thumbUrl: string | null;
  thumbStyle: Required<ThumbStyle>;
};

const DEFAULT_STYLE: Required<ThumbStyle> = {
  zoom: 1,
  x: 50,
  y: 50,
  brightness: 100,
  contrast: 100,
  saturation: 100,
  grayscale: 0,
  blur: 0,
  preset: "original",
};

function blankDraft(category: string, order: number): Draft {
  return {
    id: null,
    title: "",
    description: "",
    sourceUrl: "",
    category,
    status: "draft",
    ratio: "16/9",
    customWidth: "1920",
    customHeight: "1080",
    resolution: "1920x1080",
    sortOrder: String(order),
    thumbKey: null,
    thumbUrl: null,
    thumbStyle: { ...DEFAULT_STYLE },
  };
}

function draftFrom(project: AdminProject): Draft {
  const ratio = project.displayRatio ?? "auto";
  const known = ASPECT_OPTIONS.some((option) => option.id === ratio);
  const style = { ...DEFAULT_STYLE, ...(project.thumbStyle ?? {}) } as Required<ThumbStyle>;
  return {
    id: project.id,
    title: project.title,
    description: project.description,
    sourceUrl: project.sourceUrl ?? "",
    category: project.category,
    status: project.status,
    ratio: known ? ratio : "custom",
    customWidth: String(project.assetWidth ?? 1920),
    customHeight: String(project.assetHeight ?? 1080),
    resolution:
      VIDEO_RESOLUTIONS.find(
        (option) => option.width === project.assetWidth && option.height === project.assetHeight
      )?.id ?? "custom",
    sortOrder: String(project.sortOrder ?? 0),
    thumbKey: project.thumbUrl ? decodeURIComponent(project.thumbUrl.split("/api/admin/media/")[1] ?? "") || null : null,
    thumbUrl: project.thumbUrl,
    thumbStyle: style,
  };
}

function Notice({ tone, children }: { tone: "error" | "success" | "info"; children: React.ReactNode }) {
  return (
    <p
      className={cn(
        "flex items-start gap-2 rounded-lg border px-3 py-2 text-[10.5px] leading-relaxed",
        tone === "error"
          ? "border-red-400/25 bg-red-500/10 text-red-200"
          : tone === "success"
            ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-200"
            : "border-white/10 bg-white/[0.03] text-white/50"
      )}
    >
      {tone === "error" ? (
        <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
      ) : tone === "success" ? (
        <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0" />
      ) : null}
      <span>{children}</span>
    </p>
  );
}

/** LED screen dimensions follow the selected aspect ratio exactly. */
function ratioOf(draft: Draft): string {
  if (draft.ratio !== "custom") return draft.ratio;
  return ratioFromDimensions(Number(draft.customWidth), Number(draft.customHeight)) ?? "16/9";
}

export function VideoLinkManager() {
  const [projects, setProjects] = useState<AdminProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [working, setWorking] = useState<string | null>(null);
  const [thumbProgress, setThumbProgress] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [notice, setNotice] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  const thumbInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const result = await api.projects("video");
      setProjects(result.projects.filter((project) => Boolean(project.sourceUrl)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load video links.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const categoryOptions = CATEGORY_OPTIONS.video;
  const thumbnail = draft?.thumbUrl ?? null;
  const source = draft ? parseVideoSource(draft.sourceUrl) : null;

  const startNew = () => {
    setDraft(blankDraft(categoryOptions[0]?.id ?? "gaming", projects.length));
    setNotice(null);
    setConfirmDelete(false);
  };

  const edit = (project: AdminProject) => {
    setDraft(draftFrom(project));
    setNotice(null);
    setConfirmDelete(false);
  };

  const patch = (changes: Partial<Draft>) => setDraft((current) => (current ? { ...current, ...changes } : current));
  const patchStyle = (changes: Partial<Required<ThumbStyle>>) =>
    setDraft((current) => (current ? { ...current, thumbStyle: { ...current.thumbStyle, ...changes } } : current));

  const uploadThumb = async (file: File | undefined) => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
      setNotice({ tone: "error", text: "The cover must be a JPG, PNG, WebP or GIF image." });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setNotice({ tone: "error", text: "The cover is larger than 5 MB." });
      return;
    }
    setThumbProgress(0);
    setNotice(null);
    try {
      const uploaded = await uploadFile(file, "thumbnail", setThumbProgress);
      patch({ thumbKey: uploaded.key, thumbUrl: uploaded.url });
      setNotice({ tone: "success", text: "Cover uploaded. Adjust the crop and filters, then save." });
    } catch (err) {
      setNotice({ tone: "error", text: err instanceof Error ? err.message : "Cover upload failed." });
    } finally {
      setThumbProgress(null);
    }
  };

  const save = async () => {
    if (!draft) return;
    if (!draft.title.trim()) {
      setNotice({ tone: "error", text: "Add a title for this video." });
      return;
    }
    if (!draft.sourceUrl.trim() || source?.provider === "unknown") {
      setNotice({
        tone: "error",
        text: "Enter a supported video link: YouTube, Vimeo, or a direct MP4/WebM/MOV file.",
      });
      return;
    }

    const [width, height] = resolutionOf(draft);
    const payload = {
      title: draft.title.trim(),
      description: draft.description.trim(),
      category: draft.category,
      status: draft.status,
      displayRatio: ratioOf(draft),
      assetWidth: width,
      assetHeight: height,
      sortOrder: Number(draft.sortOrder) || 0,
      thumbKey: draft.thumbKey,
      sourceUrl: draft.sourceUrl.trim(),
      thumbStyle: draft.thumbStyle as unknown as Record<string, unknown>,
    };

    setSaving(true);
    setNotice(null);
    try {
      if (draft.id) {
        await api.updateProject(draft.id, payload);
      } else {
        await api.createProject({ ...payload, kind: "video" });
      }
      invalidatePublishedProjects();
      await load();
      setDraft(null);
      setNotice({ tone: "success", text: "Video saved and synced to the portfolio." });
    } catch (err) {
      setNotice({ tone: "error", text: err instanceof Error ? err.message : "Could not save the video." });
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (project: AdminProject, status: ProjectStatus) => {
    setWorking(project.id);
    setNotice(null);
    try {
      await api.updateProject(project.id, { status });
      invalidatePublishedProjects();
      await load();
      setNotice({
        tone: "success",
        text: status === "published" ? `“${project.title}” is live in Video Editing.` : `“${project.title}” unpublished.`,
      });
    } catch (err) {
      setNotice({ tone: "error", text: err instanceof Error ? err.message : "Could not change the status." });
    } finally {
      setWorking(null);
    }
  };

  const remove = async (project: AdminProject) => {
    setWorking(project.id);
    try {
      await api.deleteProject(project.id);
      invalidatePublishedProjects();
      await load();
      setDraft(null);
      setNotice({ tone: "success", text: "Video deleted." });
    } catch (err) {
      setNotice({ tone: "error", text: err instanceof Error ? err.message : "Delete failed." });
    } finally {
      setWorking(null);
    }
  };

  const previewRatio = useMemo(() => {
    if (!draft) return "16/9";
    return ratioOf(draft);
  }, [draft]);

  if (loading) {
    return (
      <p className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-8 text-[11px] text-white/45">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading video links…
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3.5">
        <div>
          <p className="text-[12px] text-white/80">Externally hosted videos</p>
          <p className="mt-0.5 text-[10px] leading-relaxed text-white/35">
            Publish a YouTube unlisted, Vimeo or direct-file link without uploading the video. It appears in the
            existing Video Editing LED screens with the aspect ratio you choose.
          </p>
        </div>
        <button
          type="button"
          onClick={startNew}
          className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-950 transition-all hover:-translate-y-0.5 hover:bg-neutral-200"
        >
          <Plus className="h-3.5 w-3.5" /> Add Video Link
        </button>
      </div>

      {error && <Notice tone="error">{error}</Notice>}
      {!draft && notice && <Notice tone={notice.tone}>{notice.text}</Notice>}

      {projects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/12 px-5 py-12 text-center">
          <Clapperboard className="mx-auto h-5 w-5 text-white/30" />
          <p className="mt-3 text-[12px] text-white/55">No video links published yet.</p>
          <p className="mt-1 text-[10.5px] text-white/30">Use “Add Video Link” to publish one.</p>
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => {
            const style = (project.thumbStyle ?? {}) as ThumbStyle;
            const poster = project.thumbUrl;
            const link = parseVideoSource(project.sourceUrl);
            return (
              <li key={project.id} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
                <div
                  className="relative overflow-hidden bg-black"
                  style={{ aspectRatio: (project.displayRatio ?? "16/9").replace("/", " / ") }}
                >
                  {poster ? (
                    <img
                      src={poster}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover"
                      style={{
                        objectPosition: thumbObjectPosition(style),
                        filter: thumbFilter(style),
                        transform: `scale(${thumbScale(style)})`,
                      }}
                    />
                  ) : (
                    <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-neutral-800 to-black text-white/30">
                      <Link2 className="h-5 w-5" />
                    </div>
                  )}
                  <span className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-[8px] uppercase tracking-[0.14em] text-white/70 backdrop-blur">
                    {project.displayRatio ?? "16/9"} · {link.provider}
                  </span>
                  <span
                    className={cn(
                      "absolute right-2 top-2 rounded-full px-2 py-0.5 text-[8px] uppercase tracking-[0.14em]",
                      project.status === "published"
                        ? "bg-emerald-400/85 text-emerald-950"
                        : "bg-amber-300/85 text-amber-950"
                    )}
                  >
                    {project.status}
                  </span>
                </div>
                <div className="space-y-2.5 p-3.5">
                  <div>
                    <p className="truncate text-[12px] text-white/85">{project.title}</p>
                    <p className="mt-0.5 truncate text-[9.5px] text-white/35">
                      {CATEGORY_OPTIONS.video.find((option) => option.id === project.category)?.label ??
                        project.category}{" "}
                      · order {project.sortOrder}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => edit(project)}
                      className="inline-flex items-center gap-1 rounded-md border border-white/14 px-2 py-1 text-[9px] uppercase tracking-[0.14em] text-white/60 transition-colors hover:bg-white/5 hover:text-white"
                    >
                      <Pencil className="h-2.5 w-2.5" /> Edit
                    </button>
                    <a
                      href={project.sourceUrl ?? "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-md border border-white/14 px-2 py-1 text-[9px] uppercase tracking-[0.14em] text-white/60 transition-colors hover:bg-white/5 hover:text-white"
                    >
                      <Eye className="h-2.5 w-2.5" /> Source
                    </a>
                    <button
                      type="button"
                      disabled={working === project.id}
                      onClick={() => void setStatus(project, project.status === "published" ? "draft" : "published")}
                      className="inline-flex items-center gap-1 rounded-md border border-white/14 px-2 py-1 text-[9px] uppercase tracking-[0.14em] text-white/60 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-40"
                    >
                      {working === project.id ? (
                        <Loader2 className="h-2.5 w-2.5 animate-spin" />
                      ) : (
                        <Upload className="h-2.5 w-2.5" />
                      )}
                      {project.status === "published" ? "Unpublish" : "Publish"}
                    </button>
                    <button
                      type="button"
                      disabled={working === project.id}
                      onClick={() => void remove(project)}
                      className="ml-auto inline-flex items-center gap-1 rounded-md border border-red-400/25 px-2 py-1 text-[9px] uppercase tracking-[0.14em] text-red-200/80 transition-colors hover:bg-red-500/10 disabled:opacity-40"
                    >
                      <Trash2 className="h-2.5 w-2.5" /> Delete
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {draft && (
        <div
          className="fixed inset-0 z-[75] grid place-items-center overflow-y-auto bg-black/75 p-3 backdrop-blur-sm sm:p-6"
          onClick={() => !saving && setDraft(null)}
        >
          <div
            className="relative w-full max-w-6xl rounded-2xl border border-white/12 bg-[#0a0c10] shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-white/10 bg-[#0a0c10]/95 px-4 py-3 backdrop-blur">
              <div>
                <p className="text-[9px] uppercase tracking-[0.24em] text-white/35">
                  {draft.id ? "Edit video link" : "New video link"}
                </p>
                <p className="text-[13px] font-medium text-white">{draft.title.trim() || "Untitled video"}</p>
              </div>
              <button
                type="button"
                onClick={() => !saving && setDraft(null)}
                aria-label="Close"
                className="grid h-8 w-8 place-items-center rounded-md border border-white/15 text-white/50 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
              {/* preview */}
              <div className="space-y-3">
                <div className="rounded-xl border border-white/10 bg-black/40 p-3">
                  <p className="text-[9px] uppercase tracking-[0.2em] text-white/40">LED screen preview</p>
                  <div className="mt-3 grid place-items-center">
                    <div
                      className="relative w-full max-w-full overflow-hidden rounded-lg border border-white/10 bg-black"
                      style={
                        Number((previewRatio.split("/")[0] ?? 16)) / Number((previewRatio.split("/")[1] ?? 9)) >= 1
                          ? { width: "100%", aspectRatio: previewRatio.replace("/", " / ") }
                          : { height: "420px", aspectRatio: previewRatio.replace("/", " / ") }
                      }
                    >
                      {source?.provider === "youtube" || source?.provider === "vimeo" ? (
                        <iframe
                          src={source.embedUrl ?? ""}
                          title="Video preview"
                          className="absolute inset-0 h-full w-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                          allowFullScreen
                        />
                      ) : source?.provider === "file" ? (
                        <video
                          src={source.embedUrl ?? undefined}
                          controls
                          playsInline
                          className="absolute inset-0 h-full w-full object-contain"
                        />
                      ) : (
                        <div className="absolute inset-0 grid place-items-center px-6 text-center text-[11px] text-white/40">
                          <span>
                            <Play className="mx-auto mb-2 h-5 w-5" />
                            Paste a supported video URL to preview it.
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="mt-2 text-center text-[9px] uppercase tracking-[0.14em] text-white/30">
                    Screen {previewRatio} · playback quality is controlled by the host
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/40 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[9px] uppercase tracking-[0.2em] text-white/40">Thumbnail crop &amp; tone</p>
                    <button
                      type="button"
                      onClick={() => thumbInput.current?.click()}
                      className="text-[9px] uppercase tracking-[0.14em] text-white/50 hover:text-white"
                    >
                      {thumbnail ? "Replace" : "Upload"}
                    </button>
                    <input
                      ref={thumbInput}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="hidden"
                      onChange={(event) => {
                        void uploadThumb(event.target.files?.[0]);
                        event.target.value = "";
                      }}
                    />
                  </div>

                  <div
                    className="relative mt-2 overflow-hidden rounded-lg border border-white/10 bg-black"
                    style={{ aspectRatio: previewRatio.replace("/", " / ") }}
                  >
                    {thumbnail ? (
                      <img
                        src={thumbnail}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover"
                        style={{
                          objectPosition: thumbObjectPosition(draft.thumbStyle),
                          filter: thumbFilter(draft.thumbStyle),
                          transform: `scale(${thumbScale(draft.thumbStyle)})`,
                        }}
                      />
                    ) : (
                      <div className="absolute inset-0 grid place-items-center text-white/25">
                        <ImageIcon className="h-5 w-5" />
                      </div>
                    )}
                  </div>

                  {thumbProgress !== null && (
                    <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full bg-white transition-all" style={{ width: `${thumbProgress}%` }} />
                    </div>
                  )}

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Range label="Zoom" value={draft.thumbStyle.zoom} min={1} max={3} step={0.05} onChange={(zoom) => patchStyle({ zoom })} />
                    <Range label="Position X" value={draft.thumbStyle.x} min={0} max={100} step={1} onChange={(x) => patchStyle({ x })} />
                    <Range label="Position Y" value={draft.thumbStyle.y} min={0} max={100} step={1} onChange={(y) => patchStyle({ y })} />
                    <Range label="Brightness" value={draft.thumbStyle.brightness} min={40} max={180} step={1} onChange={(brightness) => patchStyle({ brightness })} />
                    <Range label="Contrast" value={draft.thumbStyle.contrast} min={40} max={200} step={1} onChange={(contrast) => patchStyle({ contrast })} />
                    <Range label="Saturation" value={draft.thumbStyle.saturation} min={0} max={200} step={1} onChange={(saturation) => patchStyle({ saturation })} />
                    <Range label="Grayscale" value={draft.thumbStyle.grayscale} min={0} max={100} step={1} onChange={(grayscale) => patchStyle({ grayscale })} />
                    <Range label="Blur" value={draft.thumbStyle.blur} min={0} max={8} step={0.5} onChange={(blur) => patchStyle({ blur })} />
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {(["original", "cinematic", "vivid", "mono", "warm", "cool"] as const).map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => patchStyle({ preset })}
                        className={cn(
                          "rounded-full border px-2 py-1 text-[9px] uppercase tracking-[0.12em]",
                          draft.thumbStyle.preset === preset
                            ? "border-white/40 bg-white/10 text-white"
                            : "border-white/12 text-white/45 hover:text-white"
                        )}
                      >
                        {preset}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => patchStyle({ ...DEFAULT_STYLE })}
                      className="ml-auto text-[9px] uppercase tracking-[0.12em] text-white/35 hover:text-white"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              </div>

              {/* fields */}
              <div className="space-y-3">
                <label className="block">
                  <span className={labelCls}>Video title</span>
                  <input
                    value={draft.title}
                    onChange={(event) => patch({ title: event.target.value })}
                    maxLength={120}
                    className={inputCls}
                    placeholder="e.g. Creator Brand Film"
                  />
                </label>

                <label className="block">
                  <span className={labelCls}>Description</span>
                  <textarea
                    value={draft.description}
                    onChange={(event) => patch({ description: event.target.value })}
                    rows={3}
                    maxLength={2000}
                    className={cn(inputCls, "resize-y")}
                  />
                </label>

                <label className="block">
                  <span className={labelCls}>Video URL</span>
                  <input
                    value={draft.sourceUrl}
                    onChange={(event) => patch({ sourceUrl: event.target.value })}
                    className={cn(inputCls, "font-mono text-[11px]")}
                    placeholder="https://www.youtube.com/watch?v=… or https://cdn.example.com/film.mp4"
                  />
                  <span className="mt-1 block text-[9px] text-white/30">
                    YouTube (unlisted links work), Vimeo, or a direct MP4/WebM/MOV file. Unsupported links are
                    rejected.
                  </span>
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className={labelCls}>Category</span>
                    <select
                      value={draft.category}
                      onChange={(event) => patch({ category: event.target.value })}
                      className={inputCls}
                    >
                      {categoryOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className={labelCls}>Status</span>
                    <select
                      value={draft.status}
                      onChange={(event) => patch({ status: event.target.value as ProjectStatus })}
                      className={inputCls}
                    >
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                    </select>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className={labelCls}>Aspect ratio</span>
                    <select
                      value={draft.ratio}
                      onChange={(event) => patch({ ratio: event.target.value })}
                      className={inputCls}
                    >
                      {ASPECT_OPTIONS.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className={labelCls}>Display resolution</span>
                    <select
                      value={draft.resolution}
                      onChange={(event) => {
                        const resolution = VIDEO_RESOLUTIONS.find((item) => item.id === event.target.value);
                        patch({
                          resolution: event.target.value,
                          ...(resolution
                            ? { customWidth: String(resolution.width), customHeight: String(resolution.height) }
                            : {}),
                        });
                      }}
                      className={inputCls}
                    >
                      {VIDEO_RESOLUTIONS.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                      <option value="custom">Custom</option>
                    </select>
                  </label>
                </div>

                {(draft.ratio === "custom" || draft.resolution === "custom") && (
                  <div className="grid grid-cols-2 gap-2">
                    <label className="block">
                      <span className={labelCls}>Custom width</span>
                      <input
                        type="number"
                        min={1}
                        value={draft.customWidth}
                        onChange={(event) => patch({ customWidth: event.target.value })}
                        className={inputCls}
                      />
                    </label>
                    <label className="block">
                      <span className={labelCls}>Custom height</span>
                      <input
                        type="number"
                        min={1}
                        value={draft.customHeight}
                        onChange={(event) => patch({ customHeight: event.target.value })}
                        className={inputCls}
                      />
                    </label>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className={labelCls}>Display order</span>
                    <input
                      type="number"
                      min={0}
                      value={draft.sortOrder}
                      onChange={(event) => patch({ sortOrder: event.target.value })}
                      className={inputCls}
                    />
                  </label>
                  <div className="block">
                    <span className={labelCls}>Cover</span>
                    <p className="mt-2 truncate text-[10px] text-white/45">
                      {draft.thumbKey ? draft.thumbKey.split("/").pop() : "No cover uploaded"}
                    </p>
                  </div>
                </div>

                {notice && <Notice tone={notice.tone}>{notice.text}</Notice>}

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => void save()}
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-950 hover:bg-neutral-200 disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    {draft.status === "published" ? "Save & publish" : "Save draft"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDraft(null)}
                    disabled={saving}
                    className="rounded-full border border-white/15 px-4 py-2.5 text-[10px] uppercase tracking-[0.14em] text-white/60 hover:text-white disabled:opacity-40"
                  >
                    Cancel
                  </button>
                  {draft.id && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirmDelete) {
                          const project = projects.find((item) => item.id === draft.id);
                          if (project) void remove(project);
                        } else {
                          setConfirmDelete(true);
                        }
                      }}
                      disabled={working === draft.id}
                      className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-red-400/25 px-3 py-2.5 text-[9px] uppercase tracking-[0.14em] text-red-200/80 hover:bg-red-500/10 disabled:opacity-40"
                    >
                      <Trash2 className="h-3 w-3" />
                      {confirmDelete ? "Confirm delete" : "Delete"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function resolutionOf(draft: Draft): [number, number] {
  const preset = VIDEO_RESOLUTIONS.find((item) => item.id === draft.resolution);
  if (preset) return [preset.width, preset.height];
  const width = Number(draft.customWidth);
  const height = Number(draft.customHeight);
  if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
    return [Math.round(width), Math.round(height)];
  }
  return [1920, 1080];
}

function Range({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block rounded-lg border border-white/10 bg-white/[0.02] px-2 py-1.5">
      <span className="flex items-center justify-between text-[8px] uppercase tracking-[0.14em] text-white/35">
        {label}
        <span className="text-white/55">{value}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-1 w-full accent-white"
      />
    </label>
  );
}
