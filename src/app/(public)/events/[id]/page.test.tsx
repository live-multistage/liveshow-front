import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { EventResponse } from '@/features/events/types/event.types';

const EVENT = {
  id: '9f8b1c2d-3e4f-4a5b-8c9d-0e1f2a3b4c5d',
  slug: 'rock-in-rio-2026',
  title: 'Rock in Rio 2026',
  description: 'Tres dias de rock.',
} as unknown as EventResponse;

const fetchEvent = vi.fn(async (_id: string) => EVENT);
const fetchEventBySlug = vi.fn(async (_slug: string) => EVENT);
const fetchTicketProducts = vi.fn(async (_id: string) => ({ products: [], serviceFeeRate: 0 }));

vi.mock('@/features/events/queries/get-event.server', async () => {
  const { isEventId } = await import('@/features/events/utils/slug');
  return {
    fetchEvent: (id: string) => fetchEvent(id),
    fetchEventBySlug: (slug: string) => fetchEventBySlug(slug),
    fetchTicketProducts: (id: string) => fetchTicketProducts(id),
    fetchEventByParam: async (param: string) => {
      try {
        return isEventId(param) ? await fetchEvent(param) : await fetchEventBySlug(param);
      } catch {
        return null;
      }
    },
  };
});

const permanentRedirect = vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`);
});
vi.mock('next/navigation', () => ({ permanentRedirect: (u: string) => permanentRedirect(u) }));

vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }) }));

vi.mock('@/features/streaming/queries/streaming.server', () => ({
  fetchLiveAccess: vi.fn(),
  fetchReplayAccess: vi.fn(),
  isTokenExpired: () => true,
}));

vi.mock('@/features/events', () => ({
  EventDetailPageContent: ({ id }: { id: string }) => <div data-testid="detail">{id}</div>,
}));

import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ShowDetail, { generateMetadata } from './page';

async function renderPage(param: string) {
  const ui = await ShowDetail({ params: Promise.resolve({ id: param }) });
  render(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>);
}

describe('/events/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchEvent.mockResolvedValue(EVENT);
    fetchEventBySlug.mockResolvedValue(EVENT);
  });

  it('permanently redirects a UUID param to the slug URL', async () => {
    await expect(renderPage(EVENT.id)).rejects.toThrow('REDIRECT:/events/rock-in-rio-2026');
    expect(fetchEvent).toHaveBeenCalledWith(EVENT.id);
  });

  it('renders by slug without redirecting', async () => {
    await renderPage('rock-in-rio-2026');
    expect(fetchEventBySlug).toHaveBeenCalledWith('rock-in-rio-2026');
    expect(permanentRedirect).not.toHaveBeenCalled();
    // The client tree still keys off the id, so the by-slug fetch must resolve it.
    expect(screen.getByTestId('detail')).toHaveTextContent(EVENT.id);
  });

  it('falls through with the raw param when the event cannot be resolved', async () => {
    fetchEventBySlug.mockRejectedValue(new Error('404'));
    await renderPage('nao-existe');
    expect(permanentRedirect).not.toHaveBeenCalled();
    expect(screen.getByTestId('detail')).toHaveTextContent('nao-existe');
  });

  it('canonicalises metadata on the slug and describes the event', async () => {
    const meta = await generateMetadata({ params: Promise.resolve({ id: EVENT.id }) });
    expect(meta.title).toBe('Rock in Rio 2026');
    expect(meta.alternates?.canonical).toContain('/events/rock-in-rio-2026');
    expect(meta.description).toBe('Tres dias de rock.');
    expect(meta.openGraph?.title).toBe('Rock in Rio 2026');
    expect(meta.openGraph?.description).toBe('Tres dias de rock.');
    expect(meta.robots).toBeUndefined();
  });

  // A dead link still renders a 200; without noindex every one of them accretes
  // in the index as a thin duplicate page.
  it('noindexes metadata when the event cannot be resolved', async () => {
    fetchEventBySlug.mockRejectedValue(new Error('404'));

    const meta = await generateMetadata({ params: Promise.resolve({ id: 'nao-existe' }) });

    expect(meta.robots).toEqual({ index: false, follow: false });
  });
});
