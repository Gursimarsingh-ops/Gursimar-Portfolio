import { useEffect, useRef, useState, type ComponentType } from "react";
import { Mail, MessageCircle, ArrowUpRight, Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

const GMAIL = "gursimarsingh9390@gmail.com";
const DISCORD = "Xblade09";
const BEHANCE_URL = "https://www.behance.net/gursimasinghc";

/** Behance wordmark, drawn inline so the channel has a real brand mark. */
function BehanceMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M1.8 5.4h6.1c2.5 0 4 1.1 4 2.9 0 1.2-.7 2.1-1.8 2.5 1.4.4 2.3 1.5 2.3 3 0 2.2-1.7 3.5-4.4 3.5H1.8V5.4Zm2.4 2v2.9h3.1c1.1 0 1.8-.5 1.8-1.4 0-1-.7-1.5-1.9-1.5H4.2Zm0 4.8v3.2h3.5c1.3 0 2.1-.6 2.1-1.6s-.8-1.6-2.2-1.6H4.2Z" />
      <path d="M21.4 6.4h-5.6v1.6h5.6V6.4Z" />
      <path d="M18.9 9.5c2.2 0 3.7 1.5 3.7 3.8v.6h-5.5c.2 1.1 1 1.8 2.1 1.8.9 0 1.5-.4 1.9-1h1.9c-.5 1.7-2 2.7-3.8 2.7-2.4 0-4-1.6-4-3.9s1.6-4 3.7-4Zm-1.8 3h3.5c-.2-1-.9-1.5-1.8-1.5-.9 0-1.6.5-1.7 1.5Z" />
    </svg>
  );
}

type Channel = {
  label: string;
  value: string;
  note: string;
  icon: ComponentType<{ className?: string }>;
  href: string | null;
  copyValue?: string;
};

const CHANNELS: Channel[] = [
  {
    label: "Gmail",
    value: GMAIL,
    note: "Opens a new email",
    icon: (props) => <Mail {...props} />,
    href: `mailto:${GMAIL}`,
  },
  {
    label: "Discord",
    value: DISCORD,
    note: "Click to copy username",
    icon: (props) => <MessageCircle {...props} />,
    href: null,
    copyValue: DISCORD,
  },
  {
    label: "Behance",
    value: "View portfolio",
    note: "Opens in a new tab",
    icon: (props) => <BehanceMark {...props} />,
    href: BEHANCE_URL,
  },
];

function useReveal<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, inView };
}

function ChannelCard({ channel, delay }: { channel: Channel; delay: number }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    []
  );

  const handleCopy = async () => {
    const text = channel.copyValue ?? "";
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const area = document.createElement("textarea");
      area.value = text;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      try {
        document.execCommand("copy");
      } catch {
        /* clipboard unavailable */
      }
      document.body.removeChild(area);
    }
    setCopied(true);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1800);
  };

  const isCopy = !!channel.copyValue;
  const isLink = !!channel.href;

  const inner = (
    <>
      {/* glossy sweep */}
      <span className="pointer-events-none absolute inset-0 -translate-x-[130%] skew-x-[-14deg] bg-gradient-to-r from-transparent via-white/60 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[130%]" />
      {/* top hairline */}
      <span className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />
      {/* hover illumination */}
      <span className="pointer-events-none absolute -inset-px rounded-2xl bg-[radial-gradient(120%_110%_at_50%_-20%,rgba(255,255,255,0.95),transparent_62%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

      <div className="relative flex items-start justify-between gap-3">
        <span className="relative grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-gradient-to-b from-neutral-700 via-neutral-800 to-neutral-950 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_14px_26px_-18px_rgba(0,0,0,0.95)] transition-all duration-500 group-hover:-translate-y-1 group-hover:rotate-[-4deg] group-hover:shadow-[0_20px_34px_-18px_rgba(0,0,0,0.9)]">
          <span className="pointer-events-none absolute inset-0 rounded-xl bg-[radial-gradient(120%_120%_at_30%_0%,rgba(255,255,255,0.28),transparent_60%)]" />
          <channel.icon className="relative h-5 w-5" />
        </span>
        <span
          className={cn(
            "grid h-7 w-7 place-items-center rounded-full border backdrop-blur transition-all duration-300",
            copied
              ? "border-neutral-900 bg-neutral-900 text-white"
              : "border-neutral-200/90 bg-white/70 text-neutral-400 group-hover:border-neutral-900/20 group-hover:text-neutral-800 group-hover:shadow-[0_6px_14px_-10px_rgba(0,0,0,0.6)]"
          )}
        >
          {isCopy ? (
            copied ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )
          ) : (
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          )}
        </span>
      </div>

      <div className="relative mt-7">
        <p className="text-[9px] uppercase tracking-[0.26em] text-neutral-400">
          {channel.label}
        </p>
        <p className="mt-2 break-all text-sm font-medium leading-snug text-neutral-900">
          {channel.value}
        </p>
        <span className="mt-3 flex items-center gap-1.5">
          <span
            className={cn(
              "h-1 w-1 rounded-full transition-colors duration-300",
              copied ? "bg-neutral-900" : "bg-neutral-300 group-hover:bg-neutral-900"
            )}
          />
          <span
            className={cn(
              "text-[9px] uppercase tracking-[0.18em] transition-colors",
              copied ? "text-neutral-900" : "text-neutral-400"
            )}
          >
            {copied ? "Copied to clipboard" : channel.note}
          </span>
        </span>
      </div>
    </>
  );

  const shared = cn(
    "group relative block h-full overflow-hidden rounded-2xl border border-neutral-200/80 bg-white/65 p-5 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_24px_50px_-38px_rgba(0,0,0,0.6)] ring-1 ring-white/70 backdrop-blur-md",
    "transition-all duration-500 ease-out hover:-translate-y-1.5 hover:border-neutral-900/25 hover:bg-white/90 hover:shadow-[0_34px_64px_-32px_rgba(0,0,0,0.5)] hover:ring-neutral-900/10",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
  );

  if (isCopy) {
    return (
      <button
        type="button"
        onClick={handleCopy}
        aria-label={`Copy Discord username ${DISCORD}`}
        style={{ transitionDelay: `${delay}ms` }}
        className={shared}
      >
        {inner}
      </button>
    );
  }

  if (isLink) {
    const isMail = channel.href!.startsWith("mailto:");
    return (
      <a
        href={channel.href!}
        {...(!isMail ? { target: "_blank", rel: "noreferrer noopener" } : {})}
        style={{ transitionDelay: `${delay}ms` }}
        className={shared}
      >
        {inner}
      </a>
    );
  }

  return (
    <div
      aria-disabled="true"
      style={{ transitionDelay: `${delay}ms` }}
      className={cn(shared, "cursor-default")}
    >
      {inner}
    </div>
  );
}

export function Contact({ onStartProject }: { onStartProject: () => void }) {
  const { ref, inView } = useReveal<HTMLDivElement>();

  return (
    <section
      id="contact"
      className="relative scroll-mt-24 overflow-hidden border-t border-neutral-200 bg-neutral-50 py-24"
    >
      {/* atmosphere */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_130%_at_10%_-10%,#ffffff_0%,#f6f6f7_46%,#e9e9ec_100%)]" />
      <div
        className="pointer-events-none absolute -left-32 top-0 h-96 w-96 rounded-full bg-white/80 blur-[110px]"
        style={{ animation: "contact-orb 18s ease-in-out infinite" }}
      />
      <div
        className="pointer-events-none absolute -right-24 bottom-[-6rem] h-96 w-96 rounded-full bg-neutral-400/25 blur-[120px]"
        style={{ animation: "contact-orb 24s ease-in-out infinite reverse" }}
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-neutral-300 to-transparent" />

      <div ref={ref} className="relative mx-auto max-w-6xl px-6">
        <div className="relative overflow-hidden rounded-[30px] border border-neutral-200/90 bg-white/55 shadow-[0_60px_130px_-80px_rgba(0,0,0,0.55)] backdrop-blur-xl">
          <span className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />
          <span className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-white/70 blur-3xl" />
          <span className="pointer-events-none absolute -left-16 bottom-[-6rem] h-56 w-56 rounded-full bg-neutral-300/30 blur-3xl" />

          <div className="relative grid grid-cols-1 gap-12 p-6 sm:p-10 lg:grid-cols-12 lg:gap-10 lg:p-12">
            <div className="lg:col-span-5">
              <span
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white/70 px-3 py-1.5 text-[9px] uppercase tracking-[0.26em] text-neutral-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur transition-all duration-700",
                  inView ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
                )}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full bg-neutral-900"
                  style={{ animation: "pulse 2.4s ease-in-out infinite" }}
                />
                Contact
              </span>

              <h2
                className={cn(
                  "mt-5 font-serif text-[2.2rem] leading-[1.03] tracking-tight text-neutral-950 transition-all delay-75 duration-700 sm:text-5xl lg:text-[3.4rem]",
                  inView ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
                )}
              >
                Let&apos;s build something
                <br />
                <span className="bg-gradient-to-r from-neutral-900 via-neutral-500 to-neutral-300 bg-clip-text text-transparent">
                  worth watching.
                </span>
              </h2>

              <span
                className={cn(
                  "mt-6 block h-px w-20 bg-gradient-to-r from-neutral-900/50 via-neutral-400/60 to-transparent transition-all delay-100 duration-700",
                  inView ? "opacity-100" : "opacity-0"
                )}
              />

              <p
                className={cn(
                  "mt-6 max-w-md text-sm leading-7 text-neutral-600 transition-all delay-150 duration-700 md:text-base",
                  inView ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
                )}
              >
                Open to professional collaborations across video editing, motion
                graphics, color grading and graphic design. Share your brief and
                I&apos;ll get back to you.
              </p>

              <button
                onClick={onStartProject}
                style={{ transitionDelay: "225ms" }}
                className={cn(
                  "group relative mt-9 inline-flex items-center gap-2 overflow-hidden rounded-full border border-neutral-900 bg-neutral-900 px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_38px_-26px_rgba(0,0,0,0.9)] transition-all duration-500 hover:-translate-y-0.5 hover:bg-neutral-800 hover:shadow-[0_26px_50px_-26px_rgba(0,0,0,0.8)] active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2",
                  inView ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
                )}
              >
                <span className="pointer-events-none absolute inset-0 -translate-x-full skew-x-[-14deg] bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                <span className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />
                <span className="relative">Start a Project</span>
                <ArrowUpRight className="relative h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </button>

              <p
                className={cn(
                  "mt-7 flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-neutral-400 transition-all duration-700",
                  inView ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
                )}
                style={{ transitionDelay: "300ms" }}
              >
                <span className="h-px w-6 bg-neutral-300" />
                Based online · Working worldwide
              </p>
            </div>

            <div className="lg:col-span-7">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {CHANNELS.map((c, i) => (
                  <div
                    key={c.label}
                    className={cn(
                      "transition-all duration-700",
                      inView ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
                    )}
                    style={{ transitionDelay: `${150 + i * 90}ms` }}
                  >
                    <ChannelCard channel={c} delay={0} />
                  </div>
                ))}
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-neutral-200/80 pt-4 text-[9px] uppercase tracking-[0.18em] text-neutral-400">
                <span className="flex items-center gap-1.5">
                  <span className="h-1 w-1 rounded-full bg-emerald-500" />
                  Replies by email
                </span>
                <span>Project files and references welcome</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
