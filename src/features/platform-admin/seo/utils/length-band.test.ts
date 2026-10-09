import { describe, expect, it } from 'vitest';
import { lengthBand } from './length-band';

describe('lengthBand', () => {
  it('classifies against the optimal range', () => {
    expect(lengthBand(0, [50, 60])).toBeNull();
    expect(lengthBand(49, [50, 60])).toBe('short');
    expect(lengthBand(55, [50, 60])).toBe('optimal');
    expect(lengthBand(70, [50, 60])).toBe('long');
  });
});
