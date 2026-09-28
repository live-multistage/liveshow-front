import { describe, it, expect } from 'vitest';
import { TRACKING_LIMITS, isValidEventName } from './types';

describe('tracking contract', () => {
  it('exposes limits from the spec', () => {
    expect(TRACKING_LIMITS).toEqual({
      maxBatchMessages: 100, maxBatchBytes: 500 * 1024, maxMessageBytes: 32 * 1024,
      maxPropertyDepth: 5, maxReportRangeDays: 90,
    });
  });
  it.each([['checkout_started', true], ['a', false], ['Checkout', false], ['1abc', false], ['a'.repeat(65), false]])(
    'isValidEventName(%s) = %s', (name, ok) => expect(isValidEventName(name)).toBe(ok));
});
