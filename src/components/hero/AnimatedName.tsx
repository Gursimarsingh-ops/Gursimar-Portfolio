import { useEffect, useRef, useState } from "react";

const LINE1 = "GurSimar";
const LINE2 = "Singh";
const TOTAL = LINE1.length + LINE2.length;

type Pos = { x: number; y: number };

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
          }, 300);
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
          className="relative inline-block"
        >
          <span className="text-neutral-200">{ch}</span>
          <span
            className="absolute inset-0 text-neutral-950 transition-opacity duration-300"
            style={{ opacity: filled ? 1 : 0 }}
          >
            {ch}
          </span>
        </span>
      );
    });

  return (
    <div ref={containerRef} className="relative inline-block">
      <h1 className="whitespace-nowrap font-serif text-[2.5rem] font-black leading-[0.9] tracking-[-0.02em] min-[360px]:text-5xl sm:text-7xl md:text-8xl lg:text-9xl">
        <span className="block">{renderLine(LINE1, 0)}</span>
        <span className="block">{renderLine(LINE2, LINE1.length)}</span>
      </h1>
      {dotPos.visible && (
        <span
          className="pointer-events-none absolute h-3 w-3 rounded-full bg-neutral-950 shadow-lg transition-all duration-150 ease-out"
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