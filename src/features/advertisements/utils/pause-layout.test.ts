import { describe, it, expect } from 'vitest';
import { resolvePauseLayout } from './pause-layout';

describe('resolvePauseLayout', () => {
  it.each([
    ['STANDARD', false, 'STANDARD'],
    ['FULLSCREEN', false, 'FULLSCREEN'],
    [null, false, 'STANDARD'],
    [undefined, false, 'STANDARD'],
    ['STANDARD', true, 'FULLSCREEN'],
    [null, true, 'FULLSCREEN'],
    ['FULLSCREEN', true, 'FULLSCREEN'],
  ] as const)('variant %s, phone %s -> %s', (variant, phone, expected) => {
    expect(resolvePauseLayout(variant, phone)).toBe(expected);
  });
});
