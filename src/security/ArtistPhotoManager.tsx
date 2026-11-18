import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Crop,
  Image as ImageIcon,
  Loader2,
  RefreshCw,
  Trash2,
  Upload,
  Wand2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api, ApiError, formatBytes, uploadFile, type ArtistOriginal, type ArtistPhoto } from "@/admin/api";
import { invalidateArtistPhoto } from "@/lib/portfolio";
import { MediaEditor, type EditedImage } from "./MediaEditor";

const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_BYTES = 8 * 1024 * 1024;

function formatWhen(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type Tone = "error" | "success" | "info";

function Notice({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2 rounded-xl border px-3 py-2.5 text-[11px] leading-relaxed",
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

/**
 * Artist Profile Management.
 *
 * The edited photo lives in R2 (`artist/`), the untouched upload is kept in R2
 * (`originals/`) so it can be re-edited, and both pointers live in D1 settings.
 */
export function ArtistPhotoManager() {
  const [photo, setPhoto] = useState<ArtistPhoto | null>(null);
  const [original, setOriginal] = useState<ArtistOriginal | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editor, setEditor] = useState<{ file?: File; url?: string; name: string; fromOriginal: boolean } | null>(null);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState<"idle" | "uploading" | "saving" | "deleting">("idle");
  const [message, setMessage] = useState<{ tone: Tone; text: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.artistPhoto();
      setPhoto(result.photo);
      setOriginal(result.original ?? null);
      setWarning(result.warning ?? null);
    } catch (err) {
      setMessage({
        tone: "error",
        text: err instanceof ApiError ? err.message : "Could not read the current artist photo.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const pick = (file: File | undefined) => {
    if (!file) return;
    setMessage(null);
    const type = (file.type || "").toLowerCase();
    if (!ACCEPTED.includes(type)) {
      setMessage({ tone: "error", text: "Unsupported image. Use JPG, PNG, WEBP or GIF." });
      return;
    }
    if (file.size > MAX_BYTES) {
      setMessage({ tone: "error", text: `That image is too large. Maximum size is ${formatBytes(MAX_BYTES)}.` });
      return;
    }
    if (file.size < 512) {
      setMessage({ tone: "error", text: "That file looks empty or corrupt. Choose another image." });
      return;
    }
    setEditor({ file, name: file.name, fromOriginal: false });
  };

  const apply = async (edited: EditedImage) => {
    if (!editor) return;
    setBusy("uploading");
    setProgress(0);
    setMessage(null);
    let uploadedKey: string | null = null;
    let originalKey: string | null = null;

    try {
      if (editor.file) {
        // Keep the untouched upload so the photograph can be re-edited later.
        const storedOriginal = await uploadFile(editor.file, "original", (percent) =>
          setProgress(Math.round(percent * 0.3))
        );
        originalKey = storedOriginal.key;
      }

      const uploaded = await uploadFile(edited.file, "artist", (percent) =>
        setProgress(editor.file ? 30 + Math.round(percent * 0.7) : percent)
      );
      uploadedKey = uploaded.key;

      setBusy("saving");
      const result = await api.setArtistPhoto(uploaded.key, originalKey ?? undefined);
      setPhoto(result.photo);
      setOriginal(result.original ?? original);
      setEditor(null);
      invalidateArtistPhoto();
      setMessage({
        tone: "success",
        text: editor.file
          ? `Photo saved at ${edited.width}×${edited.height}. The original is kept so you can edit it again.`
          : "Photo re-edited and saved. The original upload is unchanged.",
      });
      setWarning(null);
    } catch (err) {
      if (uploadedKey) await api.deleteUpload(uploadedKey).catch(() => undefined);
      if (originalKey) await api.deleteUpload(originalKey).catch(() => undefined);
      setMessage({
        tone: "error",
        text: err instanceof ApiError ? err.message : "The photo could not be saved. Try again.",
      });
    } finally {
      setBusy("idle");
      setProgress(0);
    }
  };

  const remove = async () => {
    setBusy("deleting");
    setMessage(null);
    try {
      await api.clearArtistPhoto();
      setPhoto(null);
      setOriginal(null);
      invalidateArtistPhoto();
      setConfirmDelete(false);
      setMessage({ tone: "success", text: "Artist photo deleted. The frame is back to its empty plaque." });
    } catch (err) {
      setMessage({
        tone: "error",
        text: err instanceof ApiError ? err.message : "The photo could not be deleted.",
      });
    } finally {
      setBusy("idle");
    }
  };

  const working = busy !== "idle";
  const currentSrc = photo?.url ?? null;

  return (
    <section
      id="artist-section"
      className="relative scroll-mt-24 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.055] to-white/[0.012] shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent" />

      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-xl border border-white/12 bg-white/[0.05] text-white/70">
            <Camera className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-[13px] font-medium tracking-tight text-white">Artist Profile Management</h2>
            <p className="mt-0.5 text-[9px] uppercase tracking-[0.2em] text-white/35">
              Photo in the Artist frame · between the two robots
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[8px] uppercase tracking-[0.18em]",
              photo
                ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200/90"
                : "border-amber-300/25 bg-amber-400/10 text-amber-200/90"
            )}
          >
            <span
              className={cn("h-1 w-1 rounded-full", photo ? "bg-emerald-400" : "bg-amber-400")}
              style={{ animation: "vault-led 2.6s ease-in-out infinite" }}
            />
            {loading ? "Reading" : photo ? "Photo live" : "No photo"}
          </span>
          <button
            type="button"
            onClick={() => void load()}
            disabled={working}
            aria-label="Refresh artist photo"
            className="grid h-8 w-8 place-items-center rounded-full border border-white/12 text-white/50 transition-colors hover:border-white/30 hover:text-white disabled:opacity-40"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          </button>
        </div>
      </header>

      <div className="grid gap-5 p-5 md:grid-cols-[minmax(0,240px)_minmax(0,1fr)]">
        <div>
          <div className="relative overflow-hidden rounded-xl border border-white/12 bg-black/60">
            <div className="relative aspect-[4/5] w-full">
              {currentSrc ? (
                <img src={currentSrc} alt="Artist photo preview" className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full w-full place-items-center bg-[radial-gradient(80%_80%_at_50%_20%,#1b222b_0%,#0a0d11_70%)] text-white/25">
                  <div className="text-center">
                    <ImageIcon className="mx-auto h-7 w-7" />
                    <p className="mt-2 text-[9px] uppercase tracking-[0.18em]">Empty frame</p>
                  </div>
                </div>
              )}
              <span className="pointer-events-none absolute inset-0 shadow-[inset_0_0_40px_rgba(0,0,0,0.55)]" />
              <span className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
              {original && (
                <span className="absolute left-2 top-2 rounded-full border border-white/20 bg-black/60 px-2 py-0.5 text-[8px] uppercase tracking-[0.14em] text-white/70 backdrop-blur">
                  Original kept
                </span>
              )}
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-white/[0.07] px-3 py-2">
              <span className="text-[9px] uppercase tracking-[0.16em] text-white/35">
                {photo ? "Active on site" : "Awaiting upload"}
              </span>
              <span className="text-[9px] text-white/35">{photo ? formatBytes(photo.size) : "—"}</span>
            </div>
          </div>

          <p className="mt-2 text-[9px] uppercase leading-relaxed tracking-[0.14em] text-white/25">
            JPG · PNG · WEBP · GIF — up to {formatBytes(MAX_BYTES)}
          </p>
        </div>

        <div className="flex flex-col">
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-xl border border-white/[0.08] bg-black/25 px-3 py-2.5">
              <p className="text-[8px] uppercase tracking-[0.2em] text-white/30">Stored format</p>
              <p className="mt-1 text-[11px] text-white/70">{photo?.type || "—"}</p>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-black/25 px-3 py-2.5">
              <p className="text-[8px] uppercase tracking-[0.2em] text-white/30">Last updated</p>
              <p className="mt-1 text-[11px] text-white/70">{formatWhen(photo?.updatedAt)}</p>
            </div>
          </div>

          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED.join(",")}
            className="hidden"
            onChange={(event) => {
              pick(event.target.files?.[0]);
              event.target.value = "";
            }}
          />

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={working}
              className="inline-flex items-center justify-center gap-1.5 rounded-full bg-white px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-950 transition-all hover:-translate-y-0.5 hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Upload className="h-3 w-3" />
              {photo ? "Replace photo" : "Upload photo"}
            </button>

            {original && (
              <button
                type="button"
                onClick={() =>
                  setEditor({
                    url: original.url,
                    name: "artist-original",
                    fromOriginal: true,
                  })
                }
                disabled={working}
                className="inline-flex items-center justify-center gap-1.5 rounded-full border border-white/15 bg-white/[0.05] px-3.5 py-2.5 text-[10px] uppercase tracking-[0.14em] text-white/75 transition-colors hover:border-white/35 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Wand2 className="h-3 w-3" />
                Re-edit original
              </button>
            )}

            {photo && (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                disabled={working}
                className="ml-auto inline-flex items-center justify-center gap-1.5 rounded-full border border-red-400/25 px-3.5 py-2.5 text-[10px] uppercase tracking-[0.14em] text-red-200/80 transition-colors hover:border-red-400/50 hover:bg-red-500/10 hover:text-red-100 disabled:opacity-40"
              >
                <Trash2 className="h-3 w-3" />
                Delete
              </button>
            )}
          </div>

          {busy === "uploading" && (
            <span className="mt-3 block h-1 w-full overflow-hidden rounded-full bg-white/10">
              <span
                className="block h-full rounded-full bg-gradient-to-r from-cyan-200/70 to-white transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
              <span className="sr-only">{progress}% uploaded</span>
            </span>
          )}

          <div className="mt-3 space-y-2">
            {warning && <Notice tone="info">{warning}</Notice>}
            {message && <Notice tone={message.tone}>{message.text}</Notice>}
            {!message && !warning && (
              <Notice tone="info">
                Uploading opens the editor first: crop, zoom, rotate, aspect ratio and colour grading are applied
                before the file is written to R2. Saving points the Artist frame at the new image, and changes
                appear on the deployed site immediately.
              </Notice>
            )}
          </div>

          <div className="mt-4 flex items-start gap-2 rounded-xl border border-white/[0.08] bg-black/20 px-3 py-2.5 text-[10px] leading-relaxed text-white/35">
            <Crop className="mt-0.5 h-3 w-3 shrink-0 text-white/40" />
            The frame displays the stored composition exactly as edited. Choose profile, portrait or square
            ratios in the editor to control how the robots frame your photograph.
          </div>
        </div>
      </div>

      {editor && (
        <MediaEditor
          open={Boolean(editor)}
          file={editor.file}
          url={editor.url}
          name={editor.name}
          title={editor.fromOriginal ? "Re-edit artist photograph" : "Edit artist photograph"}
          subtitle={
            editor.fromOriginal
              ? "Editing the kept original — the edit is saved as the new active photo"
              : "The edited image is uploaded; the untouched original is kept for later edits"
          }
          defaultAspect="4:5"
          applying={busy === "uploading" || busy === "saving"}
          onCancel={() => {
            if (busy === "idle") setEditor(null);
          }}
          onApply={(result) => void apply(result)}
        />
      )}

      {confirmDelete && (
        <div
          className="fixed inset-0 z-[90] grid place-items-center bg-black/80 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Delete artist photo"
          onClick={() => setConfirmDelete(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-red-400/25 bg-[#0b0e12] p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-red-400/30 bg-red-500/10 text-red-300">
                <AlertTriangle className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[13px] font-medium text-white">Delete the artist photo?</p>
                <p className="mt-1 text-[11px] leading-relaxed text-white/45">
                  The edited photo and its kept original are deleted from R2 and the frame returns to its empty
                  plaque. You can upload a new photo at any time.
                </p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="rounded-full border border-white/15 px-4 py-2 text-[10px] uppercase tracking-[0.14em] text-white/60 transition-colors hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void remove()}
                disabled={busy === "deleting"}
                className="inline-flex items-center gap-2 rounded-full bg-red-500 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white transition-colors hover:bg-red-400 disabled:opacity-60"
              >
                {busy === "deleting" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
