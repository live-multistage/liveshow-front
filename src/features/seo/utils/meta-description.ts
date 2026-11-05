// Meta descriptions get truncated around 160 chars anyway; cut on a word so the
// ellipsis doesn't land mid-word.
export function toMetaDescription(text: string, max = 160): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  return `${cut.slice(0, cut.lastIndexOf(' ')) || cut}…`;
}
