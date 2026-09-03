import { test, expect } from 'vitest';
import { shouldReportProgress, REPORT_INTERVAL_MS, MIN_REPORTABLE_SECONDS } from './progress-throttle';

test('constants match the web player', () => {
  expect(REPORT_INTERVAL_MS).toBe(10_000);
  expect(MIN_REPORTABLE_SECONDS).toBe(5);
});

test('reports at most once per interval, and never below the floor', () => {
  expect(shouldReportProgress({ lastReportedAt: 0, now: 10_000, positionSeconds: 30 })).toBe(true);
  expect(shouldReportProgress({ lastReportedAt: 5_000, now: 9_000, positionSeconds: 30 })).toBe(false);
  expect(shouldReportProgress({ lastReportedAt: 0, now: 60_000, positionSeconds: 4 })).toBe(false);
  expect(shouldReportProgress({ lastReportedAt: 0, now: 60_000, positionSeconds: 5 })).toBe(true);
});
