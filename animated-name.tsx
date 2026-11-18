import { useEffect, useRef, useState } from "react";

const LINE1 = "GURSIMAR";
const LINE2 = "SINGH";

export function AnimatedName() {
  const [progress, setProgress] = useState(0);
  const [dotPos, setDotPos] = useState({ x: 0, y: 0, visible: false });
  const containerRef = useRef<HTMLDivElement>(null);
  const letterRefs = useRef<(HTMLSpanElement | null)[]>([]);

  const total = LINE1.length + LINE2.length;

  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      setProgress(total);
      return;
    }

    let cancelled = false;
    let idx = 0;

    const step = () => {
      if (cancelled) return;
      const el = letterRefs.current[idx];
      const container = containerRef.current;
      if (el && container) {
        const er = el.getBoundingClientRect();
        const cr = container.getBoundingClientRect();
        setDotPos({
          x: er.left - cr.left + er.width / 2,
          y: er.top - cr.top + er.height / 2,
          visible: true,
        });
      }
      window.setTimeout(() => {
        if (cancelled) return;
        idx += 1;
        setProgress(idx);
        if (idx < total) {
          window.setTimeout(step, 220);
        } else {
          window.setTimeout(() => setDotPos((p) => ({ ...p, visible: false })), 400);
        }
      }, 260);
    };

    const start = window.setTimeout(step, 500);
    return () => {
      cancelled = true;
      window.clearTimeout(start);
    };
  }, [total]);

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
          <span className="text-neutral-300">{ch}</span>
          <span
            className="absolute inset-0 text-neutral-950 transition-opacity duration-500"
            style={{ opacity: filled ? 1 : 0 }}
          >
            {ch}
          </span>
        </span>
      );
    });

  return (
    <div ref={containerRef} className="relative inline-block">
      <h1 className="font-serif text-5xl leading-[0.95] tracking-tight sm:text-6xl md:text-7xl">
        <span className="block">{renderLine(LINE1, 0)}</span>
        <span className="block">{renderLine(LINE2, LINE1.length)}</span>
      </h1>
      {dotPos.visible && (
        <span
          className="pointer-events-none absolute h-2.5 w-2.5 rounded-full bg-neutral-950 shadow-md transition-all duration-300 ease-out"
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