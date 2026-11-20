import { useRef, useState } from "react";
import { AlertTriangle, Check, ChevronDown, Loader2, Paperclip, X } from "lucide-react";
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

/** Required-field checkpoints shown as the sheet's progress meter. */
const CHECKPOINTS = ["Name", "Email", "Category", "Brief", "Budget"];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

function inputCls(error?: string) {
  return cn(
    "peer w-full appearance-none rounded-none border-0 border-b bg-transparent px-1 pb-2.5 pt-1 text-[13.5px] text-neutral-900 outline-none transition-colors duration-300 placeholder:text-neutral-400",
    error ? "border-red-400 focus:border-red-500" : "border-neutral-300 focus:border-neutral-900"
  );
}

/** Fine underline that draws itself when the field takes focus. */
function FocusLine({ error }: { error?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-x-0 bottom-0 h-[2px] origin-left scale-x-0 transition-transform duration-300 ease-out group-focus-within/field:scale-x-100",
        error ? "bg-red-500" : "bg-neutral-900"
      )}
    />
  );
}

function Field({
  label,
  required,
  hint,
  error,
  index = 0,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  index?: number;
  children: React.ReactNode;
}) {
  return (
    <label
      className="block"
      style={{ animation: `field-rise 520ms cubic-bezier(0.22, 1, 0.36, 1) ${90 + index * 45}ms both` }}
    >
      <span className="mb-2 flex items-baseline gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
          {label}
        </span>
        {required && <span className="text-[11px] leading-none text-neutral-900">*</span>}
        {hint && (
          <span className="text-[10px] font-normal normal-case tracking-normal text-neutral-400">
            {hint}
          </span>
        )}
      </span>
      <span className="group/field relative block">
        {children}
        <FocusLine error={error} />
      </span>
      {error && <span className="mt-1.5 block text-[11px] text-red-500">{error}</span>}
    </label>
  );
}

/** Numbered divider that introduces each block of the booking sheet. */
function SectionRule({ index, title, note }: { index: string; title: string; note: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-neutral-400">{index}</span>
      <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-900">{title}</span>
      <span className="h-px flex-1 origin-left bg-gradient-to-r from-neutral-300 to-transparent" style={{ animation: "sheet-rule 700ms ease-out both" }} />
      <span className="hidden text-[9px] uppercase tracking-[0.16em] text-neutral-400 sm:inline">{note}</span>
    </div>
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

/** Short, stable-enough reference shown on the sheet like a booking number. */
function bookingRef(): string {
  const stamp = Date.now().toString(36).slice(-4).toUpperCase();
  return `GS-${stamp}`;
}

export function ProjectInquiryDialog({ open, onOpenChange }: Props) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [files, setFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [progress, setProgress] = useState(0);
  const [serverError, setServerError] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);
  const [ref] = useState(bookingRef);
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

  // Completion meter: every filled field counts, required ones are also listed.
  const completionValues = [
    form.name,
    form.email,
    form.type,
    form.description,
    form.budget,
    form.deadline,
    form.references,
    form.extra,
    form.discord,
    form.company,
  ];
  const completion = Math.round(
    (completionValues.filter((value) => value.trim().length > 0).length / completionValues.length) * 100
  );
  const done = [
    Boolean(form.name.trim()),
    Boolean(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)),
    Boolean(form.type),
    Boolean(form.description.trim()),
    Boolean(form.budget),
  ];

  return (
    <div
      className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto bg-neutral-950/70 p-3 backdrop-blur-sm sm:p-4"
      onClick={() => !submitting && onOpenChange(false)}
    >
      <div
        className="relative my-auto max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[22px] border border-neutral-900/15 bg-white shadow-[0_60px_140px_-45px_rgba(0,0,0,0.8)]"
        style={{ animation: "sheet-in 440ms cubic-bezier(0.22, 1, 0.36, 1) both" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* paper grain + printed rules */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.55] [background-image:repeating-linear-gradient(to_bottom,rgba(23,23,23,0.035)_0px,rgba(23,23,23,0.035)_1px,transparent_1px,transparent_28px)]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_60%_at_50%_-10%,rgba(255,255,255,0.9),transparent_70%)]"
        />

        <div className="sticky top-0 z-20 border-b border-neutral-200/90 bg-white/95 backdrop-blur-md">
          <div className="flex items-start justify-between gap-4 px-5 pb-3 pt-5 sm:px-8">
            <div className="flex items-start gap-3">
              <span className="relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-neutral-950 text-[11px] font-semibold tracking-[0.08em] text-white">
                <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent" />
                GS
              </span>
              <div>
                <p className="text-[9px] uppercase tracking-[0.3em] text-neutral-400">Project booking</p>
                <p className="mt-1 font-serif text-[17px] font-semibold leading-none tracking-tight text-neutral-950">
                  Start a Project
                </p>
                <p className="mt-1.5 text-[9px] uppercase tracking-[0.18em] text-neutral-400">
                  Reference {ref} · Studio 01
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden rounded-full border border-neutral-200 px-2.5 py-1 text-[9px] uppercase tracking-[0.16em] text-neutral-500 sm:inline">
                {completion}% complete
              </span>
              <button
                onClick={() => !submitting && onOpenChange(false)}
                disabled={submitting}
                aria-label="Close inquiry form"
                className="grid h-8 w-8 place-items-center rounded-md border border-neutral-200 text-neutral-500 transition-all duration-300 hover:rotate-90 hover:border-neutral-900 hover:text-neutral-950 disabled:opacity-40"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* sheet progress rail */}
          <div className="px-5 pb-3 sm:px-8">
            <div className="h-[3px] w-full overflow-hidden rounded-full bg-neutral-200/80">
              <span
                className="block h-full rounded-full bg-gradient-to-r from-neutral-900 via-neutral-700 to-neutral-400 transition-[width] duration-500 ease-out"
                style={{ width: `${Math.max(completion, status === "success" ? 100 : 2)}%` }}
              />
            </div>
            <div className="mt-2 hidden items-center gap-3 sm:flex">
              {CHECKPOINTS.map((label, i) => (
                <span
                  key={label}
                  className={cn(
                    "flex items-center gap-1.5 text-[8px] uppercase tracking-[0.16em] transition-colors duration-500",
                    done[i] ? "text-neutral-900" : "text-neutral-400"
                  )}
                >
                  <span
                    className={cn(
                      "grid h-3 w-3 place-items-center rounded-full border transition-all duration-500",
                      done[i] ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-300"
                    )}
                  >
                    {done[i] && <Check className="h-2 w-2" />}
                  </span>
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>

        {status === "success" ? (
          <div className="relative px-6 py-10 text-center sm:px-10">
            <div className="relative mx-auto h-16 w-16">
              <span
                className="absolute inset-0 rounded-full border border-emerald-500/40"
                style={{ animation: "success-ring 1.8s ease-out infinite" }}
              />
              <span className="relative grid h-16 w-16 place-items-center rounded-full border border-emerald-600/25 bg-emerald-50 text-emerald-700">
                <svg viewBox="0 0 32 32" className="h-7 w-7" fill="none" aria-hidden="true">
                  <path
                    d="M8 17.2 L13.4 22.4 L24 11.4"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray="44"
                    style={{ animation: "success-check 700ms 120ms ease-out both" }}
                  />
                </svg>
              </span>
            </div>

            <div
              className="mx-auto mt-5 inline-flex items-center gap-2 rounded-md border border-neutral-900/70 px-3 py-1 text-[9px] font-semibold uppercase tracking-[0.24em] text-neutral-900"
              style={{ animation: "seal-in 620ms 160ms cubic-bezier(0.22, 1, 0.36, 1) both" }}
            >
              Received
              <span className="h-1 w-1 rounded-full bg-neutral-900" />
              {ref}
            </div>

            <h3 className="mt-4 font-serif text-2xl font-semibold tracking-tight text-neutral-950">
              Inquiry received
            </h3>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-neutral-500">
              Your request is saved securely and now appears in the administrator dashboard. GurSimar will
              reply to <span className="font-medium text-neutral-800">{form.email || "your email"}</span>.
            </p>
            {requestId && (
              <div className="mx-auto mt-5 inline-flex flex-col items-start gap-1 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-left">
                <span className="text-[9px] uppercase tracking-[0.18em] text-neutral-400">Request ID</span>
                <span className="font-mono text-[11px] text-neutral-700">{requestId}</span>
                {submittedAt && (
                  <span className="text-[10px] text-neutral-400">
                    {new Date(submittedAt).toLocaleString()}
                  </span>
                )}
              </div>
            )}
            <div className="mt-7 flex justify-center gap-3">
              <button
                onClick={reset}
                className="rounded-full border border-neutral-300 px-5 py-2 text-sm font-semibold text-neutral-800 transition-all duration-300 hover:-translate-y-0.5 hover:border-neutral-900"
              >
                New Inquiry
              </button>
              <button
                onClick={() => {
                  reset();
                  onOpenChange(false);
                }}
                className="rounded-full bg-neutral-900 px-5 py-2 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-neutral-700"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="relative space-y-7 px-5 py-6 sm:px-8">
            <div className="space-y-5">
              <SectionRule index="01" title="Contact details" note="How to reach you" />

              <Field label="Full Name" required error={errors.name} index={0}>
                  <input
                    value={form.name}
                    onChange={(e) => update("name", e.target.value)}
                    className={inputCls(errors.name)}
                    placeholder="Your full name"
                    autoComplete="name"
                  />
                </Field>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field label="Email Address" required error={errors.email} index={1}>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => update("email", e.target.value)}
                    className={inputCls(errors.email)}
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                </Field>
                <Field label="Discord Username" hint="optional" index={2}>
                  <input
                    value={form.discord}
                    onChange={(e) => update("discord", e.target.value)}
                    className={inputCls()}
                    placeholder="username"
                  />
                </Field>
              </div>
            </div>

            <div className="space-y-5">
              <SectionRule index="02" title="The project" note="Scope and direction" />

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field label="Project Category" required error={errors.type} index={3}>
                  <span className="relative block">
                    <select
                      value={form.type}
                      onChange={(e) => update("type", e.target.value)}
                      className={cn(inputCls(errors.type), "cursor-pointer pr-6")}
                    >
                      <option value="">Select category</option>
                      {PROJECT_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute bottom-3 right-1 h-3.5 w-3.5 text-neutral-400 transition-transform duration-300 group-focus-within/field:-translate-y-0.5 group-focus-within/field:text-neutral-900" />
                  </span>
                </Field>
                <Field label="Budget" required error={errors.budget} index={4}>
                  <span className="relative block">
                    <select
                      value={form.budget}
                      onChange={(e) => update("budget", e.target.value)}
                      className={cn(inputCls(errors.budget), "cursor-pointer pr-6")}
                    >
                      <option value="">Select budget</option>
                      {BUDGETS.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute bottom-3 right-1 h-3.5 w-3.5 text-neutral-400 transition-transform duration-300 group-focus-within/field:-translate-y-0.5 group-focus-within/field:text-neutral-900" />
                  </span>
                </Field>
              </div>

              <Field label="Project Description" required error={errors.description} index={5}>
                <textarea
                  value={form.description}
                  onChange={(e) => update("description", e.target.value)}
                  rows={4}
                  className={cn(inputCls(errors.description), "resize-none")}
                  placeholder="Tell me about your project, goals and style references."
                />
              </Field>
            </div>

            <div className="space-y-5">
              <SectionRule index="03" title="Timeline & references" note="Optional details" />

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field label="Expected Deadline" hint="optional" index={6}>
                  <input
                    type="date"
                    value={form.deadline}
                    onChange={(e) => update("deadline", e.target.value)}
                    className={inputCls()}
                  />
                </Field>
                <Field label="Reference Links" hint="optional" index={7}>
                  <input
                    value={form.references}
                    onChange={(e) => update("references", e.target.value)}
                    className={inputCls()}
                    placeholder="https://..."
                  />
                </Field>
              </div>

              <Field label="Additional Information" hint="optional" index={8}>
                <textarea
                  value={form.extra}
                  onChange={(e) => update("extra", e.target.value)}
                  rows={3}
                  className={cn(inputCls(), "resize-none")}
                  placeholder="Anything else: tools, references, collaboration details."
                />
              </Field>
            </div>

            <div
              className="space-y-4"
              style={{ animation: "field-rise 520ms cubic-bezier(0.22, 1, 0.36, 1) 500ms both" }}
            >
              <SectionRule index="04" title="Attachments" note="Brief or references" />

              <div>
                <span className="mb-1.5 flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
                    Files
                  </span>
                  <span className="text-[10px] text-neutral-400">
                    images, PDF, DOC/DOCX, TXT · max 5 files, 25 MB
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
                    className="group inline-flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-medium text-neutral-700 transition-all duration-300 hover:-translate-y-0.5 hover:border-neutral-900 hover:text-neutral-950 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Paperclip className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-rotate-12" />
                    Choose files
                  </button>
                  <span className="text-[10px] tabular-nums text-neutral-400">
                    {files.length} / {MAX_FILES}
                  </span>
                </div>
              </div>

              {files.length > 0 && (
                <ul className="mt-1 space-y-1.5">
                  {files.map((file, index) => (
                    <li
                      key={`${file.name}-${index}`}
                      className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-[11px] text-neutral-600"
                      style={{ animation: "field-rise 320ms ease-out both" }}
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

            <div className="flex flex-col-reverse items-stretch gap-3 border-t border-neutral-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[9px] uppercase tracking-[0.16em] text-neutral-400">
                Deliverables confirmed by email · {ref}
              </p>
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  disabled={submitting}
                  className="rounded-full border border-neutral-300 px-5 py-2 text-sm font-semibold text-neutral-800 transition-all duration-300 hover:-translate-y-0.5 hover:border-neutral-900 disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full border border-neutral-900 bg-neutral-900 px-6 py-2.5 text-sm font-semibold text-white shadow-[0_16px_34px_-24px_rgba(0,0,0,0.95)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-neutral-800 active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="pointer-events-none absolute inset-0 -translate-x-[130%] skew-x-[-14deg] bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-[130%]" />
                  <span className="relative">{submitting ? "Sending…" : "Submit Inquiry"}</span>
                  <span className="relative grid h-4 w-4 place-items-center">
                    {submitting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Check className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
                    )}
                  </span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
