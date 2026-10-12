import type { ReactNode } from "react";

/** Renders **bold** spans inside a line as React elements (never as HTML). */
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") && part.length > 4 ? (
      <strong key={i} className="font-semibold text-coffee-900">
        {part.slice(2, -2)}
      </strong>
    ) : (
      part
    ),
  );
}

/**
 * Minimal formatting for CMS text: "## " / "### " headings, "- " bullet lists, "1. " numbered lists,
 * **bold**, and blank-line paragraphs. Plain text without any of these still renders as paragraphs.
 */
export default function RichText({ text, className = "" }: { text: string; className?: string }) {
  const blocks: ReactNode[] = [];
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) {
      i++;
      continue;
    }
    if (line.startsWith("### ") || line.startsWith("## ")) {
      const level3 = line.startsWith("### ");
      const content = inline(line.slice(level3 ? 4 : 3));
      blocks.push(
        level3 ? (
          <h3 key={i} className="mt-5 font-semibold text-coffee-900">{content}</h3>
        ) : (
          <h2 key={i} className="mt-7 text-lg font-bold text-coffee-900">{content}</h2>
        ),
      );
      i++;
      continue;
    }
    const bullet = /^[-*] /;
    const numbered = /^\d+\. /;
    if (bullet.test(line) || numbered.test(line)) {
      const ordered = numbered.test(line);
      const pattern = ordered ? numbered : bullet;
      const items: ReactNode[] = [];
      while (i < lines.length && pattern.test(lines[i].trim())) {
        items.push(<li key={i}>{inline(lines[i].trim().replace(pattern, ""))}</li>);
        i++;
      }
      blocks.push(
        ordered ? (
          <ol key={`l${i}`} className="mt-3 list-decimal space-y-1.5 pl-5">{items}</ol>
        ) : (
          <ul key={`l${i}`} className="mt-3 list-disc space-y-1.5 pl-5">{items}</ul>
        ),
      );
      continue;
    }
    const paragraph: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(#{2,3} |[-*] |\d+\. )/.test(lines[i].trim())) {
      paragraph.push(lines[i].trim());
      i++;
    }
    blocks.push(<p key={`p${i}`} className="mt-3">{inline(paragraph.join(" "))}</p>);
  }
  return <div className={`break-words ${className}`}>{blocks}</div>;
}
