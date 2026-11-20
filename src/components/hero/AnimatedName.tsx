import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const LINE1 = "Gursimar";
const LINE2 = "Singh";
const TOTAL = LINE1.length + LINE2.length;

type Pos = { x: number; y: number };

/**
 * Hero wordmark.
 *
 * The reveal keeps the original typing concept: a cursor travels the name and
 * each letter resolves in sequence. The un-resolved state is a solid black
 * outline rather than a pale grey fill, so the branding stays crisp and
 * readable at every frame of the animation instead of fading away.
 */
export function AnimatedName() {
  const [progress, setProgress] = useState(0);
  const [dotPos, setDotPos] = useState<Pos & { visible: boolean }>({
    x: 0,
    y: 0,
    visible: false,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const letterRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const positionsRef = useRef<Pos[]>([]);
  const timersRef = useRef<number[]>([]);

  const schedule = (fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timersRef.current.push(id);
    return id;
  };

  const measure = () => {
    const container = containerRef.current;
    if (!container) return;
    const cr = container.getBoundingClientRect();
    const next: Pos[] = [];
    for (let i = 0; i < TOTAL; i += 1) {
      const el = letterRefs.current[i];
      if (!el) {
        next.push({ x: 0, y: 0 });
        continue;
      }
      const er = el.getBoundingClientRect();
      next.push({
        x: er.left - cr.left + er.width / 2,
        y: er.top - cr.top + er.height / 2,
      });
    }
    positionsRef.current = next;
  };

  useEffect(() => {
    let cancelled = false;

    measure();

    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    if (fonts && typeof fonts.ready?.then === "function") {
      fonts.ready.then(() => {
        if (cancelled) return;
        measure();
      });
    }

    const onResize = () => measure();
    window.addEventListener("resize", onResize);

    return () => {
      cancelled = true;
      window.removeEventListener("resize", onResize);
      timersRef.current.forEach((id) => window.clearTimeout(id));
      timersRef.current = [];
    };
  }, []);

  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      setProgress(TOTAL);
      return;
    }

    let cancelled = false;
    let idx = 0;

    const step = () => {
      if (cancelled) return;

      const pos = positionsRef.current[idx];
      if (pos) {
        setDotPos({ x: pos.x, y: pos.y, visible: true });
      }

      schedule(() => {
        if (cancelled) return;
        idx += 1;
        setProgress(idx);
        if (idx < TOTAL) {
          schedule(step, 90);
        } else {
          schedule(() => {
            if (cancelled) return;
            setDotPos((p) => ({ ...p, visible: false }));
          }, 320);
        }
      }, 120);
    };

    schedule(step, 350);

    return () => {
      cancelled = true;
      timersRef.current.forEach((id) => window.clearTimeout(id));
      timersRef.current = [];
    };
  }, []);

  const renderLine = (line: string, offset: number) =>
    line.split("").map((ch, i) => {
      const globalIdx = offset + i;
      const filled = globalIdx < progress;
      return (
        <span
          key={`${line}-${i}`}
          ref={(el) => {
            letterRefs.current[globalIdx] = el;
          }}
          className={cn(
            "inline-block transition-[color,transform] duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
            filled ? "translate-y-0 text-neutral-950" : "translate-y-[0.035em] text-transparent"
          )}
          style={{
            WebkitTextStroke: filled ? "0px transparent" : "1.1px #0a0a0a",
            paintOrder: "stroke fill",
          }}
        >
          {ch}
        </span>
      );
    });

  return (
    <div ref={containerRef} className="relative inline-block">
      <h1 className="whitespace-nowrap font-serif text-[2.6rem] font-black leading-[0.88] tracking-[-0.035em] min-[360px]:text-5xl sm:text-7xl md:text-8xl lg:text-9xl">
        <span className="block">{renderLine(LINE1, 0)}</span>
        <span className="block">{renderLine(LINE2, LINE1.length)}</span>
      </h1>
      {dotPos.visible && (
        <span
          className="pointer-events-none absolute h-2.5 w-2.5 rounded-full bg-neutral-950 ring-2 ring-white transition-all duration-150 ease-out"
          style={{
            left: dotPos.x,
            top: dotPos.y,
            transform: "translate(-50%, -50%)",
          }}
        />
      )}
    </div>
  );
}
