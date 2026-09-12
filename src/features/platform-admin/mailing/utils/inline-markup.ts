import type { MailingTextRun } from '@live-show/api-contracts';

// Text-block editing format (R20). Blank line = paragraph; **bold**, _italic_,
// [label](https://…). ponytail: no nesting; underscores inside words (snake_case)
// italicize. Add a real rich-text editor if admins ever need more.
const TOKEN = /\[([^\]]+)\]\((https:\/\/[^\s)]+)\)|\*\*([^*]+)\*\*|_([^_]+)_/g;

export function parseInlineMarkup(source: string): MailingTextRun[][] {
  return source
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s*\n\s*/g, ' ').trim())
    .filter(Boolean)
    .map((p) => {
      const runs: MailingTextRun[] = [];
      let last = 0;
      for (const m of p.matchAll(TOKEN)) {
        const start = m.index ?? 0;
        if (start > last) runs.push({ text: p.slice(last, start) });
        if (m[1] !== undefined) runs.push({ text: m[1], href: m[2] });
        else if (m[3] !== undefined) runs.push({ text: m[3], bold: true });
        else runs.push({ text: m[4], italic: true });
        last = start + m[0].length;
      }
      if (last < p.length) runs.push({ text: p.slice(last) });
      return runs;
    });
}

export function serializeInlineMarkup(paragraphs: MailingTextRun[][]): string {
  return paragraphs
    .map((runs) => runs.map((r) => (r.href ? `[${r.text}](${r.href})` : r.bold ? `**${r.text}**` : r.italic ? `_${r.text}_` : r.text)).join(''))
    .join('\n\n');
}
