import { describe, it, expect } from 'vitest';
import { reaisInputToCents, centsToReaisInput } from './reais';

describe('reaisInputToCents', () => {
  it.each([
    ['14', 1400],
    ['14,00', 1400],
    ['0,40', 40],
    ['1.400,50', 140050],
    ['R$ 8', 800],
  ])('%s -> %i', (input, cents) => expect(reaisInputToCents(input)).toBe(cents));

  it.each(['', 'abc', '-3', '1,2,3'])('rejects %j', (input) => expect(reaisInputToCents(input)).toBeNull());
});

describe('centsToReaisInput', () => {
  it('formats with two decimals', () => {
    expect(centsToReaisInput(1400)).toBe('14,00');
    expect(centsToReaisInput(40)).toBe('0,40');
  });
});
