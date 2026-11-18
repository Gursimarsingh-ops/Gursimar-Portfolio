import { useEffect, useRef, useState } from "react";
import { Check, Clapperboard, Scissors, Sliders, Sparkles, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

const STAGES = [
  { label: "Raw Footage", note: "Ingest & organise" },
  { label: "Selects", note: "Story & structure" },
  { label: "Cut", note: "Rhythm & pacing" },
  { label: "Grade", note: "Look & consistency" },
  { label: "Final Export", note: "Delivery specifications" },
];

const PILLARS = [
  { icon: Scissors, label: "Detail" },
  { icon: Sliders, label: "Precision" },
  { icon: Check, label: "Consistency" },
];

function useReveal<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        const onScreen = entries.some((e) => e.isIntersecting);
        setVisible(onScreen);
        if (onScreen) setInView(true);
      },
      { threshold: 0.12 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, inView, visible };
}

/** One cycling monitor: raw plate → cut → graded → export. */
function PipelineMonitor({ play }: { play: boolean }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 p-2 shadow-[0_30px_70px_-40px_rgba(0,0,0,0.85)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_120%_at_50%_0%,#20242c_0%,#0b0d11_60%,#05060a_100%)]" />

      <div className={cn("relative", !play && "anim-paused")}>
        {/* monitor chrome */}
        <div className="flex items-center justify-between border-b border-white/10 px-1 pb-1.5">
          <span className="flex items-center gap-1">
            <span className="h-1 w-1 rounded-full bg-white/40" />
            <span className="h-1 w-1 rounded-full bg-white/25" />
            <span className="h-1 w-1 rounded-full bg-white/15" />
          </span>
          <span className="text-[8px] uppercase tracking-[0.24em] text-white/35">Sequence 01 · 4K</span>
          <span className="flex items-center gap-1">
            <span className="h-1 w-1 rounded-full bg-red-500" style={{ animation: "pulse 1.8s ease-in-out infinite" }} />
            <span className="text-[8px] uppercase tracking-[0.16em] text-white/45">Rec</span>
          </span>
        </div>

        {/* frame */}
        <div className="relative mt-2 h-36 overflow-hidden rounded-lg bg-black sm:h-44">
          {/* 01 raw */}
          <div className="absolute inset-0" style={{ animation: "frame-cycle 8s linear infinite" }}>
            <div className="absolute inset-0 bg-gradient-to-b from-neutral-500 via-neutral-600 to-neutral-700" />
            <div className="absolute inset-0 opacity-30 [background-image:repeating-linear-gradient(0deg,rgba(255,255,255,0.14)_0px,rgba(255,255,255,0.14)_1px,transparent_1px,transparent_3px)]" />
            <div className="absolute bottom-3 left-3 h-10 w-3 rounded-t-full bg-neutral-800/70" />
            <div className="absolute bottom-3 left-8 h-6 w-2 rounded-t-full bg-neutral-800/60" />
            <span className="absolute left-2 top-2 rounded-sm bg-black/60 px-1.5 py-0.5 text-[8px] uppercase tracking-[0.2em] text-white/70">
              Raw · Log
            </span>
          </div>

          {/* 02 cut */}
          <div className="absolute inset-0" style={{ animation: "frame-cycle 8s linear infinite", animationDelay: "2s" }}>
            <div className="absolute inset-0 bg-gradient-to-br from-neutral-600 via-neutral-700 to-neutral-800" />
            <div className="absolute inset-x-3 bottom-3 space-y-1.5">
              {[72, 46, 62, 34].map((w, i) => (
                <span
                  key={i}
                  className="block h-3 overflow-hidden rounded-sm border border-white/20 bg-white/5"
                  style={{ width: `${w}%` }}
                >
                  <span
                    className="block h-full bg-gradient-to-r from-sky-400/70 to-indigo-500/60"
                    style={{ animation: `wipe 2.4s linear ${i * 0.2}s infinite` }}
                  />
                </span>
              ))}
            </div>
            <span className="absolute left-2 top-2 rounded-sm bg-black/60 px-1.5 py-0.5 text-[8px] uppercase tracking-[0.2em] text-white/70">
              Cut · Assembly
            </span>
          </div>

          {/* 03 grade */}
          <div className="absolute inset-0" style={{ animation: "frame-cycle 8s linear infinite", animationDelay: "4s" }}>
            <div className="absolute inset-0 bg-gradient-to-b from-[#20303f] via-[#8a5a3c] to-[#0b1118]" />
            <div className="absolute right-8 top-6 h-8 w-8 rounded-full bg-orange-300/80 blur-[3px]" />
            <div className="absolute inset-x-0 bottom-0 h-12 bg-[#0a0f14] [clip-path:polygon(0_100%,20%_40%,42%_72%,64%_28%,86%_62%,100%_44%,100%_100%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(70%_60%_at_78%_18%,rgba(251,191,36,0.3),transparent_70%)]" />
            <div className="absolute bottom-3 left-3 flex items-end gap-[2px]">
              {[6, 10, 14, 9, 16, 12, 8].map((h, i) => (
                <span
                  key={i}
                  className="w-[3px] rounded-[1px] bg-amber-200/80"
                  style={{ height: h, transformOrigin: "bottom", animation: `bar 1.2s ease-in-out ${i * 0.08}s infinite` }}
                />
              ))}
            </div>
            <span className="absolute left-2 top-2 rounded-sm bg-black/60 px-1.5 py-0.5 text-[8px] uppercase tracking-[0.2em] text-amber-100/80">
              Grade · Finishing
            </span>
          </div>

          {/* 04 export */}
          <div
            className="absolute inset-0 grid place-items-center bg-gradient-to-br from-neutral-900 to-black"
            style={{ animation: "frame-cycle 8s linear infinite", animationDelay: "6s" }}
          >
            <div className="text-center">
              <span className="mx-auto grid h-9 w-9 place-items-center rounded-full border border-emerald-300/60 bg-emerald-400/15 text-emerald-200">
                <Upload className="h-4 w-4" />
              </span>
              <p className="mt-2 text-[9px] uppercase tracking-[0.24em] text-white/60">Master delivered</p>
              <div className="mx-auto mt-2 h-1 w-28 overflow-hidden rounded-full bg-white/10">
                <span className="block h-full w-full rounded-full bg-emerald-300/80" style={{ animation: "pipeline-fill 2s ease-out infinite" }} />
              </div>
            </div>
          </div>

          <span className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/10" />
        </div>

        {/* timeline rail */}
        <div className="relative mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
          <span className="block h-full rounded-full bg-gradient-to-r from-white/40 via-white/80 to-white" style={{ animation: "pipeline-fill 8s linear infinite" }} />
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-[8px] uppercase tracking-[0.2em] text-white/30">Raw</span>
          <span className="text-[8px] uppercase tracking-[0.2em] text-white/50">Delivered</span>
        </div>
      </div>
    </div>
  );
}

export function WorkflowQuality() {
  const { ref, inView, visible } = useReveal<HTMLDivElement>();

  /** Index of the stage the progress has reached (0 → 4), cycled while visible. */
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!visible) return;
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setStep(STAGES.length - 1);
      return;
    }

    let current = 0;
    let timer = 0;
    setStep(0);
    const tick = () => {
      current = (current + 1) % STAGES.length;
      setStep(current);
      timer = window.setTimeout(tick, current === STAGES.length - 1 ? 2800 : 1500);
    };
    timer = window.setTimeout(tick, 1500);
    return () => window.clearTimeout(timer);
  }, [visible]);

  return (
    <section id="workflow" className="relative scroll-mt-24 overflow-hidden border-t border-neutral-200 bg-white py-24">
      <div className="pointer-events-none absolute inset-0 opacity-[0.4] [background-image:linear-gradient(to_right,#e8e8e8_1px,transparent_1px),linear-gradient(to_bottom,#e8e8e8_1px,transparent_1px)] [background-size:72px_72px]" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-neutral-200/60 blur-3xl" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-white to-transparent" />

      <div ref={ref} className="relative mx-auto max-w-6xl px-6">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-7">
            <p
              className={cn(
                "text-[11px] uppercase tracking-[0.28em] text-neutral-500 transition-all duration-700",
                inView ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
              )}
            >
              Quality · Workflow
            </p>

            <h2
              className={cn(
                "mt-4 font-serif text-[2rem] leading-[1.06] tracking-tight text-neutral-950 transition-all delay-75 duration-700 sm:text-[2.6rem] md:text-5xl lg:text-[3.4rem]",
                inView ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
              )}
            >
              Exceptional Quality.
              <br />
              Professional Workflow.
              <br />
              <span className="bg-gradient-to-r from-neutral-500 via-neutral-400 to-neutral-300 bg-clip-text text-transparent">
                Every Edit.
              </span>
            </h2>

            <p
              className={cn(
                "mt-6 max-w-xl border-l border-neutral-200 pl-5 text-sm leading-7 text-neutral-600 transition-all delay-150 duration-700 md:text-base",
                inView ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
              )}
            >
              Every project deserves attention to detail, creative precision, and a
              professional approach. From the first cut to the final export, quality
              remains our priority.
            </p>

            <div
              className={cn(
                "mt-8 flex flex-wrap items-center gap-2 transition-all delay-200 duration-700",
                inView ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
              )}
            >
              {PILLARS.map((p) => (
                <span
                  key={p.label}
                  className="group inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white/70 px-3.5 py-1.5 text-[10px] uppercase tracking-[0.2em] text-neutral-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:border-neutral-400 hover:text-neutral-900"
                >
                  <p.icon className="h-3.5 w-3.5 text-neutral-400 transition-colors group-hover:text-neutral-900" />
                  {p.label}
                </span>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5">
            <div
              className={cn(
                "transition-all delay-150 duration-700",
                inView ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
              )}
            >
              <PipelineMonitor play={visible} />
            </div>
          </div>
        </div>

        {/* workflow stages */}
        <div className="mt-14 overflow-hidden rounded-2xl border border-neutral-200 bg-gradient-to-b from-white via-neutral-50/70 to-white p-5 shadow-[0_18px_50px_-40px_rgba(0,0,0,0.5)] sm:p-7">
          <div className="flex items-center justify-between gap-4">
            <p className="text-[10px] uppercase tracking-[0.24em] text-neutral-400">Pipeline</p>
            <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-neutral-400">
              <Clapperboard className="h-3.5 w-3.5" />
              Raw → Delivered
            </span>
          </div>

          <div className="relative mt-7">
            <ol className="relative grid grid-cols-1 gap-5 sm:grid-cols-5 sm:gap-3">
              {STAGES.map((stage, i) => {
                const reached = visible && step >= i;
                const isCurrent = visible && step === i;
                const isLast = i === STAGES.length - 1;

                return (
                  <li
                    key={stage.label}
                    className="group relative flex items-start gap-3 sm:flex-col sm:items-center sm:gap-2.5 sm:text-center"
                    style={{ transitionDelay: `${220 + i * 90}ms` }}
                  >
                    {/* Connector: vertical between mobile rows, horizontal between desktop nodes */}
                    {!isLast && (
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute left-[12px] top-[28px] h-[16px] w-[2px] overflow-hidden rounded-full bg-neutral-200/90 sm:left-[calc(50%+19px)] sm:top-[12px] sm:h-[2px] sm:w-[calc(100%-28px)]"
                      >
                        <span
                          className={cn(
                            "absolute inset-0 origin-top rounded-full bg-gradient-to-b from-neutral-900 via-neutral-600 to-neutral-400 transition-all duration-700 ease-out sm:origin-left sm:scale-y-100 sm:bg-gradient-to-r",
                            reached ? "scale-y-100 sm:scale-x-100" : "scale-y-0 sm:scale-x-0"
                          )}
                        />
                        {isCurrent && (
                          <span
                            className="absolute h-full w-[6px] rounded-full bg-white/90 blur-[1px] sm:h-full sm:w-[10px]"
                            style={{ animation: "rail-travel 1.5s linear infinite" }}
                          />
                        )}
                      </span>
                    )}

                    <span
                      className={cn(
                        "relative z-10 grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full border bg-white text-[9px] font-semibold tabular-nums transition-all duration-500",
                        "group-hover:-translate-y-0.5 group-hover:border-neutral-700 group-hover:text-neutral-900",
                        inView ? "opacity-100" : "opacity-0",
                        reached
                          ? "border-neutral-900 text-neutral-900 shadow-[0_0_0_4px_rgba(23,23,23,0.05),0_10px_20px_-14px_rgba(0,0,0,0.8)]"
                          : "border-neutral-300 text-neutral-400"
                      )}
                    >
                      {reached && (
                        <span
                          aria-hidden="true"
                          className={cn(
                            "pointer-events-none absolute -inset-1.5 rounded-full border border-neutral-900/15",
                            isCurrent && "border-neutral-900/30"
                          )}
                          style={isCurrent ? { animation: "stage-glow 1.5s ease-in-out infinite" } : undefined}
                        />
                      )}
                      {String(i + 1).padStart(2, "0")}
                    </span>

                    <div className="min-w-0">
                      <p
                        className={cn(
                          "text-[12px] font-semibold tracking-tight transition-colors duration-500 sm:text-[13px]",
                          reached ? "text-neutral-900" : "text-neutral-500",
                          "group-hover:text-neutral-950"
                        )}
                      >
                        {stage.label}
                      </p>
                      <p className="mt-0.5 text-[10px] uppercase leading-relaxed tracking-[0.14em] text-neutral-400 transition-colors duration-300 group-hover:text-neutral-500">
                        {stage.note}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>

        {/* statement */}
        <div
          className={cn(
            "relative mt-8 overflow-hidden rounded-2xl border border-neutral-900/10 bg-neutral-950 px-6 py-8 transition-all delay-200 duration-700 sm:px-10 sm:py-10",
            inView ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
          )}
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_140%_at_0%_0%,#24272e_0%,#0d1015_55%,#05070a_100%)]" />
          <div className="pointer-events-none absolute -right-10 top-1/2 h-40 w-40 -translate-y-1/2 rounded-full bg-white/10 blur-3xl" />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <span className="mt-1 grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/15 bg-white/[0.06] text-white/70">
                <Sparkles className="h-4 w-4" />
              </span>
              <blockquote className="max-w-2xl">
                <p className="font-serif text-xl leading-snug text-white sm:text-2xl md:text-[1.75rem]">
                  “Budget matters in editing, but quality is never compromised.”
                </p>
                <p className="mt-2 text-[10px] uppercase tracking-[0.24em] text-white/40">
                  GurSimar Singh · Standard on every project
                </p>
              </blockquote>
            </div>
            <span className="flex items-center gap-2 self-start rounded-full border border-white/15 bg-white/[0.04] px-3.5 py-1.5 text-[9px] uppercase tracking-[0.2em] text-white/55 sm:self-auto">
              <span className="h-1 w-1 rounded-full bg-emerald-400" style={{ animation: "pulse 2s ease-in-out infinite" }} />
              Quality first
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
