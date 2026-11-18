import { useEffect, useRef, useState } from "react";

export function AssistantStage() {
  const ref = useRef<HTMLDivElement>(null);
  const [pupil, setPupil] = useState({ x: 0, y: 0 });
  const [blink, setBlink] = useState(false);
  const [typing, setTyping] = useState(0);
  const [mouth, setMouth] = useState(0);
  const [head, setHead] = useState({ x: 0, y: 0 });
  const [breath, setBreath] = useState(0);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height * 0.3;
      const dx = Math.max(-1, Math.min(1, (e.clientX - cx) / 320));
      const dy = Math.max(-1, Math.min(1, (e.clientY - cy) / 320));
      setPupil({ x: dx * 4, y: dy * 4 });
      setHead({ x: dx * 3, y: dy * 2 });
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  useEffect(() => {
    let t: number;
    const loop = () => {
      setBlink(true);
      window.setTimeout(() => setBlink(false), 130);
      t = window.setTimeout(loop, 2400 + Math.random() * 2400);
    };
    t = window.setTimeout(loop, 1600);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setTyping((v) => (v + 1) % 4), 180);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setMouth((v) => (v + 1) % 3), 280);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setBreath((v) => (v + 1) % 2), 2200);
    return () => window.clearInterval(id);
  }, []);

  const fingerLift = (i: number) => (typing === i ? -3 : 0);
  const shoulderY = breath === 0 ? 0 : -1.5;

  return (
    <div
      ref={ref}
      className="relative mx-auto aspect-[16/10] w-full max-w-4xl overflow-hidden rounded-3xl border border-neutral-200 bg-gradient-to-b from-neutral-50 to-neutral-100 shadow-xl"
    >
      <div className="pointer-events-none absolute inset-0 opacity-[0.35] [background-image:radial-gradient(#d4d4d4_1px,transparent_1px)] [background-size:26px_26px]" />
      <div className="pointer-events-none absolute -bottom-24 left-1/2 h-64 w-[36rem] -translate-x-1/2 rounded-full bg-neutral-300/40 blur-3xl" />

      <svg viewBox="0 0 800 500" className="relative h-full w-full">
        <defs>
          <linearGradient id="desk" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f5f5f5" />
            <stop offset="100%" stopColor="#d4d4d4" />
          </linearGradient>
          <linearGradient id="shirt" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </linearGradient>
          <linearGradient id="skin" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f5c9a4" />
            <stop offset="100%" stopColor="#e0a878" />
          </linearGradient>
          <linearGradient id="hair" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3f2a1d" />
            <stop offset="100%" stopColor="#1f140c" />
          </linearGradient>
          <linearGradient id="screen" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>
          <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#60a5fa" stopOpacity="0" />
          </radialGradient>
        </defs>

        <ellipse cx="400" cy="470" rx="360" ry="26" fill="#000" opacity="0.06" />

        <rect x="120" y="330" width="560" height="20" rx="6" fill="url(#desk)" stroke="#a3a3a3" />
        <rect x="140" y="350" width="14" height="120" fill="#a3a3a3" />
        <rect x="646" y="350" width="14" height="120" fill="#a3a3a3" />

        <g>
          <rect x="470" y="180" width="230" height="150" rx="10" fill="url(#screen)" stroke="#0f172a" />
          <rect x="470" y="180" width="230" height="150" rx="10" fill="url(#glow)" />
          <rect x="486" y="198" width="120" height="8" rx="3" fill="#60a5fa" opacity="0.85" />
          <rect x="486" y="214" width="180" height="6" rx="3" fill="#94a3b8" opacity="0.7" />
          <rect x="486" y="228" width="150" height="6" rx="3" fill="#94a3b8" opacity="0.5" />
          <rect x="486" y="252" width="70" height="60" rx="6" fill="#22d3ee" opacity="0.55" />
          <rect x="566" y="252" width="70" height="60" rx="6" fill="#a78bfa" opacity="0.55" />
          <rect x="646" y="252" width="40" height="60" rx="6" fill="#f472b6" opacity="0.55" />
          <rect x="560" y="330" width="50" height="10" rx="3" fill="#334155" />
          <rect x="530" y="340" width="110" height="8" rx="3" fill="#1e293b" />
        </g>

        <g transform={`translate(0 ${shoulderY})`}>
          <ellipse cx="400" cy="440" rx="200" ry="14" fill="#000" opacity="0.08" />
          <path d="M300 330 Q400 300 500 330 L520 470 L280 470 Z" fill="url(#shirt)" />
          <path d="M330 330 Q400 350 470 330 L470 360 Q400 380 330 360 Z" fill="#1e40af" opacity="0.6" />
          <path d="M360 300 Q400 320 440 300 L440 330 Q400 350 360 330 Z" fill="url(#skin)" />
        </g>

        <g transform={`translate(${head.x} ${head.y})`}>
          <ellipse cx="400" cy="220" rx="78" ry="92" fill="url(#skin)" />
          <path d="M322 200 Q320 130 400 120 Q480 130 478 200 Q470 160 400 156 Q330 160 322 200 Z" fill="url(#hair)" />
          <path d="M322 200 Q318 230 326 250 Q322 210 330 190 Z" fill="url(#hair)" />
          <path d="M478 200 Q482 230 474 250 Q478 210 470 190 Z" fill="url(#hair)" />

          <g>
            <ellipse cx="372" cy="212" rx="13" ry={blink ? 1.5 : 9} fill="#fff" />
            <ellipse cx="428" cy="212" rx="13" ry={blink ? 1.5 : 9} fill="#fff" />
            {!blink && (
              <>
                <circle cx={372 + pupil.x} cy={212 + pupil.y} r="4.5" fill="#1f2937" />
                <circle cx={428 + pupil.x} cy={212 + pupil.y} r="4.5" fill="#1f2937" />
                <circle cx={373.5 + pupil.x} cy={210.5 + pupil.y} r="1.4" fill="#fff" />
                <circle cx={429.5 + pupil.x} cy={210.5 + pupil.y} r="1.4" fill="#fff" />
              </>
            )}
            <path d="M358 196 Q372 190 386 196" stroke="#3f2a1d" strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d="M414 196 Q428 190 442 196" stroke="#3f2a1d" strokeWidth="3" fill="none" strokeLinecap="round" />
          </g>

          <path d="M400 218 Q396 232 400 240" stroke="#c98a5e" strokeWidth="2" fill="none" strokeLinecap="round" />

          <g>
            <ellipse
              cx="400"
              cy="262"
              rx={mouth === 0 ? 10 : mouth === 1 ? 14 : 8}
              ry={mouth === 0 ? 3 : mouth === 1 ? 7 : 4}
              fill="#7f1d1d"
            />
            <ellipse cx="400" cy={mouth === 1 ? 265 : 263} rx={mouth === 1 ? 10 : 6} ry="2" fill="#fca5a5" opacity="0.7" />
          </g>

          <ellipse cx="352" cy="248" rx="10" ry="6" fill="#f0a3a3" opacity="0.5" />
          <ellipse cx="448" cy="248" rx="10" ry="6" fill="#f0a3a3" opacity="0.5" />
        </g>

        <g>
          <rect x="300" y="352" width="200" height="34" rx="6" fill="#e5e5e5" stroke="#a3a3a3" />
          {Array.from({ length: 14 }).map((_, i) => (
            <rect key={i} x={308 + i * 13} y="358" width="9" height="9" rx="2" fill="#a3a3a3" />
          ))}
          {Array.from({ length: 14 }).map((_, i) => (
            <rect key={i} x={308 + i * 13} y="371" width="9" height="9" rx="2" fill="#a3a3a3" />
          ))}
        </g>

        <g>
          <path d="M300 330 Q280 350 288 372 Q300 380 316 372 Q322 350 320 332 Z" fill="url(#skin)" />
          <path d="M500 330 Q520 350 512 372 Q500 380 484 372 Q478 350 480 332 Z" fill="url(#skin)" />
          {[0, 1, 2, 3].map((i) => (
            <rect
              key={`l${i}`}
              x={292 + i * 7}
              y={372 + fingerLift(i)}
              width="6"
              height="14"
              rx="3"
              fill="url(#skin)"
              stroke="#c98a5e"
              strokeWidth="0.6"
            />
          ))}
          {[0, 1, 2, 3].map((i) => (
            <rect
              key={`r${i}`}
              x={486 + i * 7}
              y={372 + fingerLift((i + 2) % 4)}
              width="6"
              height="14"
              rx="3"
              fill="url(#skin)"
              stroke="#c98a5e"
              strokeWidth="0.6"
            />
          ))}
        </g>

        <g>
          <ellipse cx="560" cy="378" rx="14" ry="9" fill="#e5e5e5" stroke="#a3a3a3" />
          <ellipse cx="560" cy="378" rx="4" ry="3" fill="#a3a3a3" />
        </g>
      </svg>
    </div>
  );
}