const SEPARATOR = ' — ';

/** "A — B" per line → items. Blank lines are skipped; only the first separator splits. Extra fields of the previous item at the same index survive. */
export function linesToItems<K extends string, T extends Record<K, string>>(
  text: string,
  keys: readonly [K, K],
  previous: readonly T[] = [],
): T[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const cut = line.indexOf(SEPARATOR);
      const [first, second] = cut < 0 ? [line, ''] : [line.slice(0, cut), line.slice(cut + SEPARATOR.length)];
      return { ...previous[index], [keys[0]]: first.trim(), [keys[1]]: second.trim() } as T;
    });
}

export function itemsToLines<K extends string>(items: readonly Record<K, string>[], keys: readonly [K, K]): string {
  return items
    .map((item) => (item[keys[1]] ? `${item[keys[0]]}${SEPARATOR}${item[keys[1]]}` : item[keys[0]]))
    .join('\n');
}
