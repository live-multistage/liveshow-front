import { describe, expect, it } from 'vitest';
import { firstParagraph } from './first-paragraph';

describe('firstParagraph', () => {
  it('skips heading-only lines and returns the first plain paragraph', () => {
    expect(firstParagraph('# Title\n\n## Sub\n\nHello world.\n\nSecond.')).toBe('Hello world.');
  });
  it('keeps link text and strips emphasis', () => {
    expect(firstParagraph('See [our policy](/p) and **bold** _it_.')).toBe('See our policy and bold it.');
  });
  it('truncates on a word boundary with an ellipsis', () => {
    const out = firstParagraph('alpha beta gamma delta', 12);
    expect(out).toBe('alpha beta…');
  });
  it('returns empty string when nothing is plain', () => {
    expect(firstParagraph('# Only heading')).toBe('');
  });
});
