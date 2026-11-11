import { describe, expect, it } from 'vitest';
import { parseStartSeconds, watchMode, watchPath } from './watch-route';
import type { EventResponse } from '@/features/events/types/event.types';

const ev = (status: EventResponse['status'], format: EventResponse['format'] = 'LIVE') => ({ status, format });

describe('watchPath', () => {
  it('builds the canonical player URL', () => {
    expect(watchPath('abc')).toBe('/watch/abc');
  });
});

describe('watchMode', () => {
  it.each(['DRAFT', 'PUBLISHED', 'SCHEDULED', 'LIVE', 'CANCELLED'] as const)('%s live event → live gate', (status) => {
    expect(watchMode(ev(status))).toBe('live');
  });

  it('finished live event → replay gate', () => {
    expect(watchMode(ev('FINISHED'))).toBe('replay');
  });

  it.each(['PUBLISHED', 'SCHEDULED', 'LIVE', 'FINISHED'] as const)('VOD event (%s) → replay gate', (status) => {
    expect(watchMode(ev(status, 'VOD'))).toBe('replay');
  });
});

describe('parseStartSeconds', () => {
  it.each([
    ['90', 90],
    ['90s', 90],
    ['0', 0],
  ])('%s → %d', (raw, expected) => {
    expect(parseStartSeconds(raw)).toBe(expected);
  });

  it.each([null, undefined, '', 'abc', '-5', '1.5', '1m30s', '9'.repeat(400)])('rejects %s', (raw) => {
    expect(parseStartSeconds(raw)).toBeNull();
  });
});
