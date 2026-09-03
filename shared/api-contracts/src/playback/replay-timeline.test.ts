import { test, expect } from 'vitest';
import { absoluteToLocal, coverageAt, localToAbsolute } from './replay-timeline';

const coverage = [
  { startsAtMs: 1000, endsAtMs: 3000, localStartSec: 0 },
  { startsAtMs: 9000, endsAtMs: 11000, localStartSec: 2 },
];

test('an instant inside a stretch maps both ways', () => {
  expect(absoluteToLocal(coverage, 2000)).toBe(1);
  expect(absoluteToLocal(coverage, 10000)).toBe(3);
  expect(localToAbsolute(coverage, 1)).toBe(2000);
  expect(localToAbsolute(coverage, 3)).toBe(10000);
});

test('an instant in the reconnect gap has no local time', () => {
  expect(coverageAt(coverage, 5000)).toBeNull();
  expect(absoluteToLocal(coverage, 5000)).toBeNull();
});

test('the last stretch end is inclusive, earlier ends are not', () => {
  expect(absoluteToLocal(coverage, 3000)).toBeNull();
  expect(absoluteToLocal(coverage, 11000)).toBe(4);
});
