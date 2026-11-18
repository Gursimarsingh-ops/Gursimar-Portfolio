import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  Image as ImageIcon,
  Loader2,
  Save,
  Search,
  Trash2,
  Upload,
  Video,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api, formatBytes, uploadFile, type AdminProject } from "@/admin/api";
import { CATEGORY_OPTIONS } from "@/admin/categories";
import { ProjectPreviewDialog } from "@/components/portfolio/ProjectPreviewDialog";
import { VideoPlayerDialog } from "@/components/portfolio/VideoPlayerDialog";
import { invalidatePublishedProjects } from "@/lib/portfolio";

const MAX_THUMB = 5 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const inputCls =
  "w-full rounded-lg border border-white/15 bg-black/40 px-2.5 py-2 text-sm text-white outline-none transition-colors placeholder:text-white/25 focus:border-white/45";

function StatusBadge({ status }: { status: AdminProject["status"] }) {
  return (
    <span
      className={cn(
        "rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-[0.14em]",
        status === "published"
          ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
          : "border-amber-400/30 bg-amber-400/10 text-amber-200"
      )}
    >
      {status}
    </span>
  );
}

function DeleteDialog({
  project,
  onCancel,
  onConfirm,
  busy,
}: {
  project: AdminProject | null;
  onCancel: () => void;
  onConfirm: () => void;
  busy: boolean;
}) {
  if (!project) return null;
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/70 p-4 backdrop-blur-sm" onClick={onCancel}>
      <div
        className="w-full max-w-md rounded-2xl border border-red-400/25 bg-[#0d0f13] p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-red-400/30 bg-red-500/10 text-red-300">
            <AlertTriangle className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-medium text-white">Delete this project?</p>
            <p className="mt-1 text-xs leading-5 text-white/50">
              “{project.title}” will be removed from the public portfolio and its stored file will be
              deleted from R2. This cannot be undone.
            </p>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-full border border-white/15 px-4 py-2 text-[10px] uppercase tracking-[0.16em] text-white/60 transition-colors hover:bg-white/5 hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-full bg-red-500 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white transition-colors hover:bg-red-400 disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            Delete permanently
          </button>
        </div>
      </div>
    </div>
  );
}

function ProjectCard({
  project,
  onChanged,
}: {
  project: AdminProject;
  onChanged: () => void;
}) {
  const [title, setTitle] = useState(project.title);
  const [description, setDescription] = useState(project.description);
  const [category, setCategory] = useState(project.category);
  const [busy, setBusy] = useState<"save" | "status" | "thumb" | "delete" | null>(null);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const thumbInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTitle(project.title);
    setDescription(project.description);
    setCategory(project.category);
  }, [project.id, project.title, project.description, project.category, project.updatedAt]);

  const finish = (message?: string) => {
    invalidatePublishedProjects();
    onChanged();
    if (message) setNotice({ tone: "ok", text: message });
  };

  const save = async () => {
    if (!title.trim()) {
      setNotice({ tone: "error", text: "Title cannot be empty." });
      return;
    }
    setBusy("save");
    setNotice(null);
    try {
      await api.updateProject(project.id, { title: title.trim(), description: description.trim(), category });
      finish("Changes saved.");
    } catch (err) {
      setNotice({ tone: "error", text: err instanceof Error ? err.message : "Save failed." });
    } finally {
      setBusy(null);
    }
  };

  const toggleStatus = async () => {
    setBusy("status");
    setNotice(null);
    try {
      await api.updateProject(project.id, { status: project.status === "published" ? "draft" : "published" });
      finish(project.status === "published" ? "Unpublished and hidden from the site." : "Published and now live.");
    } catch (err) {
      setNotice({ tone: "error", text: err instanceof Error ? err.message : "Could not update status." });
    } finally {
      setBusy(null);
    }
  };

  const replaceThumb = async (file: File | undefined) => {
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type)) {
      setNotice({ tone: "error", text: "Cover must be a JPG, PNG, WebP or GIF image." });
      return;
    }
    if (file.size > MAX_THUMB) {
      setNotice({ tone: "error", text: `Cover is larger than ${formatBytes(MAX_THUMB)}.` });
      return;
    }

    setBusy("thumb");
    setNotice(null);
    try {
      const uploaded = await uploadFile(file, "thumbnail", () => undefined);
      await api.updateProject(project.id, { thumbKey: uploaded.key });
      finish("Cover updated.");
    } catch (err) {
      setNotice({ tone: "error", text: err instanceof Error ? err.message : "Cover upload failed." });
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    setBusy("delete");
    try {
      await api.deleteProject(project.id);
      setConfirming(false);
      invalidatePublishedProjects();
      onChanged();
    } catch (err) {
      setConfirming(false);
      setNotice({ tone: "error", text: err instanceof Error ? err.message : "Delete failed." });
    } finally {
      setBusy(null);
    }
  };

  const cover = project.thumbUrl ?? (project.kind === "graphic" ? project.assetUrl : null);

  return (
    <li className="rounded-xl border border-white/10 bg-white/[0.02] p-3 sm:p-4">
      <div className="flex flex-col gap-4 sm:flex-row">
        <button
          type="button"
          onClick={() => setPreviewOpen(true)}
          className="group relative h-28 w-full shrink-0 overflow-hidden rounded-lg border border-white/10 bg-black sm:h-24 sm:w-40"
          aria-label={`Preview ${project.title}`}
        >
          {cover ? (
            <img src={cover} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
          ) : (
            <span className="grid h-full w-full place-items-center text-white/30">
              {project.kind === "graphic" ? <ImageIcon className="h-5 w-5" /> : <Video className="h-5 w-5" />}
            </span>
          )}
          <span className="absolute inset-0 grid place-items-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
            <Eye className="h-4 w-4 text-white" />
          </span>
        </button>

        <div className="min-w-0 flex-1 space-y-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={project.status} />
            <span className="text-[9px] uppercase tracking-[0.14em] text-white/30">
              {formatBytes(project.assetSize)} · {new Date(project.createdAt).toLocaleDateString()}
            </span>
            <span className="ml-auto flex items-center gap-1.5">
              <button
                onClick={() => setPreviewOpen(true)}
                className="inline-flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-[9px] uppercase tracking-[0.14em] text-white/50 transition-colors hover:bg-white/5 hover:text-white"
              >
                <Eye className="h-3 w-3" />
                Preview
              </button>
              <button
                onClick={() => thumbInput.current?.click()}
                disabled={busy !== null}
                className="inline-flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-[9px] uppercase tracking-[0.14em] text-white/50 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-50"
              >
                {busy === "thumb" ? <Loader2 className="h-3 w-3 animate-spin" /> : <ImageIcon className="h-3 w-3" />}
                Cover
              </button>
              <input
                ref={thumbInput}
                type="file"
                accept={IMAGE_TYPES.join(",")}
                className="hidden"
                onChange={(event) => {
                  void replaceThumb(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
            </span>
          </div>

          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            aria-label="Project title"
            className={inputCls}
          />

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={2000}
            rows={2}
            aria-label="Project description"
            placeholder="Description"
            className={inputCls}
          />

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              aria-label="Category"
              className={cn(inputCls, "w-auto min-w-[150px] py-1.5 text-xs")}
            >
              {CATEGORY_OPTIONS[project.kind].map((option) => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </select>

            <button
              onClick={() => void save()}
              disabled={busy !== null}
              className="inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-white/5 px-2.5 py-1.5 text-[9px] uppercase tracking-[0.14em] text-white/70 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
            >
              {busy === "save" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
              Save
            </button>

            <button
              onClick={() => void toggleStatus()}
              disabled={busy !== null}
              className="inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-white/5 px-2.5 py-1.5 text-[9px] uppercase tracking-[0.14em] text-white/70 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
            >
              {busy === "status" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
              {project.status === "published" ? "Unpublish" : "Publish"}
            </button>

            <button
              onClick={() => setConfirming(true)}
              disabled={busy !== null}
              className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-red-400/25 px-2.5 py-1.5 text-[9px] uppercase tracking-[0.14em] text-red-200/80 transition-colors hover:bg-red-500/10 hover:text-red-100 disabled:opacity-50"
            >
              <Trash2 className="h-3 w-3" />
              Delete
            </button>
          </div>

          {notice && (
            <p
              className={cn(
                "flex items-center gap-1.5 text-[10px]",
                notice.tone === "ok" ? "text-emerald-300" : "text-red-300"
              )}
            >
              {notice.tone === "ok" ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
              {notice.text}
            </p>
          )}
        </div>
      </div>

      <ProjectPreviewDialog
        open={previewOpen && project.kind === "graphic"}
        onOpenChange={setPreviewOpen}
        title={project.title}
        subtitle={`${project.kind} · ${project.status}`}
        imageUrl={project.assetUrl}
        description={project.description}
      />

      <VideoPlayerDialog
        open={previewOpen && project.kind === "video"}
        onOpenChange={setPreviewOpen}
        title={project.title}
        subtitle={`video · ${project.status}`}
        videoUrl={project.assetUrl}
        posterUrl={project.thumbUrl}
        description={project.description}
      />

      <DeleteDialog
        project={confirming ? project : null}
        busy={busy === "delete"}
        onCancel={() => setConfirming(false)}
        onConfirm={() => void remove()}
      />
    </li>
  );
}

export function ManagePanel({
  kind,
  projects,
  onChanged,
}: {
  kind: "graphic" | "video";
  projects: AdminProject[];
  onChanged: () => void;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "published" | "draft">("all");

  const visible = projects.filter((project) => {
    const matchesQuery =
      !query ||
      project.title.toLowerCase().includes(query.toLowerCase()) ||
      project.description.toLowerCase().includes(query.toLowerCase());
    const matchesFilter = filter === "all" || project.status === filter;
    return matchesQuery && matchesFilter;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex flex-1 items-center gap-2 rounded-lg border border-white/10 bg-black/30 px-3 py-2">
          <Search className="h-3.5 w-3.5 text-white/35" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects"
            className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/25"
          />
        </label>
        <div className="flex items-center gap-1.5">
          {(["all", "published", "draft"] as const).map((value) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-[9px] uppercase tracking-[0.14em] transition-colors",
                filter === value
                  ? "border-white/30 bg-white/10 text-white"
                  : "border-white/10 text-white/40 hover:text-white"
              )}
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/12 px-4 py-14 text-center">
          <p className="text-sm text-white/50">
            {projects.length === 0
              ? `No ${kind === "graphic" ? "graphics" : "videos"} uploaded yet.`
              : "No projects match this search."}
          </p>
          <p className="mt-1 text-[11px] text-white/30">
            {projects.length === 0
              ? "Use the upload panel to publish your first project."
              : "Try a different filter or search term."}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {visible.map((project) => (
            <ProjectCard key={project.id} project={project} onChanged={onChanged} />
          ))}
        </ul>
      )}
    </div>
  );
}
