import { isPageHref, type PageTextRun } from '@live-show/api-contracts';

// Order matters: *** before ** before *.
const TOKEN = /\[([^\]]+)\]\(([^)\s]+)\)|\*\*\*([^*]+)\*\*\*|\*\*([^*]+)\*\*|\*([^*]+)\*/g;

function parseParagraph(source: string): PageTextRun[] {
  const runs: PageTextRun[] = [];
  const pushPlain = (text: string) => {
    if (!text) return;
    const last = runs[runs.length - 1];
    if (last && !last.bold && !last.italic && !last.href) last.text += text;
    else runs.push({ text });
  };
  let cursor = 0;
  for (const match of source.matchAll(TOKEN)) {
    pushPlain(source.slice(cursor, match.index));
    cursor = match.index + match[0].length;
    const [raw, linkText, href, boldItalic, bold, italic] = match;
    if (linkText !== undefined) {
      // An unsafe link stays visible as literal text instead of being silently dropped.
      if (isPageHref(href)) runs.push({ text: linkText, href });
      else pushPlain(raw);
    } else if (boldItalic !== undefined) runs.push({ text: boldItalic, bold: true, italic: true });
    else if (bold !== undefined) runs.push({ text: bold, bold: true });
    else runs.push({ text: italic, italic: true });
  }
  pushPlain(source.slice(cursor));
  return runs;
}

export function parseTextRuns(body: string): PageTextRun[][] {
  const paragraphs = body
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map(parseParagraph);
  return paragraphs.length > 0 ? paragraphs : [[{ text: '' }]];
}

function serializeRun(run: PageTextRun): string {
  if (run.href) return `[${run.text}](${run.href})`;
  if (run.bold && run.italic) return `***${run.text}***`;
  if (run.bold) return `**${run.text}**`;
  if (run.italic) return `*${run.text}*`;
  return run.text;
}

export function serializeTextRuns(paragraphs: readonly (readonly PageTextRun[])[]): string {
  return paragraphs.map((runs) => runs.map(serializeRun).join('')).join('\n\n');
}
