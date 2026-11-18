import { useRef, useState } from "react";
import { AlertTriangle, Check, Loader2, Paperclip, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatFileSize, submitInquiry } from "@/lib/portalApi";

const PROJECT_TYPES = [
  "Gaming Video Editing",
  "Corporate Video Editing",
  "Documentary Editing",
  "Short-form Editing",
  "Thumbnail Design",
  "Graphic Design",
  "Motion Graphics",
  "Color Grading",
  "Real Estate Video",
  "SaaS Animation",
  "Other",
];

const BUDGETS = [
  "Under $250",
  "$250 – $500",
  "$500 – $1,000",
  "$1,000 – $2,500",
  "$2,500+",
  "Let's discuss",
];

const ACCEPT =
  "image/jpeg,image/png,image/webp,image/gif,application/pdf,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const MAX_FILES = 5;
const MAX_TOTAL = 25 * 1024 * 1024;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

function inputCls(error?: string) {
  return cn(
    "w-full rounded-lg border bg-white px-3 py-2 text-sm text-neutral-900 outline-none transition-colors placeholder:text-neutral-400",
    error
      ? "border-red-400 focus:border-red-500"
      : "border-neutral-300 focus:border-neutral-900"
  );
}

function Field({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-neutral-600">
        {label}
        {required && <span className="text-red-500">*</span>}
        {hint && (
          <span className="text-[10px] font-normal normal-case tracking-normal text-neutral-400">
            ({hint})
          </span>
        )}
      </span>
      {children}
      {error && <span className="mt-1 block text-xs text-red-500">{error}</span>}
    </label>
  );
}

const EMPTY_FORM = {
  name: "",
  email: "",
  company: "",
  discord: "",
  type: "",
  description: "",
  budget: "",
  deadline: "",
  references: "",
  extra: "",
};

export function ProjectInquiryDialog({ open, onOpenChange }: Props) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [files, setFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [progress, setProgress] = useState(0);
  const [serverError, setServerError] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement | null>(null);

  if (!open) return null;

  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    const next = [...files];
    let total = next.reduce((sum, file) => sum + file.size, 0);
    let fileError: string | null = null;

    for (const file of Array.from(incoming)) {
      if (next.length >= MAX_FILES) {
        fileError = `You can attach at most ${MAX_FILES} files.`;
        break;
      }
      if (!ACCEPT.split(",").includes(file.type)) {
        fileError = `"${file.name}" is not an accepted file type.`;
        continue;
      }
      if (total + file.size > MAX_TOTAL) {
        fileError = "Attachments exceed the 25 MB combined limit.";
        break;
      }
      total += file.size;
      next.push(file);
    }

    setFiles(next);
    setErrors((current) => {
      const copy = { ...current };
      if (fileError) copy.files = fileError;
      else delete copy.files;
      return copy;
    });
    if (fileInput.current) fileInput.current.value = "";
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Full name is required.";
    if (!form.email.trim()) e.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Enter a valid email.";
    if (!form.type) e.type = "Select a project type.";
    if (!form.description.trim()) e.description = "Describe your project.";
    if (!form.budget) e.budget = "Select a budget range.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setServerError(null);
    if (!validate()) {
      setStatus("error");
      return;
    }

    setStatus("submitting");
    setProgress(0);
    try {
      const result = await submitInquiry(
        {
          name: form.name,
          email: form.email,
          company: form.company,
          discord: form.discord,
          category: form.type,
          budget: form.budget,
          description: form.description,
          extra: form.extra,
          deadline: form.deadline,
          references: form.references,
        },
        files,
        setProgress
      );
      setRequestId(result.request.id);
      setSubmittedAt(result.request.createdAt);
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setServerError(err instanceof Error ? err.message : "Your inquiry could not be submitted.");
    }
  };

  const reset = () => {
    setForm(EMPTY_FORM);
    setFiles([]);
    setErrors({});
    setServerError(null);
    setRequestId(null);
    setSubmittedAt(null);
    setStatus("idle");
    setProgress(0);
  };

  const submitting = status === "submitting";

  return (
    <div
      className="fixed inset-0 z-[80] grid place-items-center bg-neutral-950/70 p-4 backdrop-blur-sm"
      onClick={() => !submitting && onOpenChange(false)}
    >
      <div
        className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-neutral-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-200 bg-white px-6 py-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">Project Inquiry</p>
            <p className="text-base font-semibold text-neutral-950">Start a Project</p>
          </div>
          <button
            onClick={() => !submitting && onOpenChange(false)}
            disabled={submitting}
            aria-label="Close inquiry form"
            className="grid h-8 w-8 place-items-center rounded-md border border-neutral-200 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-950 disabled:opacity-40"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {status === "success" ? (
          <div className="p-8 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-50 text-emerald-600">
              <Check className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-neutral-950">Inquiry received</h3>
            <p className="mx-auto mt-2 max-w-sm text-sm text-neutral-500">
              Your request is saved securely and now appears in the administrator dashboard. GurSimar will
              reply to <span className="font-medium text-neutral-800">{form.email || "your email"}</span>.
            </p>
            {requestId && (
              <div className="mx-auto mt-4 inline-flex flex-col items-start gap-1 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-left">
                <span className="text-[9px] uppercase tracking-[0.18em] text-neutral-400">Request ID</span>
                <span className="font-mono text-[11px] text-neutral-700">{requestId}</span>
                {submittedAt && (
                  <span className="text-[10px] text-neutral-400">
                    {new Date(submittedAt).toLocaleString()}
                  </span>
                )}
              </div>
            )}
            <div className="mt-6 flex justify-center gap-3">
              <button
                onClick={reset}
                className="rounded-full border border-neutral-300 px-5 py-2 text-sm font-semibold text-neutral-800 transition-colors hover:border-neutral-900"
              >
                New Inquiry
              </button>
              <button
                onClick={() => {
                  reset();
                  onOpenChange(false);
                }}
                className="rounded-full bg-neutral-900 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-neutral-700"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-5 p-6">
            <Field label="Full Name" required error={errors.name}>
              <input
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                className={inputCls(errors.name)}
                placeholder="Your full name"
                autoComplete="name"
              />
            </Field>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field label="Email Address" required error={errors.email}>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  className={inputCls(errors.email)}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </Field>
              <Field label="Discord Username" hint="optional">
                <input
                  value={form.discord}
                  onChange={(e) => update("discord", e.target.value)}
                  className={inputCls()}
                  placeholder="username"
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field label="Project Category" required error={errors.type}>
                <select
                  value={form.type}
                  onChange={(e) => update("type", e.target.value)}
                  className={inputCls(errors.type)}
                >
                  <option value="">Select category</option>
                  {PROJECT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Budget" required error={errors.budget}>
                <select
                  value={form.budget}
                  onChange={(e) => update("budget", e.target.value)}
                  className={inputCls(errors.budget)}
                >
                  <option value="">Select budget</option>
                  {BUDGETS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Project Description" required error={errors.description}>
              <textarea
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                rows={4}
                className={inputCls(errors.description)}
                placeholder="Tell me about your project, goals and style references."
              />
            </Field>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field label="Expected Deadline" hint="optional">
                <input
                  type="date"
                  value={form.deadline}
                  onChange={(e) => update("deadline", e.target.value)}
                  className={inputCls()}
                />
              </Field>
              <Field label="Reference Links" hint="optional">
                <input
                  value={form.references}
                  onChange={(e) => update("references", e.target.value)}
                  className={inputCls()}
                  placeholder="https://..."
                />
              </Field>
            </div>

            <Field label="Additional Information" hint="optional">
              <textarea
                value={form.extra}
                onChange={(e) => update("extra", e.target.value)}
                rows={3}
                className={inputCls()}
                placeholder="Anything else: tools, references, collaboration details."
              />
            </Field>

            <div>
              <span className="mb-1.5 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-neutral-600">
                Attachments
                <span className="text-[10px] font-normal normal-case tracking-normal text-neutral-400">
                  (optional · images, PDF, DOC/DOCX, TXT · max 5 files, 25 MB)
                </span>
              </span>
              <input
                ref={fileInput}
                type="file"
                multiple
                accept={ACCEPT}
                onChange={(e) => addFiles(e.target.files)}
                className="hidden"
                aria-label="Attach reference files"
              />
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  disabled={files.length >= MAX_FILES || submitting}
                  className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-medium text-neutral-700 transition-colors hover:border-neutral-900 hover:text-neutral-950 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Paperclip className="h-3.5 w-3.5" />
                  Choose files
                </button>
                <span className="text-[10px] text-neutral-400">{files.length} / {MAX_FILES}</span>
              </div>

              {files.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {files.map((file, index) => (
                    <li
                      key={`${file.name}-${index}`}
                      className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-[11px] text-neutral-600"
                    >
                      <span className="truncate">{file.name}</span>
                      <span className="flex shrink-0 items-center gap-2">
                        <span className="text-neutral-400">{formatFileSize(file.size)}</span>
                        <button
                          type="button"
                          onClick={() => setFiles((current) => current.filter((_, i) => i !== index))}
                          disabled={submitting}
                          aria-label={`Remove ${file.name}`}
                          className="text-neutral-400 transition-colors hover:text-neutral-900 disabled:opacity-40"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {errors.files && <span className="mt-1 block text-xs text-red-500">{errors.files}</span>}
            </div>

            {(status === "error" || serverError) && (
              <p className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {serverError ?? "Please fix the highlighted fields before submitting."}
              </p>
            )}

            {submitting && progress > 0 && (
              <div>
                <div className="h-1 overflow-hidden rounded-full bg-neutral-200">
                  <div
                    className="h-full rounded-full bg-neutral-900 transition-[width] duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-neutral-400">
                  Uploading attachments · {progress}%
                </p>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 border-t border-neutral-200 pt-5">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
                className="rounded-full border border-neutral-300 px-5 py-2 text-sm font-semibold text-neutral-800 transition-colors hover:border-neutral-900 disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-full bg-neutral-900 px-6 py-2 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-neutral-700 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {submitting ? "Submitting…" : "Submit Inquiry"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
