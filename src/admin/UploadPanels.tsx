import { useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, FolderOpen, ImagePlus, Loader2, Trash2, Upload, Video } from "lucide-react";
import { cn } from "@/lib/utils";
import { api, formatBytes, uploadFile, type ProjectStatus } from "@/admin/api";
import { PROJECT_CLASSIFICATIONS } from "@/lib/classification";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
const MAX_IMAGE = 8 * 1024 * 1024;
const MAX_VIDEO = 5 * 1024 * 1024 * 1024;
const MAX_THUMB = 5 * 1024 * 1024;

const inputCls =
  "mt-1.5 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-white/25 focus:border-white/45";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-white/50">
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
      className={cn(
        "flex items-start gap-2 rounded-lg border px-3 py-2 text-xs",
        tone === "error"
          ? "border-red-400/25 bg-red-500/10 text-red-200"
          : tone === "success"
            ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-200"
            : "border-white/10 bg-white/[0.03] text-white/50"
      )}
    >
      {tone === "error" ? (
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      ) : tone === "success" ? (
        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      ) : null}
      <span>{children}</span>
    </p>
  );
}

function Progress({ value }: { value: number }) {
  return (
    <span className="block h-1 w-full overflow-hidden rounded-full bg-white/10">
      <span
        className="block h-full rounded-full bg-gradient-to-r from-white/60 to-white transition-all duration-300"
        style={{ width: `${value}%` }}
      />
    </span>
  );
}

type ItemStatus = "ready" | "uploading" | "done" | "error";
type Item = { id: string; file: File; url: string; status: ItemStatus; progress: number; message?: string };

function stripExtension(name: string): string {
  return name.replace(/\.[^.]+$/, "");
}

function createItem(file: File): Item {
  return {
    id: crypto.randomUUID(),
    file,
    url: URL.createObjectURL(file),
    status: "ready",
    progress: 0,
  };
}

/* ------------------------------ graphic uploads ---------------------------- */

function GraphicUpload({ categories, onUploaded }: { categories: { id: string; label: string }[]; onUploaded: () => void }) {
  const [items, setItems] = useState<Item[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(categories[0]?.id ?? "gaming");
  const [classification, setClassification] = useState<string>(PROJECT_CLASSIFICATIONS[0].id);
  const [status, setStatus] = useState<ProjectStatus>("published");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fileInput = useRef<HTMLInputElement>(null);
  const folderInput = useRef<HTMLInputElement>(null);
  const urls = useRef<string[]>([]);

  useEffect(
    () => () => {
      urls.current.forEach((url) => URL.revokeObjectURL(url));
      urls.current = [];
    },
    []
  );

  const addFiles = (list: FileList | null) => {
    if (!list?.length) return;
    setError(null);
    setSuccess(null);

    const accepted: Item[] = [];
    const rejected: string[] = [];

    Array.from(list).forEach((file) => {
      if (!IMAGE_TYPES.includes(file.type)) {
        rejected.push(`${file.name} — unsupported format`);
        return;
      }
      if (file.size > MAX_IMAGE) {
        rejected.push(`${file.name} — larger than ${formatBytes(MAX_IMAGE)}`);
        return;
      }
      const item = createItem(file);
      urls.current.push(item.url);
      accepted.push(item);
    });

    if (accepted.length) {
      setItems((current) => [...current, ...accepted].slice(0, 40));
      setSuccess(`${accepted.length} image${accepted.length === 1 ? "" : "s"} ready to upload.`);
    }
    if (rejected.length) setError(rejected.slice(0, 4).join(" · "));
  };

  const removeItem = (id: string) => {
    setItems((current) => {
      const target = current.find((item) => item.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return current.filter((item) => item.id !== id);
    });
  };

  const updateItem = (id: string, patch: Partial<Item>) => {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const uploadAll = async () => {
    const ready = items.filter((item) => item.status !== "done");
    if (!ready.length) {
      setError("Choose at least one image first.");
      return;
    }

    setBusy(true);
    setError(null);
    setSuccess(null);

    let published = 0;
    for (let index = 0; index < ready.length; index += 1) {
      const item = ready[index];
      updateItem(item.id, { status: "uploading", progress: 0, message: "Uploading…" });
      let uploadedKey: string | null = null;
      try {
        const upload = await uploadFile(item.file, "graphic", (progress) =>
          updateItem(item.id, { progress })
        );
        uploadedKey = upload.key;
        const finalTitle =
          ready.length > 1
            ? `${title.trim() || "Graphic Project"} ${String(index + 1).padStart(2, "0")}`
            : title.trim() || stripExtension(item.file.name);

        await api.createProject({
          kind: "graphic",
          title: finalTitle,
          description: description.trim(),
          category,
          classification,
          assetKey: upload.key,
          status,
        });

        published += 1;
        updateItem(item.id, {
          status: "done",
          progress: 100,
          message: status === "published" ? "Published" : "Saved as draft",
        });
      } catch (err) {
        if (uploadedKey) await api.deleteUpload(uploadedKey).catch(() => undefined);
        updateItem(item.id, {
          status: "error",
          message: err instanceof Error ? err.message : "Upload failed",
        });
      }
    }

    setBusy(false);
    if (published) {
      setSuccess(
        `${published} project${published === 1 ? "" : "s"} ${status === "published" ? "published to the public portfolio" : "saved as draft"}.`
      );
      onUploaded();
    }
  };

  const doneCount = items.filter((item) => item.status === "done").length;

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[1.25fr_1fr]">
        <div className="space-y-4 rounded-xl border border-white/10 bg-white/[0.02] p-4 sm:p-5">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/45">1 · Select images</p>
            <p className="mt-1 text-[11px] text-white/35">JPG, PNG, WebP or GIF · up to {formatBytes(MAX_IMAGE)} each</p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-[11px] uppercase tracking-[0.14em] text-white/70 transition-colors hover:border-white/30 hover:bg-white/10 hover:text-white"
            >
              <ImagePlus className="h-4 w-4" />
              Select images
            </button>
            <button
              type="button"
              onClick={() => folderInput.current?.click()}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-[11px] uppercase tracking-[0.14em] text-white/70 transition-colors hover:border-white/30 hover:bg-white/10 hover:text-white"
            >
              <FolderOpen className="h-4 w-4" />
              Select folder
            </button>
            <input
              ref={fileInput}
              type="file"
              accept={IMAGE_TYPES.join(",")}
              multiple
              className="hidden"
              onChange={(event) => {
                addFiles(event.target.files);
                event.target.value = "";
              }}
            />
            <input
              ref={folderInput}
              type="file"
              multiple
              className="hidden"
              {...({ webkitdirectory: "", directory: "" } as Record<string, string>)}
              onChange={(event) => {
                addFiles(event.target.files);
                event.target.value = "";
              }}
            />
          </div>

          {items.length > 0 && (
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {items.map((item) => (
                <li key={item.id} className="group relative overflow-hidden rounded-lg border border-white/10 bg-black">
                  <img src={item.url} alt={item.file.name} className="aspect-[4/3] w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    disabled={busy}
                    aria-label={`Remove ${item.file.name}`}
                    className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-md border border-white/20 bg-black/70 text-white/70 opacity-0 backdrop-blur transition-opacity hover:text-white group-hover:opacity-100 disabled:opacity-0"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                  <div className="space-y-1 p-2">
                    <p className="truncate text-[10px] text-white/60">{item.file.name}</p>
                    <Progress value={item.progress} />
                    <p
                      className={cn(
                        "text-[9px] uppercase tracking-[0.12em]",
                        item.status === "error" ? "text-red-300" : item.status === "done" ? "text-emerald-300" : "text-white/35"
                      )}
                    >
                      {item.message ?? `${formatBytes(item.file.size)}`}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-4 rounded-xl border border-white/10 bg-white/[0.02] p-4 sm:p-5">
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/45">2 · Project details</p>

          <Field label="Project title" hint="required for single uploads">
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} className={inputCls} placeholder="e.g. Podcast Thumbnail" />
          </Field>

          <Field label="Description" hint={`${description.length}/2000`}>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} rows={4} className={inputCls} placeholder="Short context for the public gallery." />
          </Field>

          <Field label="Category">
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
              {categories.map((option) => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </select>
          </Field>

          <Field label="Project Classification" hint="required">
            <select
              value={classification}
              onChange={(e) => setClassification(e.target.value)}
              className={inputCls}
              required
            >
              {PROJECT_CLASSIFICATIONS.map((option) => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </select>
          </Field>

          <Field label="Visibility">
            <select value={status} onChange={(e) => setStatus(e.target.value as ProjectStatus)} className={inputCls}>
              <option value="published">Publish immediately</option>
              <option value="draft">Save as draft</option>
            </select>
          </Field>

          <button
            type="button"
            onClick={() => void uploadAll()}
            disabled={busy || items.length === 0}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-950 transition-all hover:-translate-y-0.5 hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {busy ? "Uploading…" : `Upload & ${status === "published" ? "publish" : "save draft"}`}
          </button>

          {error && <Notice tone="error">{error}</Notice>}
          {success && <Notice tone="success">{success}</Notice>}
          {doneCount > 0 && !busy && (
            <button
              type="button"
              onClick={() => {
                items.forEach((item) => URL.revokeObjectURL(item.url));
                setItems([]);
                setTitle("");
                setSuccess(null);
              }}
              className="text-[10px] uppercase tracking-[0.16em] text-white/35 transition-colors hover:text-white"
            >
              Clear completed list
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- video uploads ---------------------------- */

function VideoUpload({ categories, onUploaded }: { categories: { id: string; label: string }[]; onUploaded: () => void }) {
  const [video, setVideo] = useState<{ file: File; url: string } | null>(null);
  const [thumb, setThumb] = useState<{ file: File; url: string } | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(categories[0]?.id ?? "gaming");
  const [classification, setClassification] = useState<string>(PROJECT_CLASSIFICATIONS[0].id);
  const [status, setStatus] = useState<ProjectStatus>("published");
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<"idle" | "uploading" | "publishing" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const videoInput = useRef<HTMLInputElement>(null);
  const thumbInput = useRef<HTMLInputElement>(null);
  const urls = useRef<string[]>([]);

  useEffect(
    () => () => {
      urls.current.forEach((url) => URL.revokeObjectURL(url));
      urls.current = [];
    },
    []
  );

  const setVideoFile = (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setSuccess(null);
    if (!VIDEO_TYPES.includes(file.type)) {
      setError("Unsupported video format. Use MP4, WebM or MOV.");
      return;
    }
    if (file.size > MAX_VIDEO) {
      setError(`Video is too large. Maximum size is ${formatBytes(MAX_VIDEO)}.`);
      return;
    }
    if (video) URL.revokeObjectURL(video.url);
    const next = { file, url: URL.createObjectURL(file) };
    urls.current.push(next.url);
    setVideo(next);
    if (!title) setTitle(stripExtension(file.name));
    setProgress(0);
    setPhase("idle");
  };

  const setThumbFile = (file: File | undefined) => {
    if (!file) return;
    setError(null);
    if (!IMAGE_TYPES.includes(file.type)) {
      setError("Thumbnail must be a JPG, PNG, WebP or GIF image.");
      return;
    }
    if (file.size > MAX_THUMB) {
      setError(`Thumbnail is too large. Maximum size is ${formatBytes(MAX_THUMB)}.`);
      return;
    }
    if (thumb) URL.revokeObjectURL(thumb.url);
    const next = { file, url: URL.createObjectURL(file) };
    urls.current.push(next.url);
    setThumb(next);
  };

  const upload = async () => {
    if (!video) {
      setError("Choose a video file first.");
      return;
    }
    if (!title.trim()) {
      setError("Add a title for this video.");
      return;
    }

    setError(null);
    setSuccess(null);
    setPhase("uploading");
    setProgress(0);

    const cleanupKeys: string[] = [];

    try {
      const uploaded = await uploadFile(video.file, "video", setProgress);
      cleanupKeys.push(uploaded.key);
      let thumbKey: string | null = null;

      if (thumb) {
        setPhase("publishing");
        const uploadedThumb = await uploadFile(thumb.file, "thumbnail", () => undefined);
        cleanupKeys.push(uploadedThumb.key);
        thumbKey = uploadedThumb.key;
      }

      setPhase("publishing");
      await api.createProject({
        kind: "video",
        title: title.trim(),
        description: description.trim(),
        category,
        classification,
        assetKey: uploaded.key,
        thumbKey,
        status,
      });

      setPhase("done");
      setSuccess(
        `Video ${status === "published" ? "published to the Video Editing section" : "saved as draft"}.`
      );
      onUploaded();
      urls.current.forEach((url) => URL.revokeObjectURL(url));
      urls.current = [];
      if (video) URL.revokeObjectURL(video.url);
      if (thumb) URL.revokeObjectURL(thumb.url);
      setVideo(null);
      setThumb(null);
      setTitle("");
      setDescription("");
      setProgress(0);
    } catch (err) {
      for (const key of cleanupKeys) {
        await api.deleteUpload(key).catch(() => undefined);
      }
      setPhase("idle");
      setError(err instanceof Error ? err.message : "Upload failed.");
    }
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[1.15fr_1fr]">
      <div className="space-y-4 rounded-xl border border-white/10 bg-white/[0.02] p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/45">1 · Select video</p>
            <p className="mt-1 text-[11px] text-white/35">MP4, WebM or MOV · up to {formatBytes(MAX_VIDEO)}</p>
          </div>
          <button
            type="button"
            onClick={() => videoInput.current?.click()}
            className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            <Video className="h-3.5 w-3.5" />
            Choose file
          </button>
          <input
            ref={videoInput}
            type="file"
            accept={VIDEO_TYPES.join(",")}
            className="hidden"
            onChange={(event) => {
              setVideoFile(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
        </div>

        <div className="relative overflow-hidden rounded-lg border border-white/10 bg-black">
          {video ? (
            <video src={video.url} controls playsInline preload="metadata" className="aspect-video w-full bg-black" />
          ) : (
            <div className="grid aspect-video place-items-center text-white/30">
              <div className="text-center">
                <Video className="mx-auto h-7 w-7" />
                <p className="mt-2 text-[10px] uppercase tracking-[0.18em]">No video selected</p>
              </div>
            </div>
          )}
        </div>

        {video && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.14em] text-white/40">
              <span className="truncate">{video.file.name}</span>
              <span>{formatBytes(video.file.size)}</span>
            </div>
            {phase !== "idle" && (
              <div className="space-y-1">
                <Progress value={phase === "done" ? 100 : progress} />
                <p className="text-[9px] uppercase tracking-[0.14em] text-white/35">
                  {phase === "uploading" ? `Uploading ${progress}%` : phase === "publishing" ? "Publishing…" : "Uploaded"}
                </p>
              </div>
            )}
          </div>
        )}

        <div className="rounded-lg border border-white/10 bg-black/30 p-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-[0.16em] text-white/45">Cover image (optional)</p>
            <button
              type="button"
              onClick={() => thumbInput.current?.click()}
              className="text-[10px] uppercase tracking-[0.14em] text-white/50 transition-colors hover:text-white"
            >
              {thumb ? "Replace" : "Choose"}
            </button>
            <input
              ref={thumbInput}
              type="file"
              accept={IMAGE_TYPES.join(",")}
              className="hidden"
              onChange={(event) => {
                setThumbFile(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
          </div>
          {thumb ? (
            <img src={thumb.url} alt="Thumbnail preview" className="mt-2 h-24 w-full rounded-md object-cover" />
          ) : (
            <p className="mt-2 text-[11px] text-white/30">A poster frame keeps the public grid light and fast.</p>
          )}
        </div>
      </div>

      <div className="space-y-4 rounded-xl border border-white/10 bg-white/[0.02] p-4 sm:p-5">
        <p className="text-[10px] uppercase tracking-[0.2em] text-white/45">2 · Project details</p>

        <Field label="Video title">
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} className={inputCls} placeholder="e.g. Creator Brand Film" />
        </Field>

        <Field label="Description" hint={`${description.length}/2000`}>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} rows={4} className={inputCls} placeholder="What was edited, and for whom." />
        </Field>

        <Field label="Category">
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
            {categories.map((option) => (
              <option key={option.id} value={option.id}>{option.label}</option>
            ))}
          </select>
        </Field>

        <Field label="Project Classification" hint="required">
          <select
            value={classification}
            onChange={(e) => setClassification(e.target.value)}
            className={inputCls}
            required
          >
            {PROJECT_CLASSIFICATIONS.map((option) => (
              <option key={option.id} value={option.id}>{option.label}</option>
            ))}
          </select>
        </Field>

        <Field label="Visibility">
          <select value={status} onChange={(e) => setStatus(e.target.value as ProjectStatus)} className={inputCls}>
            <option value="published">Publish immediately</option>
            <option value="draft">Save as draft</option>
          </select>
        </Field>

        <button
          type="button"
          onClick={() => void upload()}
          disabled={!video || phase === "uploading" || phase === "publishing"}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-950 transition-all hover:-translate-y-0.5 hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {phase === "uploading" || phase === "publishing" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {phase === "uploading" ? "Uploading…" : phase === "publishing" ? "Publishing…" : "Upload & publish"}
        </button>

        {error && <Notice tone="error">{error}</Notice>}
        {success && <Notice tone="success">{success}</Notice>}
      </div>
    </div>
  );
}

export function UploadPanel({
  kind,
  categories,
  onUploaded,
}: {
  kind: "graphic" | "video";
  categories: { id: string; label: string }[];
  onUploaded: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 sm:px-5">
        <p className="text-sm text-white">
          {kind === "graphic" ? "Upload graphic projects" : "Upload video projects"}
        </p>
        <p className="mt-1 text-[11px] leading-5 text-white/40">
          Files are stored in your private Backblaze B2 bucket through authenticated, server-signed
          requests. Large videos upload in parts. Published projects appear automatically in the matching
          public category.
        </p>
      </div>

      {kind === "graphic" ? (
        <GraphicUpload categories={categories} onUploaded={onUploaded} />
      ) : (
        <VideoUpload categories={categories} onUploaded={onUploaded} />
      )}
    </div>
  );
}
