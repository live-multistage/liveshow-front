import { describe, it, expect } from 'vitest';
import { eventAction, isVenueOnly } from './event-action';
import type { AccessibleEvent, AccessCapability } from '../types/my-list.types';

function ev(overrides: Partial<AccessibleEvent> = {}): AccessibleEvent {
  return {
    id: 'ev-1',
    title: 'Show',
    status: 'SCHEDULED',
    startsAt: '2026-01-01T20:00:00.000Z',
    endsAt: '2026-01-01T22:00:00.000Z',
    thumbnailUrl: null,
    bannerUrl: null,
    venue: null,
    city: null,
    capabilities: [],
    canWatchLive: false,
    canWatchReplay: false,
    ...overrides,
  };
}

const caps = (...c: AccessCapability[]) => c;

// Uma linha por linha da tabela do design (§5).
describe('eventAction', () => {
  it('sends a live event the ticket covers to the live player', () => {
    const action = eventAction(ev({ status: 'LIVE', canWatchLive: true, capabilities: caps('LIVE_VIEW') }));

    expect(action.kind).toBe('watch-live');
    expect(action.href).toBe('/live/ev-1');
    expect(action.primary).toBe(true);
  });

  it('offers only details for a live event the ticket does not cover', () => {
    const action = eventAction(ev({ status: 'LIVE', canWatchLive: false, capabilities: caps('REPLAY_VIEW') }));

    expect(action.kind).toBe('details');
    expect(action.href).toBe('/events/ev-1');
  });

  it('links details through the slug when the payload carries one', () => {
    const action = eventAction(ev({ slug: 'show-do-ano', status: 'CANCELLED' }));

    expect(action.href).toBe('/events/show-do-ano');
  });

  it('sends a finished event with replay access to the replay player', () => {
    const action = eventAction(
      ev({ status: 'FINISHED', canWatchReplay: true, capabilities: caps('REPLAY_VIEW') }),
    );

    expect(action.kind).toBe('watch-replay');
    expect(action.href).toBe('/replay/ev-1');
  });

  /** O caso central: ingresso só-ao-vivo não vira acesso a replay. */
  it('never offers replay for a live-only ticket after the event ends', () => {
    const action = eventAction(
      ev({ status: 'FINISHED', canWatchReplay: false, capabilities: caps('LIVE_VIEW') }),
    );

    expect(action.kind).toBe('details');
    expect(action.href).not.toContain('/replay/');
  });

  it('offers details for an upcoming event', () => {
    expect(eventAction(ev({ status: 'SCHEDULED' })).kind).toBe('details');
    expect(eventAction(ev({ status: 'PUBLISHED' })).kind).toBe('details');
  });

  /** Cancelado vence tudo: não faz sentido oferecer "assistir" nem que o
   *  servidor por algum motivo dissesse que sim. */
  it('reports a cancelled event as cancelled even if playback were flagged', () => {
    const action = eventAction(ev({ status: 'CANCELLED', canWatchLive: true }));

    expect(action.kind).toBe('cancelled');
    expect(action.href).not.toContain('/live/');
  });

  it('never offers playback for a venue-entry ticket', () => {
    const live = eventAction(ev({ status: 'LIVE', capabilities: caps('PHYSICAL_ENTRY') }));
    const finished = eventAction(ev({ status: 'FINISHED', capabilities: caps('PHYSICAL_ENTRY') }));

    expect(live.kind).toBe('details');
    expect(finished.kind).toBe('details');
  });
});

describe('isVenueOnly', () => {
  it('is true only when the ticket carries no playback capability at all', () => {
    expect(isVenueOnly(ev({ capabilities: caps('PHYSICAL_ENTRY') }))).toBe(true);
  });

  it('is false when the same ticket also grants watching', () => {
    expect(isVenueOnly(ev({ capabilities: caps('PHYSICAL_ENTRY', 'LIVE_VIEW') }))).toBe(false);
    expect(isVenueOnly(ev({ capabilities: caps('PHYSICAL_ENTRY', 'CAMERA_VIEW') }))).toBe(false);
  });

  it('is false for a purely online ticket', () => {
    expect(isVenueOnly(ev({ capabilities: caps('LIVE_VIEW') }))).toBe(false);
  });
});
