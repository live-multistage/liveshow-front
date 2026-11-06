import { describe, expect, it } from 'vitest';
import { itemsToLines, linesToItems } from './lines-to-items';

const KEYS = ['title', 'text'] as const;

describe('linesToItems / itemsToLines', () => {
  it('splits only on the first " — " and ignores blank lines', () => {
    const items = linesToItems('A — um — dois\n\n  \nB — b', KEYS);
    expect(items).toEqual([{ title: 'A', text: 'um — dois' }, { title: 'B', text: 'b' }]);
  });

  it('keeps a line without separator as first field with empty second field', () => {
    expect(linesToItems('Só título', KEYS)).toEqual([{ title: 'Só título', text: '' }]);
  });

  it('round-trips', () => {
    const text = 'A — um\nB — dois — três\nC';
    expect(itemsToLines(linesToItems(text, KEYS), KEYS)).toBe(text);
  });

  it('preserves extra fields of the previous item at the same index', () => {
    const previous = [{ title: 'x', text: 'y', icon: 'star' }];
    expect(linesToItems('A — b\nC — d', KEYS, previous)).toEqual([
      { title: 'A', text: 'b', icon: 'star' },
      { title: 'C', text: 'd' },
    ]);
  });
});
