import { describe, it, expect } from 'vitest';
import { ogSubtitle, ogTitleSize } from './BrandCard';

describe('ogTitleSize', () => {
  it('uses the large size for short titles', () => {
    expect(ogTitleSize('Shows')).toBe(88);
    expect(ogTitleSize('a'.repeat(40))).toBe(88);
  });

  it('drops to the small size past 40 chars', () => {
    expect(ogTitleSize('a'.repeat(41))).toBe(64);
  });
});

describe('ogSubtitle', () => {
  it('passes short text through and truncates long text with an ellipsis', () => {
    expect(ogSubtitle('curto')).toBe('curto');
    expect(ogSubtitle(undefined)).toBeUndefined();
    const long = 'a'.repeat(200);
    expect(ogSubtitle(long)).toHaveLength(140);
    expect(ogSubtitle(long)?.endsWith('…')).toBe(true);
  });
});
