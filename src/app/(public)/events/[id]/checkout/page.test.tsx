import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { EventResponse } from '@/features/events/types/event.types';

const EVENT = {
  id: '9f8b1c2d-3e4f-4a5b-8c9d-0e1f2a3b4c5d',
  slug: 'rock-in-rio-2026',
} as unknown as EventResponse;

const fetchEventBySlug = vi.fn(async (_slug: string) => EVENT);

vi.mock('@/features/events/queries/get-event.server', async () => {
  const { isEventId } = await import('@/features/events/utils/slug');
  return {
    resolveEventId: async (param: string) => {
      if (isEventId(param)) return param;
      try {
        return (await fetchEventBySlug(param)).id;
      } catch {
        return param;
      }
    },
  };
});

vi.mock('@/features/checkout', () => ({
  CheckoutPageContent: ({ eventId, quantity }: { eventId: string; quantity: number }) => (
    <div data-testid="checkout" data-qty={quantity}>{eventId}</div>
  ),
  CheckoutSuccessContent: ({ eventId }: { eventId: string }) => <div data-testid="checkout">{eventId}</div>,
  CheckoutPendingContent: ({ eventId }: { eventId: string }) => <div data-testid="checkout">{eventId}</div>,
  CheckoutFailedContent: ({ eventId }: { eventId: string }) => <div data-testid="checkout">{eventId}</div>,
}));

import { render, screen } from '@testing-library/react';
import CheckoutPage from './page';
import CheckoutSuccessPage from './success/page';
import CheckoutPendingPage from './pending/page';
import CheckoutFailedPage from './failed/page';

const params = (id: string) => Promise.resolve({ id });

// Checkout keys off the event's UUID, but the parent segment now serves slugs —
// so /events/<slug>/checkout must resolve before handing the id downstream.
describe('/events/[id]/checkout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchEventBySlug.mockResolvedValue(EVENT);
  });

  it('resolves a slug param to the event id', async () => {
    render(await CheckoutPage({
      params: params('rock-in-rio-2026'),
      searchParams: Promise.resolve({ ticketId: 'tp-1', qty: '2' }),
    }));

    expect(fetchEventBySlug).toHaveBeenCalledWith('rock-in-rio-2026');
    expect(screen.getByTestId('checkout')).toHaveTextContent(EVENT.id);
    expect(screen.getByTestId('checkout')).toHaveAttribute('data-qty', '2');
  });

  it('passes a UUID param straight through without a lookup', async () => {
    render(await CheckoutPage({
      params: params(EVENT.id),
      searchParams: Promise.resolve({}),
    }));

    expect(fetchEventBySlug).not.toHaveBeenCalled();
    expect(screen.getByTestId('checkout')).toHaveTextContent(EVENT.id);
  });

  // The outcome pages take different searchParams shapes; only `params` matters here.
  it.each([
    ['success', () => CheckoutSuccessPage({ params: params('rock-in-rio-2026') })],
    ['pending', () => CheckoutPendingPage({ params: params('rock-in-rio-2026'), searchParams: Promise.resolve({}) })],
    ['failed', () => CheckoutFailedPage({ params: params('rock-in-rio-2026'), searchParams: Promise.resolve({}) })],
  ])('resolves the slug on the %s outcome page too', async (_name, renderPage) => {
    render(await renderPage());

    expect(screen.getByTestId('checkout')).toHaveTextContent(EVENT.id);
  });
});
