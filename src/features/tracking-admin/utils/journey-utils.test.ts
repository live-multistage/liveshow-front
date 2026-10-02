import { describe, it, expect } from 'vitest';
import { formatGap, stepLabels } from './journey-utils';

describe('formatGap', () => {
  it.each([
    [0, '0s'],
    [42_000, '42s'],
    [90_000, '1m 30s'],
    [125_000, '2m 05s'],
  ])('formats %i ms as %s', (ms, expected) => {
    expect(formatGap(ms)).toBe(expected);
  });
});

describe('stepLabels', () => {
  it('numbers only items with a node', () => {
    expect(stepLabels([{ node: 'a' }, { node: null }, { node: 'b' }])).toEqual([1, null, 2]);
  });
});
