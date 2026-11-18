import { useState, type ReactNode } from "react";
import { Check, Copy } from "lucide-react";

/**
 * Small dependency-free markdown renderer for assistant replies.
 * Supports headings, lists, bold/italic, inline code, fenced code and links.
 */

function renderInline(text: string, prefix: string): ReactNode[] {
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\)|\*[^*\n]+\*)/g;
  const parts = text.split(pattern).filter((part) => part !== "");
  return parts.map((part, index) => {
    const key = `${prefix}-${index}`;
    if (part.startsWith("`") && part.endsWith("`") && part.length > 1) {
      return (
        <code key={key} className="rounded bg-black/35 px-1 py-0.5 font-mono text-[0.92em] text-sky-100">
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={key} className="font-semibold text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) {
      return (
        <a
          key={key}
          href={link[2]}
          target="_blank"
          rel="noreferrer noopener"
          className="text-sky-200 underline decoration-sky-300/40 underline-offset-2 transition-colors hover:text-white"
        >
          {link[1]}
        </a>
      );
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return (
        <em key={key} className="italic text-white/90">
          {part.slice(1, -1)}
        </em>
      );
    }
    return <span key={key}>{part}</span>;
  });
}

function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="my-2 overflow-hidden rounded-lg border border-white/15 bg-black/55">
      <div className="flex items-center justify-between gap-2 border-b border-white/10 px-2.5 py-1.5">
        <span className="text-[8px] uppercase tracking-[0.18em] text-white/40">{language || "code"}</span>
        <button
          type="button"
          onClick={() => void copy()}
          className="inline-flex items-center gap-1 text-[8px] uppercase tracking-[0.14em] text-white/45 transition-colors hover:text-white"
        >
          {copied ? <Check className="h-2.5 w-2.5" /> : <Copy className="h-2.5 w-2.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="max-h-64 overflow-auto px-3 py-2.5 text-[10.5px] leading-relaxed text-sky-50/90">
        <code className="font-mono">{code}</code>
      </pre>
    </div>
  );
}

export function Markdown({ text }: { text: string }) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (line.trimStart().startsWith("```")) {
      const language = line.trim().slice(3).trim();
      const code: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index].trimStart().startsWith("```")) {
        code.push(lines[index]);
        index += 1;
      }
      index += 1;
      blocks.push(<CodeBlock key={`code-${index}`} code={code.join("\n")} language={language} />);
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      blocks.push(
        <p key={`h-${index}`} className="mt-2 text-[13px] font-semibold text-white first:mt-0">
          {renderInline(heading[2], `h-${index}`)}
        </p>
      );
      index += 1;
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\s*[-*]\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^\s*[-*]\s+/, ""));
        index += 1;
      }
      blocks.push(
        <ul key={`ul-${index}`} className="my-1.5 space-y-1 pl-4">
          {items.map((item, itemIndex) => (
            <li key={`${index}-${itemIndex}`} className="relative text-white/85">
              <span className="absolute -left-3 top-[7px] h-1 w-1 rounded-full bg-white/45" />
              {renderInline(item, `li-${index}-${itemIndex}`)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\s*\d+\.\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^\s*\d+\.\s+/, ""));
        index += 1;
      }
      blocks.push(
        <ol key={`ol-${index}`} className="my-1.5 list-decimal space-y-1 pl-5">
          {items.map((item, itemIndex) => (
            <li key={`${index}-${itemIndex}`} className="text-white/85">
              {renderInline(item, `oli-${index}-${itemIndex}`)}
            </li>
          ))}
        </ol>
      );
      continue;
    }

    if (!line.trim()) {
      index += 1;
      continue;
    }

    const paragraph: string[] = [];
    while (
      index < lines.length &&
      lines[index].trim() &&
      !lines[index].trimStart().startsWith("```") &&
      !/^(#{1,6})\s+/.test(lines[index]) &&
      !/^\s*[-*]\s+/.test(lines[index]) &&
      !/^\s*\d+\.\s+/.test(lines[index])
    ) {
      paragraph.push(lines[index]);
      index += 1;
    }
    blocks.push(
      <p key={`p-${index}`} className="my-1.5 whitespace-pre-wrap break-words text-white/90 first:mt-0 last:mb-0">
        {paragraph.map((row, rowIndex) => (
          <span key={`row-${index}-${rowIndex}`}>
            {renderInline(row, `p-${index}-${rowIndex}`)}
            {rowIndex < paragraph.length - 1 ? "\n" : null}
          </span>
        ))}
      </p>
    );
  }

  return <div className="text-[12.5px] leading-relaxed">{blocks}</div>;
}
