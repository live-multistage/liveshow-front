import { test, expect } from 'vitest';
import type { LivePlaybackResponse, LockedStreamOffer, MyEventTicketsResponse, ReplayPlaybackResponse } from '../index';

const locked: LockedStreamOffer = {
  id: 's-full', title: 'Evento completo', position: 1, live: true,
  offer: { ticketProductId: 'tp-full', name: 'Evento completo', priceCents: 4990, currency: 'BRL' },
};

test('live and replay payloads carry locked offers; payloads without them still type-check', () => {
  const live = {
    eventId: 'e', live: true, latencyMode: 'STANDARD', cameras: [], primaryCameraId: null, librasCameraId: null,
    lockedStreams: [locked],
  } satisfies LivePlaybackResponse;
  const legacy = {
    eventId: 'e', live: true, latencyMode: 'STANDARD', cameras: [], primaryCameraId: null, librasCameraId: null,
  } satisfies LivePlaybackResponse;
  const replay = {
    eventId: 'e', available: true, stages: [], cameras: [], primaryCameraId: null, librasCameraId: null,
    timeline: null, lockedStreams: [],
  } satisfies ReplayPlaybackResponse;
  const mine = { ownedTicketProductIds: ['tp-free'] } satisfies MyEventTicketsResponse;

  expect([live.lockedStreams, legacy.cameras, replay.lockedStreams, mine.ownedTicketProductIds]).toEqual([
    [locked], [], [], ['tp-free'],
  ]);
});
