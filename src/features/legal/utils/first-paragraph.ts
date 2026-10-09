// Meta description source: first plain paragraph of the markdown, stripped of
// inline syntax and cut on a word boundary.
export function firstParagraph(markdown: string, max = 160): string {
  const block = markdown
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .find((b) => b && !/^(#{1,6}\s|[-*+]\s|\d+\.\s|>|```)/.test(b));
  if (!block) return '';
  const text = block
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}
