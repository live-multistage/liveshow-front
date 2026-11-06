import { describe, expect, it } from 'vitest';
import { parseTextRuns, serializeTextRuns } from './text-runs';

describe('parseTextRuns', () => {
  it('splits paragraphs on blank lines', () => {
    expect(parseTextRuns('um\n\ndois')).toEqual([[{ text: 'um' }], [{ text: 'dois' }]]);
  });

  it('parses bold, italic and links', () => {
    expect(parseTextRuns('a **b** *c* [d](/events) e')).toEqual([
      [{ text: 'a ' }, { text: 'b', bold: true }, { text: ' ' }, { text: 'c', italic: true }, { text: ' ' },
        { text: 'd', href: '/events' }, { text: ' e' }],
    ]);
  });

  it('keeps a link with an unsafe href as literal text', () => {
    expect(parseTextRuns('[x](javascript:alert(1))')).toEqual([[{ text: '[x](javascript:alert(1))' }]]);
  });

  it('yields one empty run for an empty body so validation flags it', () => {
    expect(parseTextRuns('  \n')).toEqual([[{ text: '' }]]);
  });

  it('round-trips', () => {
    const body = 'a **b** *c* ***d*** [e](https://x.io/y)\n\nsegundo';
    expect(serializeTextRuns(parseTextRuns(body))).toBe(body);
  });
});
