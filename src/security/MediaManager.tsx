import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Crop,
  Eye,
  EyeOff,
  Image as ImageIcon,
  ImagePlus,
  Loader2,
  Pencil,
  Plus,
  Save,
  Timer,
  Trash2,
  Upload,
  Video,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api, formatBytes, uploadFile, type AdminProject, type ProjectKind, type ProjectStatus } from "@/admin/api";
import { CATEGORY_OPTIONS, categoryLabel } from "@/admin/categories";
import { ProjectPreviewDialog } from "@/components/portfolio/ProjectPreviewDialog";
import { VideoPlayerDialog } from "@/components/portfolio/VideoPlayerDialog";
import { invalidatePublishedProjects } from "@/lib/portfolio";
import { ASPECT_OPTIONS, MediaEditor as ImageEditor, type AspectId, type EditedImage } from "./MediaEditor";

const SCREEN_RATIOS = ["auto", ...ASPECT_OPTIONS.filter((option) => option.id !== "custom").map((option) => option.id.replace(":", "/"))];

function ratioLabel(value: string): string {
  return value === "auto" ? "Auto (follows the file)" : value;
}

function formatDuration(seconds: number | null): string {
  if (!seconds || !Number.isFinite(seconds)) return "—";
  const total = Math.round(seconds);
  const minutes = Math.floor(total / 60);
  return `${minutes}:${String(total % 60).padStart(2, "0")}`;
}

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
const MAX_IMAGE = 8 * 1024 * 1024;
const MAX_VIDEO = 90 * 1024 * 1024;
const MAX_THUMB = 5 * 1024 * 1024;

const inputCls =
  "mt-1.5 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-[12px] text-white outline-none transition-colors placeholder:text-white/25 focus:border-cyan-300/40 focus:bg-black/60";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="flex items-center justify-between text-[9px] uppercase tracking-[0.2em] text-white/45">
        {label}
        {hint && <span className="normal-case tracking-normal text-white/25">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

function Notice({ tone, children }: { tone: "error" | "success" | "info"; children: React.ReactNode }) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
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

function Progress({ value }: { value: number }) {
  return (
    <span className="block h-1 w-full overflow-hidden rounded-full bg-white/10">
      <span
        className="block h-full rounded-full bg-gradient-to-r from-cyan-200/70 to-white transition-all duration-300"
        style={{ width: `${value}%` }}
      />
    </span>
  );
}

/* ------------------------------- editor modal ------------------------------ */

function MediaEditor({
  kind,
  project,
  onClose,
  onSaved,
}: {
  kind: ProjectKind;
  project: AdminProject | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const isVideo = kind === "video";
  const categories = CATEGORY_OPTIONS[kind];
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [thumb, setThumb] = useState<File | null>(null);
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  const [title, setTitle] = useState(project?.title ?? "");
  const [description, setDescription] = useState(project?.description ?? "");
  const [category, setCategory] = useState(project?.category ?? categories[0]?.id ?? "");
  const [status, setStatus] = useState<ProjectStatus>(project?.status ?? "published");
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<"idle" | "uploading" | "saving">("idle");
  const [error, setError] = useState<string | null>(null);
  const [displayRatio, setDisplayRatio] = useState(project?.displayRatio ?? "auto");
  const [assetMeta, setAssetMeta] = useState<{ width: number; height: number } | null>(
    project?.assetWidth && project?.assetHeight
      ? { width: project.assetWidth, height: project.assetHeight }
      : null
  );
  const [videoMeta, setVideoMeta] = useState<{ width: number; height: number; duration: number } | null>(
    project?.kind === "video" && project.durationSeconds
      ? {
          width: project.assetWidth ?? 0,
          height: project.assetHeight ?? 0,
          duration: project.durationSeconds,
        }
      : null
  );
  const [imageJob, setImageJob] = useState<{ kind: "asset" | "thumb"; file?: File; url?: string; name: string } | null>(
    null
  );
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const thumbInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const urls: string[] = [];
    if (file) {
      const url = URL.createObjectURL(file);
      urls.push(url);
      setFileUrl(url);
    }
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [file]);

  useEffect(() => {
    const urls: string[] = [];
    if (thumb) {
      const url = URL.createObjectURL(thumb);
      urls.push(url);
      setThumbUrl(url);
    }
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [thumb]);

  const detectVideo = (next: File) => {
    const url = URL.createObjectURL(next);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      setVideoMeta({
        width: video.videoWidth,
        height: video.videoHeight,
        duration: Number.isFinite(video.duration) ? video.duration : 0,
      });
      URL.revokeObjectURL(url);
    };
    video.onerror = () => URL.revokeObjectURL(url);
    video.src = url;
  };

  const pickFile = (next: File | undefined) => {
    if (!next) return;
    setError(null);
    const allowed = isVideo ? VIDEO_TYPES : IMAGE_TYPES;
    const max = isVideo ? MAX_VIDEO : MAX_IMAGE;
    if (!allowed.includes(next.type)) {
      setError(isVideo ? "Unsupported video format. Use MP4, WebM or MOV." : "Unsupported image. Use JPG, PNG, WebP or GIF.");
      return;
    }
    if (next.size > max) {
      setError(`File is too large. Maximum size is ${formatBytes(max)}.`);
      return;
    }
    if (!title.trim()) setTitle(next.name.replace(/\.[^.]+$/, ""));

    if (isVideo) {
      setFile(next);
      setVideoMeta(null);
      detectVideo(next);
      return;
    }

    // Images and covers open the editor before anything is uploaded.
    setImageJob({ kind: "asset", file: next, name: next.name });
  };

  const pickThumb = (next: File | undefined) => {
    if (!next) return;
    setError(null);
    if (!IMAGE_TYPES.includes(next.type)) {
      setError("The cover image must be a JPG, PNG, WebP or GIF.");
      return;
    }
    if (next.size > MAX_THUMB) {
      setError(`Cover image is too large. Maximum size is ${formatBytes(MAX_THUMB)}.`);
      return;
    }
    setImageJob({ kind: "thumb", file: next, name: next.name });
  };

  const applyEditedImage = (result: EditedImage) => {
    if (!imageJob) return;
    if (imageJob.kind === "asset") {
      setFile(result.file);
      setAssetMeta({ width: result.width, height: result.height });
    } else {
      setThumb(result.file);
    }
    setImageJob(null);
    setError(null);
  };

  /** Grab the frame currently shown in the video preview and edit it as the cover. */
  const captureCover = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) {
      setError("Load a video first, then capture a cover frame.");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      setError("Cover capture is not supported in this browser.");
      return;
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setError("Could not capture a cover frame.");
          return;
        }
        const captured = new File([blob], "video-cover.jpg", { type: "image/jpeg" });
        setImageJob({ kind: "thumb", file: captured, name: "video-cover" });
      },
      "image/jpeg",
      0.95
    );
  };

  const save = async () => {
    if (!title.trim()) {
      setError("Add a title before saving.");
      return;
    }
    if (!project && !file) {
      setError(isVideo ? "Choose a video file to upload." : "Choose an image to upload.");
      return;
    }

    setError(null);
    const created: string[] = [];
    try {
      let assetKey: string | undefined;
      let thumbKey: string | null | undefined;

      if (file) {
        setPhase("uploading");
        setProgress(0);
        const uploaded = await uploadFile(file, isVideo ? "video" : "graphic", setProgress);
        created.push(uploaded.key);
        assetKey = uploaded.key;
      }

      if (thumb) {
        setPhase("uploading");
        const uploadedThumb = await uploadFile(thumb, "thumbnail", () => undefined);
        created.push(uploadedThumb.key);
        thumbKey = uploadedThumb.key;
      }

      setPhase("saving");

      if (project) {
        await api.updateProject(project.id, {
          title: title.trim(),
          description: description.trim(),
          category,
          status,
          displayRatio,
          ...(assetKey ? { assetKey } : {}),
          ...(thumbKey !== undefined ? { thumbKey } : {}),
          ...(assetMeta ? { assetWidth: assetMeta.width, assetHeight: assetMeta.height } : {}),
          ...(videoMeta
            ? { assetWidth: videoMeta.width, assetHeight: videoMeta.height, durationSeconds: videoMeta.duration }
            : {}),
        });
        onSaved(`“${title.trim()}” saved.`);
      } else {
        await api.createProject({
          kind,
          title: title.trim(),
          description: description.trim(),
          category,
          assetKey: assetKey as string,
          thumbKey: thumbKey ?? null,
          status,
          displayRatio,
          assetWidth: videoMeta?.width ?? assetMeta?.width ?? null,
          assetHeight: videoMeta?.height ?? assetMeta?.height ?? null,
          durationSeconds: videoMeta?.duration ?? null,
        });
        onSaved(
          `“${title.trim()}” ${status === "published" ? "published to the public portfolio" : "saved as a draft"}.`
        );
      }
      invalidatePublishedProjects();
    } catch (err) {
      for (const key of created) {
        await api.deleteUpload(key).catch(() => undefined);
      }
      setPhase("idle");
      setError(err instanceof Error ? err.message : "Could not save this item.");
    }
  };

  const previewSrc = fileUrl ?? project?.assetUrl ?? null;

  return (
    <div
      className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={project ? "Edit media" : `Add new ${isVideo ? "video" : "screen"}`}
    >
      <div
        className="relative my-4 w-full max-w-3xl overflow-hidden rounded-2xl border border-white/12 bg-[linear-gradient(165deg,#1a1f26_0%,#0c0f13_60%,#07090c_100%)] shadow-[0_60px_140px_-60px_rgba(0,0,0,1)]"
        onClick={(event) => event.stopPropagation()}
      >
        <span className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />

        {imageJob && (
          <ImageEditor
            open
            file={imageJob.file}
            url={imageJob.url}
            name={imageJob.name}
            title={imageJob.kind === "thumb" ? "Edit cover image" : "Edit graphic design"}
            subtitle={
              imageJob.kind === "thumb"
                ? "The composition is saved as the video cover"
                : "Nothing is published until you save the project after editing"
            }
            defaultAspect={imageJob.kind === "thumb" ? ("16:9" as AspectId) : "original"}
            onCancel={() => setImageJob(null)}
            onApply={applyEditedImage}
          />
        )}

        <header className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-3.5">
          <div>
            <p className="text-[9px] uppercase tracking-[0.28em] text-white/40">
              {project ? "Edit" : "New"} · {isVideo ? "Video project" : "LED screen"}
            </p>
            <p className="mt-1 text-[13px] font-medium text-white">
              {project ? project.title : isVideo ? "Add a video to the portfolio" : "Add a new LED screen"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 place-items-center rounded-full border border-white/12 text-white/55 transition-colors hover:border-white/30 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </header>

        <div className="grid gap-4 p-5 sm:grid-cols-2">
          {/* media */}
          <div className="space-y-3">
            <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black">
              {previewSrc ? (
                isVideo && (file || project) ? (
                  <video
                    key={previewSrc}
                    ref={videoRef}
                    src={previewSrc}
                    controls
                    playsInline
                    preload="metadata"
                    poster={thumbUrl ?? project?.thumbUrl ?? undefined}
                    onLoadedMetadata={(event) => {
                      const element = event.currentTarget;
                      if (!element.videoWidth) return;
                      setVideoMeta((current) =>
                        current ?? {
                          width: element.videoWidth,
                          height: element.videoHeight,
                          duration: Number.isFinite(element.duration) ? element.duration : 0,
                        }
                      );
                    }}
                    style={{
                      aspectRatio:
                        videoMeta && videoMeta.width && videoMeta.height
                          ? `${videoMeta.width} / ${videoMeta.height}`
                          : "16 / 9",
                    }}
                    className="max-h-64 w-full bg-black object-contain"
                  />
                ) : (
                  <img src={previewSrc} alt="Selected media preview" className="max-h-64 w-full object-contain" />
                )
              ) : (
                <div className="grid aspect-video place-items-center text-white/25">
                  <div className="text-center">
                    {isVideo ? <Video className="mx-auto h-7 w-7" /> : <ImageIcon className="mx-auto h-7 w-7" />}
                    <p className="mt-2 text-[9px] uppercase tracking-[0.18em]">No media selected</p>
                  </div>
                </div>
              )}
              <span className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.05] px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-white/70 transition-colors hover:border-white/30 hover:text-white"
              >
                <Upload className="h-3 w-3" />
                {project ? (file ? "Change file" : "Replace media") : "Choose file"}
              </button>
              {isVideo && (
                <>
                  <button
                    type="button"
                    onClick={() => thumbInput.current?.click()}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.05] px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-white/70 transition-colors hover:border-white/30 hover:text-white"
                  >
                    <ImagePlus className="h-3 w-3" />
                    Cover
                  </button>
                  <button
                    type="button"
                    onClick={captureCover}
                    disabled={!previewSrc}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.05] px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-white/70 transition-colors hover:border-white/30 hover:text-white disabled:opacity-40"
                    title="Use the current video frame as the cover"
                  >
                    <Crop className="h-3 w-3" />
                    Frame
                  </button>
                </>
              )}
            </div>

            <input
              ref={fileInput}
              type="file"
              accept={(isVideo ? VIDEO_TYPES : IMAGE_TYPES).join(",")}
              className="hidden"
              onChange={(event) => {
                pickFile(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
            <input
              ref={thumbInput}
              type="file"
              accept={IMAGE_TYPES.join(",")}
              className="hidden"
              onChange={(event) => {
                pickThumb(event.target.files?.[0]);
                event.target.value = "";
              }}
            />

            {(file || thumb || project) && (
              <p className="text-[9px] uppercase tracking-[0.14em] text-white/30">
                {file ? `${file.name} · ${formatBytes(file.size)}` : project ? `Stored · ${formatBytes(project.assetSize)}` : ""}
                {thumb ? ` · cover ${formatBytes(thumb.size)}` : ""}
              </p>
            )}

            {isVideo && (videoMeta || project) && (
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  {
                    label: "Dimensions",
                    value:
                      videoMeta?.width && videoMeta?.height
                        ? `${videoMeta.width}×${videoMeta.height}`
                        : project?.assetWidth && project?.assetHeight
                          ? `${project.assetWidth}×${project.assetHeight}`
                          : "—",
                  },
                  {
                    label: "Aspect",
                    value:
                      videoMeta?.width && videoMeta?.height
                        ? (videoMeta.width / videoMeta.height).toFixed(2)
                        : project?.assetWidth && project?.assetHeight
                          ? (project.assetWidth / project.assetHeight).toFixed(2)
                          : "—",
                  },
                  { label: "Duration", value: formatDuration(videoMeta?.duration ?? project?.durationSeconds ?? null) },
                ].map((item) => (
                  <div key={item.label} className="rounded-lg border border-white/[0.08] bg-black/25 px-2 py-1.5">
                    <p className="flex items-center gap-1 text-[7px] uppercase tracking-[0.16em] text-white/30">
                      {item.label === "Duration" && <Timer className="h-2.5 w-2.5" />}
                      {item.label}
                    </p>
                    <p className="mt-0.5 truncate text-[9.5px] text-white/70">{item.value}</p>
                  </div>
                ))}
              </div>
            )}

            {thumbUrl && <img src={thumbUrl} alt="Cover preview" className="h-20 w-full rounded-lg object-cover" />}
          </div>

          {/* fields */}
          <div className="space-y-3">
            <Field label={isVideo ? "Video title" : "Project title"}>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={120}
                className={inputCls}
                placeholder={isVideo ? "e.g. Creator Brand Film" : "e.g. Podcast Thumbnail"}
              />
            </Field>

            <Field label="Description" hint={`${description.length}/2000`}>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={2000}
                rows={3}
                className={inputCls}
                placeholder="Short context shown with the public piece."
              />
            </Field>

            <Field label="Category">
              <select value={category} onChange={(event) => setCategory(event.target.value)} className={inputCls}>
                {categories.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Screen layout" hint="Adapts to the file when set to auto">
              <select
                value={displayRatio}
                onChange={(event) => setDisplayRatio(event.target.value)}
                className={inputCls}
              >
                {SCREEN_RATIOS.map((ratio) => (
                  <option key={ratio} value={ratio}>
                    {ratioLabel(ratio)}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Visibility">
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as ProjectStatus)}
                className={inputCls}
              >
                <option value="published">Published — visible on the site</option>
                <option value="draft">Draft — hidden from visitors</option>
              </select>
            </Field>

            {phase !== "idle" && (
              <div className="space-y-1">
                <Progress value={phase === "saving" ? 100 : progress} />
                <p className="text-[9px] uppercase tracking-[0.14em] text-white/40">
                  {phase === "uploading" ? `Uploading ${progress}%` : "Saving to database…"}
                </p>
              </div>
            )}

            {error && <Notice tone="error">{error}</Notice>}

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => void save()}
                disabled={phase !== "idle"}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-white px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-950 transition-all hover:-translate-y-0.5 hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-55"
              >
                {phase !== "idle" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                {phase === "uploading" ? "Uploading…" : phase === "saving" ? "Saving…" : project ? "Save changes" : "Upload & publish"}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={phase !== "idle"}
                className="rounded-full border border-white/15 px-4 py-2.5 text-[10px] uppercase tracking-[0.14em] text-white/60 transition-colors hover:border-white/30 hover:text-white disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- the manager ------------------------------- */

export function MediaManager({ kind }: { kind: ProjectKind }) {
  const isVideo = kind === "video";
  const heading = isVideo ? "Video Portfolio Management" : "Graphic Design Management";
  const addLabel = isVideo ? "Add New Video" : "Add New Screen";
  const emptyLabel = isVideo
    ? "No videos yet. Add your first video to publish it inside the monitor frames."
    : "No screens yet. Add your first design to light up a new LED screen.";

  const [projects, setProjects] = useState<AdminProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editing, setEditing] = useState<AdminProject | "new" | null>(null);
  const [deleting, setDeleting] = useState<AdminProject | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [preview, setPreview] = useState<AdminProject | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [result] = await Promise.all([api.projects(kind), api.status().catch(() => null)]);
      setProjects(result.projects.filter((project) => project.kind === kind));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load this collection.");
    } finally {
      setLoading(false);
    }
  }, [kind]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleStatus = async (project: AdminProject) => {
    setBusyId(project.id);
    setError(null);
    try {
      const next = project.status === "published" ? "draft" : "published";
      await api.updateProject(project.id, { status: next });
      setProjects((current) => current.map((item) => (item.id === project.id ? { ...item, status: next } : item)));
      setNotice(
        next === "published"
          ? `“${project.title}” is now live in ${categoryLabel(kind, project.category)}.`
          : `“${project.title}” unpublished and hidden from visitors.`
      );
      invalidatePublishedProjects();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not change visibility.");
    } finally {
      setBusyId(null);
    }
  };

  const move = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= projects.length) return;
    const next = [...projects];
    [next[index], next[target]] = [next[target], next[index]];
    setProjects(next);
    setBusyId(next[target].id);
    try {
      await api.reorderProjects(next.map((project) => project.id));
      setNotice("Order saved. The public grid follows this order.");
      invalidatePublishedProjects();
    } catch (err) {
      setProjects(projects);
      setError(err instanceof Error ? err.message : "Could not save the new order.");
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setBusyId(deleting.id);
    try {
      await api.deleteProject(deleting.id);
      setProjects((current) => current.filter((project) => project.id !== deleting.id));
      setNotice(`“${deleting.title}” deleted from the portfolio and storage.`);
      invalidatePublishedProjects();
      setDeleting(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete this item.");
    } finally {
      setBusyId(null);
    }
  };

  const published = projects.filter((project) => project.status === "published").length;

  return (
    <section
      aria-label={heading}
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.055] to-white/[0.012] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)] backdrop-blur"
    >
      <div className="pointer-events-none absolute -left-24 -top-24 h-56 w-56 rounded-full bg-cyan-400/[0.06] blur-3xl" />

      <div className="relative flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[9px] uppercase tracking-[0.3em] text-white/35">
            {isVideo ? "Media · video" : "Media · graphic"}
          </p>
          <h2 className="mt-1.5 flex items-center gap-2 text-[15px] font-semibold tracking-tight text-white">
            {isVideo ? <Video className="h-4 w-4 text-white/50" /> : <ImageIcon className="h-4 w-4 text-white/50" />}
            {heading}
          </h2>
          <p className="mt-1 text-[10px] text-white/40">
            {projects.length} item{projects.length === 1 ? "" : "s"} · {published} published · stored in D1 + R2
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setNotice(null);
            setEditing("new");
          }}
          className="group inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-950 transition-all hover:-translate-y-0.5 hover:bg-neutral-200 active:translate-y-0"
        >
          <Plus className="h-3.5 w-3.5" />
          {addLabel}
        </button>
      </div>

      {(error || notice) && (
        <div className="relative mt-3 space-y-2">
          {error && <Notice tone="error">{error}</Notice>}
          {notice && <Notice tone="success">{notice}</Notice>}
        </div>
      )}

      <div className="relative mt-4">
        {loading ? (
          <p className="flex items-center gap-2 py-10 text-[11px] text-white/40">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Reading {isVideo ? "videos" : "screens"} from the database…
          </p>
        ) : projects.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/12 bg-black/20 px-4 py-10 text-center">
            <p className="text-[11px] text-white/45">{emptyLabel}</p>
            <button
              type="button"
              onClick={() => setEditing("new")}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-white/20 px-3.5 py-2 text-[10px] uppercase tracking-[0.14em] text-white/70 transition-colors hover:border-white/40 hover:text-white"
            >
              <Plus className="h-3 w-3" /> {addLabel}
            </button>
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {projects.map((project, index) => (
              <li
                key={project.id}
                className={cn(
                  "group relative overflow-hidden rounded-xl border bg-black/30",
                  project.status === "published" ? "border-white/12" : "border-amber-300/25"
                )}
              >
                <button
                  type="button"
                  onClick={() => setPreview(project)}
                  className="relative block w-full overflow-hidden text-left"
                  aria-label={`Preview ${project.title}`}
                >
                  {isVideo ? (
                    project.thumbUrl ? (
                      <img src={project.thumbUrl} alt="" className="aspect-video w-full object-cover" />
                    ) : (
                      <span className="grid aspect-video w-full place-items-center bg-black text-white/25">
                        <Video className="h-5 w-5" />
                      </span>
                    )
                  ) : (
                    <img
                      src={project.assetUrl}
                      alt=""
                      className="w-full object-cover"
                      style={{
                        aspectRatio:
                          project.displayRatio && project.displayRatio !== "auto"
                            ? project.displayRatio.replace("/", " / ")
                            : project.assetWidth && project.assetHeight
                              ? `${project.assetWidth} / ${project.assetHeight}`
                              : "16 / 10",
                      }}
                    />
                  )}
                  <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-70 transition-opacity group-hover:opacity-95" />
                  <span className="pointer-events-none absolute inset-x-0 bottom-0 p-2.5">
                    <span className="block truncate text-[11px] font-medium text-white">{project.title}</span>
                    <span className="mt-0.5 block truncate text-[9px] uppercase tracking-[0.14em] text-white/55">
                      {categoryLabel(kind, project.category)}
                    </span>
                  </span>
                  <span className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-md border border-white/20 bg-black/60 text-white/80 opacity-0 backdrop-blur transition-opacity group-hover:opacity-100">
                    <Eye className="h-3 w-3" />
                  </span>
                </button>

                <div className="flex items-center justify-between gap-1 border-t border-white/[0.07] px-2 py-1.5">
                  <span
                    className={cn(
                      "rounded-full border px-1.5 py-0.5 text-[8px] uppercase tracking-[0.14em]",
                      project.status === "published"
                        ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                        : "border-amber-300/30 bg-amber-400/10 text-amber-200"
                    )}
                  >
                    {project.status}
                  </span>
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => void move(index, -1)}
                      disabled={index === 0 || busyId === project.id}
                      aria-label={`Move ${project.title} up`}
                      className="grid h-6 w-6 place-items-center rounded text-white/45 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-25"
                    >
                      <ArrowUp className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void move(index, 1)}
                      disabled={index === projects.length - 1 || busyId === project.id}
                      aria-label={`Move ${project.title} down`}
                      className="grid h-6 w-6 place-items-center rounded text-white/45 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-25"
                    >
                      <ArrowDown className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditing(project)}
                      aria-label={`Edit ${project.title}`}
                      className="grid h-6 w-6 place-items-center rounded text-white/45 transition-colors hover:bg-white/10 hover:text-white"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void toggleStatus(project)}
                      disabled={busyId === project.id}
                      aria-label={project.status === "published" ? `Unpublish ${project.title}` : `Publish ${project.title}`}
                      className="grid h-6 w-6 place-items-center rounded text-white/45 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-40"
                    >
                      {busyId === project.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : project.status === "published" ? (
                        <EyeOff className="h-3 w-3" />
                      ) : (
                        <Eye className="h-3 w-3" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleting(project)}
                      aria-label={`Delete ${project.title}`}
                      className="grid h-6 w-6 place-items-center rounded text-white/45 transition-colors hover:bg-red-500/15 hover:text-red-300"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="relative mt-3 text-[9px] uppercase tracking-[0.14em] text-white/25">
        {isVideo
          ? "MP4 / WebM / MOV · up to 90 MB · published videos play inside the monitor frames"
          : "JPG / PNG / WebP / GIF · up to 8 MB · published screens appear in their category"}
      </p>

      {editing !== null && (
        <MediaEditor
          kind={kind}
          project={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(message) => {
            setEditing(null);
            setNotice(message);
            setError(null);
            void load();
          }}
        />
      )}

      {deleting && (
        <div
          className="fixed inset-0 z-[80] grid place-items-center bg-black/75 p-4 backdrop-blur-sm"
          onClick={() => setDeleting(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-md rounded-2xl border border-red-400/25 bg-[#0c0f13] p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-red-400/30 bg-red-500/10 text-red-300">
                <AlertTriangle className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[13px] font-medium text-white">Delete “{deleting.title}”?</p>
                <p className="mt-1 text-[11px] leading-relaxed text-white/45">
                  The project row is removed from D1 and the stored file is deleted from R2. This cannot be undone.
                </p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleting(null)}
                className="rounded-full border border-white/15 px-4 py-2 text-[10px] uppercase tracking-[0.14em] text-white/60 transition-colors hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmDelete()}
                disabled={busyId === deleting.id}
                className="inline-flex items-center gap-2 rounded-full bg-red-500 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white transition-colors hover:bg-red-400 disabled:opacity-60"
              >
                {busyId === deleting.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {preview && !isVideo && (
        <ProjectPreviewDialog
          open
          onOpenChange={(value) => !value && setPreview(null)}
          title={preview.title}
          subtitle={categoryLabel(kind, preview.category)}
          imageUrl={preview.assetUrl}
          description={preview.description}
        />
      )}

      {preview && isVideo && (
        <VideoPlayerDialog
          open
          onOpenChange={(value) => !value && setPreview(null)}
          title={preview.title}
          subtitle={categoryLabel(kind, preview.category)}
          videoUrl={preview.assetUrl}
          posterUrl={preview.thumbUrl}
          description={preview.description}
        />
      )}
    </section>
  );
}

/** Categories are exported for the dashboard summary line. */
export function mediaCategories(kind: ProjectKind) {
  return CATEGORY_OPTIONS[kind];
}
