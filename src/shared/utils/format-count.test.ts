import { describe, it, expect } from 'vitest';
import { formatCount } from './format-count';

describe('formatCount', () => {
  it('keeps counts under a thousand as they are', () => {
    expect(formatCount(0)).toBe('0');
    expect(formatCount(999)).toBe('999');
  });

  it('abbreviates thousands and millions with a decimal comma', () => {
    expect(formatCount(5536)).toBe('5,5k');
    expect(formatCount(10_000)).toBe('10k');
    expect(formatCount(12_345)).toBe('12,3k');
    expect(formatCount(1_000_000)).toBe('1M');
    expect(formatCount(1_500_000)).toBe('1,5M');
  });

  it('truncates instead of rounding up to the next unit', () => {
    expect(formatCount(999_999)).toBe('999,9k');
    expect(formatCount(1_099)).toBe('1k');
  });
});
