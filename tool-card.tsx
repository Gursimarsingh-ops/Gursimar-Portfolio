import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Software } from "@/data/software";

export function ToolCard({ software }: { software: Software }) {
  const [active, setActive] = useState(false);

  return (
    <article
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
      onClick={() => setActive((v) => !v)}
      className={cn(
        "group relative cursor-pointer overflow-hidden rounded-2xl border bg-white p-6 transition-all duration-300",
        active
          ? "-translate-y-1 border-neutral-900 shadow-lg"
          : "border-neutral-200 shadow-sm hover:border-neutral-400"
      )}
    >
      <div className="flex items-start justify-between">
        <div
          className="grid h-14 w-14 place-items-center rounded-xl text-lg font-bold shadow-inner transition-transform duration-300"
          style={{
            background: software.color,
            color: software.accent,
            transform: active ? "rotate(-6deg) scale(1.05)" : "none",
          }}
        >
          {software.short}
        </div>
        <span
          className="text-[10px] uppercase tracking-[0.18em] transition-colors"
          style={{ color: active ? software.accent : "#a3a3a3" }}
        >
          {software.tag}
        </span>
      </div>

      <h3 className="mt-6 text-base font-semibold tracking-tight text-neutral-950">
        {software.name}
      </h3>

      <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-neutral-100">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: active ? "100%" : "35%",
            background: software.accent,
          }}
        />
      </div>

      <div className="mt-4 flex items-center gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 rounded-full transition-all"
            style={{
              background: active ? software.accent : "#d4d4d4",
              animation: active ? `pulse 1.4s ease-in-out ${i * 0.12}s infinite` : "none",
            }}
          />
        ))}
      </div>
    </article>
  );
}