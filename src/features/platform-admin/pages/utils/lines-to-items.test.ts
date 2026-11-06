import { describe, expect, it } from 'vitest';
import { itemsFitLines, itemsToLines, linesToItems } from './lines-to-items';

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

  const previous = [{ title: 'A', text: 'a', icon: 'star' }, { title: 'B', text: 'b', icon: 'bolt' }];

  it('keeps extras with the item whose first field matches', () => {
    expect(linesToItems('A — novo\nB — b', KEYS, previous)).toEqual([
      { title: 'A', text: 'novo', icon: 'star' }, { title: 'B', text: 'b', icon: 'bolt' },
    ]);
  });

  it('does not hand extras to another item on reorder, insertion or deletion', () => {
    expect(linesToItems('B — b\nA — a', KEYS, previous)).toEqual([
      { title: 'B', text: 'b', icon: 'bolt' }, { title: 'A', text: 'a', icon: 'star' },
    ]);
    expect(linesToItems('A — a\nNovo — n\nB — b', KEYS, previous)).toEqual([
      { title: 'A', text: 'a', icon: 'star' }, { title: 'Novo', text: 'n' }, { title: 'B', text: 'b', icon: 'bolt' },
    ]);
    expect(linesToItems('B — b', KEYS, previous)).toEqual([{ title: 'B', text: 'b', icon: 'bolt' }]);
  });

  it('detects items the line format cannot hold', () => {
    expect(itemsFitLines([{ title: 'A', text: 'b — c' }], KEYS)).toBe(true);
    expect(itemsFitLines([{ title: 'A — B', text: 'c' }], KEYS)).toBe(false);
    expect(itemsFitLines([{ title: 'A', text: 'x\ny' }], KEYS)).toBe(false);
    expect(itemsFitLines([{ title: '', text: 'x' }], KEYS)).toBe(false);
  });
});
