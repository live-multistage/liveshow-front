import { describe, it, expect } from 'vitest';
import { adKindFromPlacements, adKindFromFormat } from './ad-kind';

describe('adKindFromPlacements', () => {
  it.each([
    ['FEED,EVENT_DETAIL', 'banner'],
    ['PRE_ROLL', 'preroll'],
    ['PLAYER_PAUSE', 'pause'],
    ['PLAYER_OVERLAY', 'vitrine'],
    ['', 'banner'],
    [undefined, 'banner'],
  ] as const)('%s -> %s', (input, expected) => expect(adKindFromPlacements(input)).toBe(expected));

  it('accepts an array', () => expect(adKindFromPlacements(['PLAYER_PAUSE'])).toBe('pause'));
});

describe('adKindFromFormat', () => {
  it('maps video and 16:9 formats', () => {
    expect(adKindFromFormat('VIDEO_16_9')).toBe('preroll');
    expect(adKindFromFormat('WIDE_16_9')).toBe('pause');
    expect(adKindFromFormat('VERTICAL_300x600')).toBe('banner');
    expect(adKindFromFormat('LOGO_4x1')).toBe('vitrine');
    expect(adKindFromFormat('LOGO_2x3')).toBe('vitrine');
  });
});
