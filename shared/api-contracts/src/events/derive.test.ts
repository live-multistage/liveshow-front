import { test, expect } from 'vitest';
import { isLive, isFinished, hasReplay, isPurchasable, coverUrl, bannerUrl, priceRange, getSoleFreeTicketProduct, serviceFee, purchasableTickets, FALLBACK_EVENT_IMAGE } from './derive';
import type { TicketProductResponse } from './types';

const tp = (over: Partial<TicketProductResponse>): TicketProductResponse => ({
  id: 't', eventId: 'e', name: 'n', description: '', price: 10, currency: 'BRL', capabilities: ['LIVE_VIEW'],
  camerasLimit: null, allowedStageIds: [], capacity: null, remaining: null, soldOut: false, immutable: false, ...over,
});

test('status helpers', () => {
  expect(isLive({ status: 'LIVE' })).toBe(true);
  expect(isFinished({ status: 'FINISHED' })).toBe(true);
  expect(hasReplay({ status: 'FINISHED', format: 'LIVE' })).toBe(true);
  expect(hasReplay({ status: 'PUBLISHED', format: 'VOD' })).toBe(true);
  expect(hasReplay({ status: 'PUBLISHED', format: 'LIVE' })).toBe(false);
  expect(isPurchasable({ status: 'PUBLISHED', format: 'LIVE' })).toBe(true);
  expect(isPurchasable({ status: 'SCHEDULED', format: 'LIVE' })).toBe(true);
  expect(isPurchasable({ status: 'LIVE', format: 'LIVE' })).toBe(true);
  expect(isPurchasable({ status: 'FINISHED', format: 'LIVE' })).toBe(true);   // FINISHED && hasReplay
  expect(isPurchasable({ status: 'CANCELLED', format: 'LIVE' })).toBe(false);
  expect(isPurchasable({ status: 'DRAFT', format: 'LIVE' })).toBe(false);
});

test('images prefer thumbnail for cards, banner for heroes, fallback last', () => {
  expect(coverUrl({ thumbnailUrl: 't', bannerUrl: 'b' })).toBe('t');
  expect(coverUrl({ thumbnailUrl: null, bannerUrl: 'b' })).toBe('b');
  expect(coverUrl({ thumbnailUrl: null, bannerUrl: null })).toBe(FALLBACK_EVENT_IMAGE);
  expect(bannerUrl({ thumbnailUrl: 't', bannerUrl: 'b' })).toBe('b');
  expect(bannerUrl({ thumbnailUrl: 't', bannerUrl: null })).toBe('t');
});

test('priceRange', () => {
  expect(priceRange({})).toBeNull();
  expect(priceRange({ priceFromCents: 1000 })).toEqual({ fromCents: 1000, toCents: 1000 });
  expect(priceRange({ priceFromCents: 1000, priceToCents: 5000 })).toEqual({ fromCents: 1000, toCents: 5000 });
});

test('sole free ticket is strict', () => {
  expect(getSoleFreeTicketProduct([tp({ price: 0 })])?.id).toBe('t');
  expect(getSoleFreeTicketProduct([tp({ price: 0 }), tp({ id: 'u', price: 5 })])).toBeNull();
  expect(getSoleFreeTicketProduct([tp({ price: 5 })])).toBeNull();
  expect(getSoleFreeTicketProduct([])).toBeNull();
});

test('serviceFee rounds half-up to cents', () => {
  expect(serviceFee(10, 0.125)).toBe(1.25);
  expect(serviceFee(9.99, 0.125)).toBe(1.25);
  expect(serviceFee(0, 0.125)).toBe(0);
});

test('purchasableTickets keeps only replay tickets once finished', () => {
  const live = tp({ id: 'l', capabilities: ['LIVE_VIEW'] });
  const replay = tp({ id: 'r', capabilities: ['LIVE_VIEW', 'REPLAY_VIEW'] });
  expect(purchasableTickets({ status: 'PUBLISHED' }, [live, replay]).map((t) => t.id)).toEqual(['l', 'r']);
  expect(purchasableTickets({ status: 'FINISHED' }, [live, replay]).map((t) => t.id)).toEqual(['r']);
});
