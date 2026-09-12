import { describe, expect, it } from 'vitest';
import { parseInlineMarkup, serializeInlineMarkup } from './inline-markup';

describe('inline markup', () => {
  it('splits paragraphs on blank lines and parses bold/italic/links', () => {
    expect(parseInlineMarkup('Oi **{{nome}}**, veja _isto_\n\n[o show](https://showon.io/e) hoje')).toEqual([
      [{ text: 'Oi ' }, { text: '{{nome}}', bold: true }, { text: ', veja ' }, { text: 'isto', italic: true }],
      [{ text: 'o show', href: 'https://showon.io/e' }, { text: ' hoje' }],
    ]);
  });
  it('keeps non-https links as plain text (never an http href)', () => {
    expect(parseInlineMarkup('[x](http://evil.io)')).toEqual([[{ text: '[x](http://evil.io)' }]]);
  });
  it('joins single newlines inside a paragraph with a space and drops empty paragraphs', () => {
    expect(parseInlineMarkup('a\nb\n\n\n\n')).toEqual([[{ text: 'a b' }]]);
  });
  it('round-trips', () => {
    const src = 'Oi **Ana**, _veja_ [isto](https://showon.io)\n\nTchau';
    expect(serializeInlineMarkup(parseInlineMarkup(src))).toBe(src);
  });
});
