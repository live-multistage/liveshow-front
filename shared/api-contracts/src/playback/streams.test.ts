import { test, expect } from 'vitest';
import { pickActiveStream } from './streams';
import type { LivePlaybackResponse, ReplayPlaybackResponse } from './types';

const a = { id: 'a' };
const b = { id: 'b' };

test("the viewer's pick wins while it is still listed", () => {
  expect(pickActiveStream([a, b], 'b', 'a')).toBe(b);
});

test('a vanished pick (ticket revoked, stream deleted) falls back to the server default', () => {
  expect(pickActiveStream([a, b], 'gone', 'b')).toBe(b);
});

test('without a pick or a valid default, the first stream', () => {
  expect(pickActiveStream([a, b], null, 'gone')).toBe(a);
  expect(pickActiveStream([a, b], null, undefined)).toBe(a);
});

test('nothing to show is null, never a throw', () => {
  expect(pickActiveStream([], 'a', 'a')).toBeNull();
});

test('a pre-multi-transmission payload is still a valid LivePlaybackResponse', () => {
  const legacy = {
    eventId: 'e', live: true, latencyMode: 'STANDARD', cameras: [], primaryCameraId: null, librasCameraId: null,
  } satisfies LivePlaybackResponse;
  expect(legacy.cameras).toEqual([]);
});

test('a VOD replay payload (no streams) is still a valid ReplayPlaybackResponse', () => {
  const vod = {
    eventId: 'e', available: true, stages: [], cameras: [], primaryCameraId: 'vod', librasCameraId: null,
    timeline: null, streams: [], defaultStreamId: null,
  } satisfies ReplayPlaybackResponse;
  expect(vod.streams).toEqual([]);
});
