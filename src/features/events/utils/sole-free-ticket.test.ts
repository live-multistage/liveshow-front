import { describe, it, expect } from 'vitest';
import { getSoleFreeTicketProduct } from './sole-free-ticket';
import type { TicketProductResponse } from '../types/event.types';

function makeTicket(overrides: Partial<TicketProductResponse> = {}): TicketProductResponse {
  return {
    id: 'tp-1',
    eventId: 'evt-1',
    name: 'Ingresso',
    description: '',
    price: 0,
    currency: 'BRL',
    capabilities: ['LIVE_VIEW'],
    camerasLimit: null,
    allowedStageIds: [],
    capacity: null,
    remaining: null,
    soldOut: false,
    immutable: false,
    ...overrides,
  };
}

describe('getSoleFreeTicketProduct', () => {
  it('returns the product when it is the only one and it is free', () => {
    const free = makeTicket({ id: 'tp-free', price: 0 });

    expect(getSoleFreeTicketProduct([free])).toBe(free);
  });

  it('returns null when the only product is paid', () => {
    expect(getSoleFreeTicketProduct([makeTicket({ price: 49.9 })])).toBeNull();
  });

  it('returns null when a free tier sits next to a paid tier', () => {
    const free = makeTicket({ id: 'tp-free', price: 0, capabilities: ['LIVE_VIEW'] });
    const paid = makeTicket({ id: 'tp-pro', price: 39.9, capabilities: ['LIVE_VIEW', 'REPLAY_VIEW'] });

    expect(getSoleFreeTicketProduct([free, paid])).toBeNull();
    expect(getSoleFreeTicketProduct([paid, free])).toBeNull();
  });

  it('returns null when there are several free products', () => {
    const a = makeTicket({ id: 'tp-a', price: 0 });
    const b = makeTicket({ id: 'tp-b', price: 0 });

    expect(getSoleFreeTicketProduct([a, b])).toBeNull();
  });

  it('returns null when the event has no products at all', () => {
    expect(getSoleFreeTicketProduct([])).toBeNull();
  });
});
