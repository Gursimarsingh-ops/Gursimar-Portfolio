import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clapperboard,
  Eye,
  ExternalLink,
  Image as ImageIcon,
  Link2,
  Loader2,
  Pencil,
  Play,
  Plus,
  Save,
  Search,
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
  resolutionLabel,
  thumbFilter,
  thumbObjectPosition,
  thumbScale,
  videoFilter,
  videoFit,
  type ThumbStyle,
  type VideoStyle,
} from "@/lib/video";

const inputCls =
  "mt-1.5 w-full rounded-lg border border-white/12 bg-black/45 px-3 py-2.5 text-[12px] text-white outline-none transition-colors placeholder:text-white/25 focus:border-cyan-300/45 focus:bg-black/65";
const labelCls = "block text-[9px] uppercase tracking-[0.2em] text-white/40";

type SourceKind = "link" | "upload";

type Draft = {
  id: string | null;
  sourceKind: SourceKind;
  /** Existing stored video key, or the key returned by a fresh upload. */
  assetKey: string | null;
  /** Kept so an unchanged upload is not re-sent (which would re-upload it). */
  originalAssetKey: string | null;
  assetUrl: string | null;
  assetWidth: number | null;
  assetHeight: number | null;
  durationSeconds: number | null;
  assetName: string | null;
  title: string;
  description: string;
  sourceUrl: string;
  category: string;
  tags: string;
  status: ProjectStatus;
  ratio: string;
  customWidth: string;
  customHeight: string;
  resolution: string;
  sortOrder: string;
  thumbKey: string | null;
  thumbUrl: string | null;
  thumbStyle: Required<ThumbStyle>;
  videoStyle: Required<VideoStyle>;
};

const DEFAULT_THUMB: Required<ThumbStyle> = {
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

const DEFAULT_VIDEO: Required<VideoStyle> = { ...DEFAULT_THUMB, fit: "contain" };

function blankDraft(category: string, order: number, sourceKind: SourceKind): Draft {
  return {
    id: null,
    sourceKind,
    assetKey: null,
    originalAssetKey: null,
    assetUrl: null,
    assetWidth: null,
    assetHeight: null,
    durationSeconds: null,
    assetName: null,
    title: "",
    description: "",
    sourceUrl: "",
    category,
    tags: "",
    status: "draft",
    ratio: "16/9",
    customWidth: "1920",
    customHeight: "1080",
    resolution: "auto",
    sortOrder: String(order),
    thumbKey: null,
    thumbUrl: null,
    thumbStyle: { ...DEFAULT_THUMB },
    videoStyle: { ...DEFAULT_VIDEO },
  };
}

function linkKey(url: string | null): string | null {
  if (!url) return null;
  const marker = "/api/admin/media/";
  const index = url.indexOf(marker);
  return index >= 0 ? decodeURIComponent(url.slice(index + marker.length)) : null;
}

function draftFrom(project: AdminProject): Draft {
  const ratio = project.displayRatio ?? "auto";
  const known = ASPECT_OPTIONS.some((option) => option.id === ratio);
  const type = project.assetType ?? "";
  return {
    id: project.id,
    sourceKind: project.sourceUrl ? "link" : "upload",
    assetKey: project.sourceUrl ? null : linkKey(project.assetUrl),
    originalAssetKey: project.sourceUrl ? null : linkKey(project.assetUrl),
    assetUrl: project.sourceUrl ? null : project.assetUrl,
    assetWidth: project.assetWidth ?? null,
    assetHeight: project.assetHeight ?? null,
    durationSeconds: project.durationSeconds ?? null,
    assetName: project.sourceUrl ? null : type,
    title: project.title,
    description: project.description,
    sourceUrl: project.sourceUrl ?? "",
    category: project.category,
    tags: (project.tags ?? []).join(", "),
    status: project.status,
    ratio: known ? ratio : "custom",
    customWidth: String(project.assetWidth ?? 1920),
    customHeight: String(project.assetHeight ?? 1080),
    resolution: project.resolution ?? "auto",
    sortOrder: String(project.sortOrder ?? 0),
    thumbKey: linkKey(project.thumbUrl),
    thumbUrl: project.thumbUrl,
    thumbStyle: { ...DEFAULT_THUMB, ...((project.thumbStyle ?? {}) as ThumbStyle) } as Required<ThumbStyle>,
    videoStyle: { ...DEFAULT_VIDEO, ...((project.videoStyle ?? {}) as VideoStyle) } as Required<VideoStyle>,
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

function ratioParts(ratio: string): { width: number; height: number } {
  const [width, height] = ratio.split("/").map((part) => Number(part.trim()));
  return {
    width: Number.isFinite(width) && width > 0 ? width : 16,
    height: Number.isFinite(height) && height > 0 ? height : 9,
  };
}

/** Client-side probe: the real dimensions and duration of the file being uploaded. */
function probeVideo(file: File): Promise<{ width: number; height: number; duration: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    const finish = (result: { width: number; height: number; duration: number }) => {
      URL.revokeObjectURL(url);
      resolve(result);
    };
    video.preload = "metadata";
    video.onloadedmetadata = () =>
      finish({
        width: video.videoWidth || 0,
        height: video.videoHeight || 0,
        duration: Number.isFinite(video.duration) ? video.duration : 0,
      });
    video.onerror = () => finish({ width: 0, height: 0, duration: 0 });
    video.src = url;
  });
}

export function VideoLinkManager() {
  const [projects, setProjects] = useState<AdminProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [working, setWorking] = useState<string | null>(null);
  const [thumbProgress, setThumbProgress] = useState<number | null>(null);
  const [videoProgress, setVideoProgress] = useState<number | null>(null);
  const [previewing, setPreviewing] = useState<AdminProject | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [notice, setNotice] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ProjectStatus>("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sort, setSort] = useState<"newest" | "oldest" | "title" | "order">("order");
  const thumbInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const result = await api.projects("video");
      setProjects(result.projects);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load videos.");
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
  const previewRatio = useMemo(() => (draft ? ratioOf(draft) : "16/9"), [draft]);

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    const filtered = projects.filter((project) => {
      if (statusFilter !== "all" && project.status !== statusFilter) return false;
      if (categoryFilter !== "all" && project.category !== categoryFilter) return false;
      if (!term) return true;
      return (
        project.title.toLowerCase().includes(term) ||
        project.description.toLowerCase().includes(term) ||
        (project.tags ?? []).some((tag) => tag.toLowerCase().includes(term)) ||
        (project.sourceUrl ?? "").toLowerCase().includes(term) ||
        project.category.toLowerCase().includes(term)
      );
    });
    const sorted = [...filtered];
    if (sort === "newest") sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    else if (sort === "oldest") sorted.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    else if (sort === "title") sorted.sort((a, b) => a.title.localeCompare(b.title));
    else sorted.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    return sorted;
  }, [projects, query, statusFilter, categoryFilter, sort]);

  const counts = useMemo(
    () => ({
      published: projects.filter((project) => project.status === "published").length,
      draft: projects.filter((project) => project.status === "draft").length,
    }),
    [projects]
  );

  const startNew = (sourceKind: SourceKind) => {
    setDraft(blankDraft(categoryOptions[0]?.id ?? "gaming", projects.length, sourceKind));
    setNotice(null);
    setConfirmDelete(false);
  };

  const edit = (project: AdminProject) => {
    setDraft(draftFrom(project));
    setNotice(null);
    setConfirmDelete(false);
  };

  const patch = (changes: Partial<Draft>) => setDraft((current) => (current ? { ...current, ...changes } : current));
  const patchThumb = (changes: Partial<Required<ThumbStyle>>) =>
    setDraft((current) => (current ? { ...current, thumbStyle: { ...current.thumbStyle, ...changes } } : current));
  const patchVideo = (changes: Partial<Required<VideoStyle>>) =>
    setDraft((current) => (current ? { ...current, videoStyle: { ...current.videoStyle, ...changes } } : current));

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

  const uploadVideo = async (file: File | undefined) => {
    if (!file) return;
    if (!["video/mp4", "video/webm", "video/quicktime"].includes(file.type)) {
      setNotice({ tone: "error", text: "Upload an MP4, WebM or MOV video file." });
      return;
    }
    setVideoProgress(0);
    setNotice(null);
    try {
      const meta = await probeVideo(file);
      const uploaded = await uploadFile(file, "video", setVideoProgress);
      patch({
        sourceKind: "upload",
        assetKey: uploaded.key,
        assetUrl: uploaded.url,
        assetWidth: meta.width || null,
        assetHeight: meta.height || null,
        durationSeconds: meta.duration || null,
        assetName: file.name,
        sourceUrl: "",
        ...(meta.width && meta.height
          ? { customWidth: String(Math.round(meta.width)), customHeight: String(Math.round(meta.height)) }
          : {}),
      });
      setNotice({
        tone: "success",
        text: "Video uploaded to Backblaze B2. Add a title and save it as a draft or published project.",
      });
    } catch (err) {
      setNotice({ tone: "error", text: err instanceof Error ? err.message : "Video upload failed." });
    } finally {
      setVideoProgress(null);
    }
  };

  const save = async () => {
    if (!draft) return;
    if (!draft.title.trim()) {
      setNotice({ tone: "error", text: "Add a title for this video." });
      return;
    }
    if (draft.sourceKind === "link") {
      if (!draft.sourceUrl.trim() || source?.provider === "unknown") {
        setNotice({
          tone: "error",
          text: "Enter a supported video link: YouTube, Vimeo, or a direct MP4/WebM/MOV file.",
        });
        return;
      }
    } else if (!draft.assetKey) {
      setNotice({ tone: "error", text: "Upload the video file first." });
      return;
    }

    const tags = draft.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)
      .slice(0, 10);

    type FilmPayload = Omit<Parameters<typeof api.createProject>[0], "kind">;
    const payload: FilmPayload = {
      title: draft.title.trim(),
      description: draft.description.trim(),
      category: draft.category,
      status: draft.status,
      displayRatio: ratioOf(draft),
      assetWidth: draft.assetWidth,
      assetHeight: draft.assetHeight,
      durationSeconds: draft.durationSeconds,
      sortOrder: Number(draft.sortOrder) || 0,
      thumbKey: draft.thumbKey,
      thumbStyle: draft.thumbStyle as Record<string, unknown>,
      videoStyle: draft.videoStyle as Record<string, unknown>,
      tags,
      resolution: draft.resolution,
    };

    if (draft.sourceKind === "link") {
      payload.sourceUrl = draft.sourceUrl.trim();
    } else if (draft.assetKey && (!draft.id || draft.assetKey !== draft.originalAssetKey)) {
      payload.assetKey = draft.assetKey;
    }

    setSaving(true);
    setNotice(null);
    try {
      if (draft.id) {
        await api.updateProject(draft.id, payload);
      } else {
        await api.createProject({ ...payload, kind: "video" } as Parameters<typeof api.createProject>[0]);
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
        text:
          status === "published"
            ? `“${project.title}” is live in Video Editing.`
            : `“${project.title}” unpublished.`,
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
      setNotice({ tone: "success", text: "Video deleted. Its uploaded file and thumbnail were removed from B2." });
    } catch (err) {
      setNotice({ tone: "error", text: err instanceof Error ? err.message : "Delete failed." });
    } finally {
      setWorking(null);
    }
  };

  const previewSource = (() => {
    if (!draft) return { kind: "none" as const, url: "" };
    if (draft.sourceKind === "link") {
      if (source?.provider === "youtube" || source?.provider === "vimeo") {
        return { kind: "iframe" as const, url: source.embedUrl ?? "" };
      }
      if (source?.provider === "file") return { kind: "video" as const, url: source.embedUrl ?? "" };
      return { kind: "none" as const, url: "" };
    }
    return draft.assetUrl
      ? { kind: "video" as const, url: draft.assetUrl }
      : { kind: "none" as const, url: "" };
  })();

  const previewBox = (ratio: string) => {
    const { width, height } = ratioParts(ratio);
    return width / height >= 1
      ? { width: "100%", aspectRatio: `${width} / ${height}` }
      : { height: "420px", maxHeight: "60vh", aspectRatio: `${width} / ${height}` };
  };

  if (loading) {
    return (
      <p className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-8 text-[11px] text-white/45">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading videos…
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3.5">
        <div>
          <p className="text-[12px] text-white/80">Video library</p>
          <p className="mt-0.5 max-w-2xl text-[10px] leading-relaxed text-white/35">
            Upload a video file or publish a YouTube (including unlisted), Vimeo or direct-file link. Both appear in
            the existing Video Editing LED screens with the aspect ratio, fit and grade you choose.
          </p>
          <p className="mt-1.5 text-[9px] uppercase tracking-[0.14em] text-white/30">
            {counts.published} published · {counts.draft} draft
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => startNew("upload")}
            className="inline-flex items-center gap-2 rounded-full border border-white/18 px-4 py-2.5 text-[10px] uppercase tracking-[0.14em] text-white/70 transition-colors hover:border-white/35 hover:text-white"
          >
            <Upload className="h-3.5 w-3.5" /> Upload Video
          </button>
          <button
            type="button"
            onClick={() => startNew("link")}
            className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-950 transition-all hover:-translate-y-0.5 hover:bg-neutral-200"
          >
            <Plus className="h-3.5 w-3.5" /> Add Video Link
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.02] px-3 py-2.5">
        <label className="relative min-w-[180px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-white/30" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search title, tag, category or URL"
            aria-label="Search videos"
            className="w-full rounded-lg border border-white/12 bg-black/45 py-2 pl-8 pr-3 text-[11px] text-white outline-none placeholder:text-white/25 focus:border-cyan-300/45"
          />
        </label>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as "all" | ProjectStatus)}
          aria-label="Filter by status"
          className="rounded-lg border border-white/12 bg-black/45 px-2.5 py-2 text-[10px] text-white/70 outline-none"
        >
          <option value="all">All statuses</option>
          <option value="published">Published</option>
          <option value="draft">Drafts / unpublished</option>
        </select>
        <select
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value)}
          aria-label="Filter by category"
          className="rounded-lg border border-white/12 bg-black/45 px-2.5 py-2 text-[10px] text-white/70 outline-none"
        >
          <option value="all">All categories</option>
          {categoryOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(event) => setSort(event.target.value as typeof sort)}
          aria-label="Sort videos"
          className="rounded-lg border border-white/12 bg-black/45 px-2.5 py-2 text-[10px] text-white/70 outline-none"
        >
          <option value="order">Display order</option>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="title">Title A–Z</option>
        </select>
      </div>

      {error && <Notice tone="error">{error}</Notice>}
      {!draft && notice && <Notice tone={notice.tone}>{notice.text}</Notice>}

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/12 px-5 py-12 text-center">
          <Clapperboard className="mx-auto h-5 w-5 text-white/30" />
          <p className="mt-3 text-[12px] text-white/55">
            {projects.length === 0 ? "No videos yet." : "No videos match this search."}
          </p>
          <p className="mt-1 text-[10.5px] text-white/30">
            {projects.length === 0 ? "Upload a file or add a video link to begin." : "Adjust the filters above."}
          </p>
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((project) => {
            const style = (project.thumbStyle ?? {}) as ThumbStyle;
            const poster = project.thumbUrl;
            const link = parseVideoSource(project.sourceUrl);
            const uploaded = !project.sourceUrl;
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
                    {project.displayRatio ?? "16/9"} · {uploaded ? "upload" : link.provider}
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
                      {categoryOptions.find((option) => option.id === project.category)?.label ?? project.category} ·
                      order {project.sortOrder} · {resolutionLabel(project.resolution)}
                    </p>
                    {(project.tags ?? []).length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {(project.tags ?? []).slice(0, 4).map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full border border-white/10 px-1.5 py-0.5 text-[8px] text-white/40"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => edit(project)}
                      className="inline-flex items-center gap-1 rounded-md border border-white/14 px-2 py-1 text-[9px] uppercase tracking-[0.14em] text-white/60 transition-colors hover:bg-white/5 hover:text-white"
                    >
                      <Pencil className="h-2.5 w-2.5" /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewing(project)}
                      className="inline-flex items-center gap-1 rounded-md border border-white/14 px-2 py-1 text-[9px] uppercase tracking-[0.14em] text-white/60 transition-colors hover:bg-white/5 hover:text-white"
                    >
                      <Eye className="h-2.5 w-2.5" /> Preview
                    </button>
                    {project.sourceUrl && (
                      <a
                        href={project.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-md border border-white/14 px-2 py-1 text-[9px] uppercase tracking-[0.14em] text-white/60 transition-colors hover:bg-white/5 hover:text-white"
                      >
                        <ExternalLink className="h-2.5 w-2.5" /> Source
                      </a>
                    )}
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

      {/* ------------------------------ editor ------------------------------ */}
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
                  {draft.id ? "Edit video" : draft.sourceKind === "upload" ? "New uploaded video" : "New video link"}
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
              {/* preview + presentation */}
              <div className="space-y-3">
                <div className="rounded-xl border border-white/10 bg-black/40 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[9px] uppercase tracking-[0.2em] text-white/40">LED screen preview</p>
                    <span className="rounded-full border border-white/10 px-2 py-0.5 text-[8px] uppercase tracking-[0.12em] text-white/35">
                      {previewRatio} · {resolutionLabel(draft.resolution)}
                    </span>
                  </div>
                  <div className="mt-3 grid place-items-center">
                    <div
                      className="relative w-full max-w-full overflow-hidden rounded-lg border border-white/10 bg-black"
                      style={previewBox(previewRatio)}
                    >
                      {previewSource.kind === "iframe" ? (
                        <iframe
                          src={previewSource.url}
                          title="Video preview"
                          style={{ filter: videoFilter(draft.videoStyle) }}
                          className="absolute inset-0 h-full w-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                          allowFullScreen
                        />
                      ) : previewSource.kind === "video" ? (
                        <video
                          src={previewSource.url}
                          controls
                          playsInline
                          poster={thumbnail ?? undefined}
                          style={{
                            filter: videoFilter(draft.videoStyle),
                            objectFit: videoFit(draft.videoStyle),
                            objectPosition: thumbObjectPosition(draft.videoStyle),
                          }}
                          className="absolute inset-0 h-full w-full bg-black"
                        />
                      ) : (
                        <div className="absolute inset-0 grid place-items-center px-6 text-center text-[11px] text-white/40">
                          <span>
                            <Play className="mx-auto mb-2 h-5 w-5" />
                            {draft.sourceKind === "upload"
                              ? "Choose a video file to upload and preview it."
                              : "Paste a supported video URL to preview it."}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="mt-2 text-center text-[9px] uppercase tracking-[0.14em] text-white/30">
                    Fit {videoFit(draft.videoStyle)} · black bars encoded in the source stay in the source
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/40 p-3">
                  <p className="text-[9px] uppercase tracking-[0.2em] text-white/40">Video framing &amp; grade</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(["contain", "cover"] as const).map((fit) => (
                      <button
                        key={fit}
                        type="button"
                        onClick={() => patchVideo({ fit })}
                        className={cn(
                          "rounded-full border px-2.5 py-1 text-[9px] uppercase tracking-[0.12em]",
                          draft.videoStyle.fit === fit
                            ? "border-white/40 bg-white/10 text-white"
                            : "border-white/12 text-white/45 hover:text-white"
                        )}
                      >
                        {fit === "contain" ? "Fit · entire frame" : "Fill · crop edges"}
                      </button>
                    ))}
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Range label="Zoom" value={draft.videoStyle.zoom} min={1} max={3} step={0.05} onChange={(zoom) => patchVideo({ zoom })} />
                    <Range label="Position X" value={draft.videoStyle.x} min={0} max={100} step={1} onChange={(x) => patchVideo({ x })} />
                    <Range label="Position Y" value={draft.videoStyle.y} min={0} max={100} step={1} onChange={(y) => patchVideo({ y })} />
                    <Range label="Brightness" value={draft.videoStyle.brightness} min={40} max={180} step={1} onChange={(brightness) => patchVideo({ brightness })} />
                    <Range label="Contrast" value={draft.videoStyle.contrast} min={40} max={200} step={1} onChange={(contrast) => patchVideo({ contrast })} />
                    <Range label="Saturation" value={draft.videoStyle.saturation} min={0} max={200} step={1} onChange={(saturation) => patchVideo({ saturation })} />
                    <Range label="Grayscale" value={draft.videoStyle.grayscale} min={0} max={100} step={1} onChange={(grayscale) => patchVideo({ grayscale })} />
                    <Range label="Blur" value={draft.videoStyle.blur} min={0} max={8} step={0.5} onChange={(blur) => patchVideo({ blur })} />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {(["original", "cinematic", "vivid", "mono", "warm", "cool"] as const).map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => patchVideo({ preset })}
                        className={cn(
                          "rounded-full border px-2 py-1 text-[9px] uppercase tracking-[0.12em]",
                          draft.videoStyle.preset === preset
                            ? "border-white/40 bg-white/10 text-white"
                            : "border-white/12 text-white/45 hover:text-white"
                        )}
                      >
                        {preset}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => patchVideo({ ...DEFAULT_VIDEO })}
                      className="ml-auto text-[9px] uppercase tracking-[0.12em] text-white/35 hover:text-white"
                    >
                      Reset
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/40 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[9px] uppercase tracking-[0.2em] text-white/40">Thumbnail crop &amp; tone</p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => thumbInput.current?.click()}
                        className="text-[9px] uppercase tracking-[0.14em] text-white/50 hover:text-white"
                      >
                        {thumbnail ? "Replace" : "Upload"}
                      </button>
                      {draft.thumbKey && (
                        <button
                          type="button"
                          onClick={() => patch({ thumbKey: null, thumbUrl: null })}
                          className="text-[9px] uppercase tracking-[0.14em] text-red-300/70 hover:text-red-200"
                        >
                          Remove
                        </button>
                      )}
                    </div>
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
                    <Range label="Zoom" value={draft.thumbStyle.zoom} min={1} max={3} step={0.05} onChange={(zoom) => patchThumb({ zoom })} />
                    <Range label="Position X" value={draft.thumbStyle.x} min={0} max={100} step={1} onChange={(x) => patchThumb({ x })} />
                    <Range label="Position Y" value={draft.thumbStyle.y} min={0} max={100} step={1} onChange={(y) => patchThumb({ y })} />
                    <Range label="Brightness" value={draft.thumbStyle.brightness} min={40} max={180} step={1} onChange={(brightness) => patchThumb({ brightness })} />
                    <Range label="Contrast" value={draft.thumbStyle.contrast} min={40} max={200} step={1} onChange={(contrast) => patchThumb({ contrast })} />
                    <Range label="Saturation" value={draft.thumbStyle.saturation} min={0} max={200} step={1} onChange={(saturation) => patchThumb({ saturation })} />
                    <Range label="Grayscale" value={draft.thumbStyle.grayscale} min={0} max={100} step={1} onChange={(grayscale) => patchThumb({ grayscale })} />
                    <Range label="Blur" value={draft.thumbStyle.blur} min={0} max={8} step={0.5} onChange={(blur) => patchThumb({ blur })} />
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {(["original", "cinematic", "vivid", "mono", "warm", "cool"] as const).map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => patchThumb({ preset })}
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
                      onClick={() => patchThumb({ ...DEFAULT_THUMB })}
                      className="ml-auto text-[9px] uppercase tracking-[0.12em] text-white/35 hover:text-white"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              </div>

              {/* fields */}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-black/40 p-2">
                  {(["link", "upload"] as const).map((kind) => (
                    <button
                      key={kind}
                      type="button"
                      onClick={() => patch({ sourceKind: kind })}
                      className={cn(
                        "rounded-lg px-2 py-2 text-[9.5px] uppercase tracking-[0.14em] transition-colors",
                        draft.sourceKind === kind
                          ? "bg-white text-neutral-950"
                          : "text-white/45 hover:bg-white/5 hover:text-white"
                      )}
                    >
                      {kind === "link" ? "External link" : "Upload file"}
                    </button>
                  ))}
                </div>

                {draft.sourceKind === "link" ? (
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
                      rejected. External links use no B2 storage.
                    </span>
                  </label>
                ) : (
                  <div className="rounded-lg border border-white/10 bg-black/40 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className={labelCls}>Video file</span>
                      <button
                        type="button"
                        onClick={() => videoInput.current?.click()}
                        className="inline-flex items-center gap-1 text-[9px] uppercase tracking-[0.14em] text-white/60 hover:text-white"
                      >
                        <Upload className="h-2.5 w-2.5" /> {draft.assetKey ? "Replace" : "Choose file"}
                      </button>
                      <input
                        ref={videoInput}
                        type="file"
                        accept="video/mp4,video/webm,video/quicktime"
                        className="hidden"
                        onChange={(event) => {
                          void uploadVideo(event.target.files?.[0]);
                          event.target.value = "";
                        }}
                      />
                    </div>
                    <p className="mt-2 truncate text-[10.5px] text-white/55">
                      {draft.assetKey
                        ? draft.assetKey.split("/").pop()
                        : "No file uploaded yet — MP4, WebM or MOV."}
                    </p>
                    {draft.assetWidth && draft.assetHeight ? (
                      <p className="mt-1 text-[9px] text-white/30">
                        {draft.assetWidth} × {draft.assetHeight}
                        {draft.durationSeconds ? ` · ${Math.round(draft.durationSeconds)} s` : ""} · original quality
                        preserved
                      </p>
                    ) : null}
                    {videoProgress !== null && (
                      <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full bg-white transition-all" style={{ width: `${videoProgress}%` }} />
                      </div>
                    )}
                    <p className="mt-2 text-[9px] leading-relaxed text-white/25">
                      The file is streamed to the private Backblaze B2 bucket through the Worker. No credentials reach
                      the browser.
                    </p>
                  </div>
                )}

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
                  <span className={labelCls}>Tags</span>
                  <input
                    value={draft.tags}
                    onChange={(event) => patch({ tags: event.target.value })}
                    className={inputCls}
                    placeholder="cinematic, gaming, vertical"
                  />
                  <span className="mt-1 block text-[9px] text-white/30">Comma separated · up to 10 tags</span>
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
                    <span className={labelCls}>Publishing status</span>
                    <select
                      value={draft.status}
                      onChange={(event) => patch({ status: event.target.value as ProjectStatus })}
                      className={inputCls}
                    >
                      <option value="draft">Draft / unpublished</option>
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
                    <span className={labelCls}>Display preset</span>
                    <select
                      value={draft.resolution}
                      onChange={(event) => patch({ resolution: event.target.value })}
                      className={inputCls}
                    >
                      {VIDEO_RESOLUTIONS.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <p className="text-[9px] leading-relaxed text-white/25">
                  Display presets are labels for the LED screen. Nothing is transcoded: an uploaded file keeps its
                  original quality and an embedded player keeps whatever quality its provider serves.
                </p>

                {draft.ratio === "custom" && (
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
                    disabled={saving || videoProgress !== null}
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

      {/* ------------------------------ preview ------------------------------ */}
      {previewing && (
        <div
          className="fixed inset-0 z-[70] grid place-items-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setPreviewing(null)}
        >
          <div
            className="w-full max-w-3xl overflow-hidden rounded-2xl border border-white/12 bg-[#0a0c10] shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div className="min-w-0">
                <p className="text-[9px] uppercase tracking-[0.2em] text-white/35">
                  {previewing.status === "published" ? "Published preview" : "Draft preview"}
                </p>
                <p className="truncate text-[12px] text-white/85">{previewing.title}</p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewing(null)}
                aria-label="Close preview"
                className="grid h-8 w-8 place-items-center rounded-md border border-white/15 text-white/50 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <PreviewPlayer project={previewing} />
          </div>
        </div>
      )}
    </div>
  );
}

function PreviewPlayer({ project }: { project: AdminProject }) {
  const link = parseVideoSource(project.sourceUrl);
  const ratio = (project.displayRatio ?? "16/9").replace("/", " / ");
  const style = (project.videoStyle ?? {}) as VideoStyle;
  return (
    <div className="grid place-items-center bg-black p-2">
      <div className="relative w-full overflow-hidden rounded-md bg-black" style={{ aspectRatio: ratio }}>
        {project.sourceUrl && (link.provider === "youtube" || link.provider === "vimeo") ? (
          <iframe
            src={link.embedUrl ?? ""}
            title={project.title}
            style={{ filter: videoFilter(style) }}
            className="absolute inset-0 h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
          />
        ) : project.sourceUrl && link.provider === "file" ? (
          <video
            src={link.embedUrl ?? undefined}
            controls
            playsInline
            poster={project.thumbUrl ?? undefined}
            style={{
              filter: videoFilter(style),
              objectFit: videoFit(style),
              objectPosition: thumbObjectPosition(style),
            }}
            className="absolute inset-0 h-full w-full bg-black"
          />
        ) : project.sourceUrl ? (
          <div className="absolute inset-0 grid place-items-center px-6 text-center text-[11px] text-white/45">
            This link cannot be embedded. Edit the project to use YouTube, Vimeo or a direct video file.
          </div>
        ) : (
          <video
            src={project.assetUrl}
            controls
            playsInline
            poster={project.thumbUrl ?? undefined}
            style={{
              filter: videoFilter(style),
              objectFit: videoFit(style),
              objectPosition: thumbObjectPosition(style),
            }}
            className="absolute inset-0 h-full w-full bg-black"
          />
        )}
      </div>
    </div>
  );
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
