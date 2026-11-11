const SEPARATOR = ' — ';

/** "A — B" per line → items. Blank lines are skipped; only the first separator splits. Extra fields of a previous item survive only when its first field matches the new line's (so reordering, inserting or deleting lines never hands extras to the wrong item). */
export function linesToItems<K extends string, T extends Record<K, string>>(
  text: string,
  keys: readonly [K, K],
  previous: readonly T[] = [],
): T[] {
  const unused = [...previous];
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const cut = line.indexOf(SEPARATOR);
      const [first, second] = cut < 0 ? [line, ''] : [line.slice(0, cut), line.slice(cut + SEPARATOR.length)];
      const head = first.trim();
      const match = unused.findIndex((item) => item[keys[0]] === head);
      const extras = match < 0 ? undefined : unused.splice(match, 1)[0];
      return { ...extras, [keys[0]]: head, [keys[1]]: second.trim() } as T;
    });
}

export function itemsToLines<K extends string>(items: readonly Record<K, string>[], keys: readonly [K, K]): string {
  return items
    .map((item) => (item[keys[1]] ? `${item[keys[0]]}${SEPARATOR}${item[keys[1]]}` : item[keys[0]]))
    .join('\n');
}

/** False when an item cannot survive the "A — B" line format (separator inside the first field, line break, or a second field without a first). */
export function itemsFitLines<K extends string>(items: readonly Record<K, string>[], keys: readonly [K, K]): boolean {
  return items.every((item) => {
    const [first, second] = [item[keys[0]], item[keys[1]]];
    return !first.includes(SEPARATOR) && !/[\r\n]/.test(first + second) && !(first === '' && second !== '');
  });
}
