import { describe, it, expect } from 'vitest';
import { buildTicketPanelView } from './ticket-panel-view';
import type { TicketProductResponse } from '../types/event.types';

const ticket = (
  id: string,
  price: number,
  capabilities: TicketProductResponse['capabilities'] = ['LIVE_VIEW'],
): TicketProductResponse => ({
  id, eventId: 'evt-1', name: id, description: '', price, currency: 'BRL', capabilities, camerasLimit: null,
  allowedStageIds: [], allowedStreamIds: [], capacity: null, remaining: null, soldOut: false, immutable: false,
});
const FREE = ticket('free', 0);
const FULL = ticket('full', 49.9, ['LIVE_VIEW', 'REPLAY_VIEW']);
const LIVE_ONLY = ticket('live-only', 19.9);
const states = (view: ReturnType<typeof buildTicketPanelView>) => view.tiers.map((t) => [t.ticket.id, t.state]);

describe('buildTicketPanelView', () => {
  it('a free-ticket owner keeps the paid tier for sale', () => {
    const view = buildTicketPanelView([FREE, FULL], ['free'], { isFinished: false, hasAccess: true });

    expect(states(view)).toEqual([['free', 'owned'], ['full', 'selectable']]);
    expect(view.buyable.map((t) => t.id)).toEqual(['full']);
    expect(view.secured).toBe(false);
  });

  it('owning every product is the only "ticket secured" state', () => {
    const view = buildTicketPanelView([FREE, FULL], ['free', 'full'], { isFinished: false, hasAccess: true });

    expect(view.secured).toBe(true);
    expect(view.buyable).toEqual([]);
  });

  it('a free product the viewer does not own is claimable', () => {
    expect(states(buildTicketPanelView([FREE, FULL], [], { isFinished: false, hasAccess: false }))).toEqual([
      ['free', 'claimable'],
      ['full', 'selectable'],
    ]);
  });

  it('after the event, live-only products leave the list unless owned', () => {
    expect(states(buildTicketPanelView([LIVE_ONLY, FULL], ['live-only'], { isFinished: true, hasAccess: true }))).toEqual([
      ['live-only', 'owned'],
      ['full', 'selectable'],
    ]);
    expect(buildTicketPanelView([LIVE_ONLY, FULL], [], { isFinished: true, hasAccess: false }).tiers.map((t) => t.ticket.id)).toEqual(['full']);
  });

  it('access with no paid line behind it (comp, organizer grant) keeps the secured panel', () => {
    expect(buildTicketPanelView([FREE, FULL], [], { isFinished: false, hasAccess: true }).secured).toBe(true);
  });

  it('no products and no access is not secured', () => {
    const view = buildTicketPanelView([], [], { isFinished: false, hasAccess: false });
    expect(view).toEqual({ tiers: [], buyable: [], secured: false });
  });

  it('a sold-out paid product stays selectable (the panel renders it disabled)', () => {
    const soldOut = { ...FULL, soldOut: true, remaining: 0 };
    expect(states(buildTicketPanelView([soldOut], [], { isFinished: false, hasAccess: false }))).toEqual([['full', 'selectable']]);
  });

  it('owning the sole free product is secured', () => {
    const view = buildTicketPanelView([FREE], ['free'], { isFinished: false, hasAccess: true });
    expect(view.secured).toBe(true);
    expect(view.buyable).toEqual([]);
  });
});
