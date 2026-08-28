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
  CheckoutPageContent: ({ ticketProductId }: { ticketProductId: string }) => (
    <div data-testid="checkout">{ticketProductId}</div>
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

describe('/events/[id]/checkout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchEventBySlug.mockResolvedValue(EVENT);
  });

  // The checkout page itself is now a shim into the cart flow — it no
  // longer resolves the event id, it just forwards ticketId.
  it('forwards the ticketId search param to CheckoutPageContent', async () => {
    render(
      await CheckoutPage({
        searchParams: Promise.resolve({ ticketId: 'tp-1' }),
      }),
    );

    expect(screen.getByTestId('checkout')).toHaveTextContent('tp-1');
  });

  // The outcome pages still key off the event's UUID, and the parent
  // segment still serves slugs — so they must keep resolving before
  // handing the id downstream.
  it.each([
    ['success', () => CheckoutSuccessPage({ params: params('rock-in-rio-2026') })],
    ['pending', () => CheckoutPendingPage({ params: params('rock-in-rio-2026'), searchParams: Promise.resolve({}) })],
    ['failed', () => CheckoutFailedPage({ params: params('rock-in-rio-2026'), searchParams: Promise.resolve({}) })],
  ])('resolves the slug on the %s outcome page too', async (_name, renderPage) => {
    render(await renderPage());

    expect(screen.getByTestId('checkout')).toHaveTextContent(EVENT.id);
  });
});
