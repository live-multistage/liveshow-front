import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactElement } from 'react';
import type { EventResponse } from '@/features/events/types/event.types';

const EVENT = {
  id: 'evt-1',
  slug: 'rock-in-rio',
  title: 'Rock in Rio',
  description: 'Tres   dias de rock.',
  status: 'FINISHED',
  format: 'LIVE',
  bannerUrl: 'https://cdn/banner.jpg',
  thumbnailUrl: 'https://cdn/thumb.jpg',
} as unknown as EventResponse;

const fetchEvent = vi.fn(async (_id: string): Promise<EventResponse> => EVENT);
vi.mock('@/features/events/queries/get-event.server', () => ({
  getEventCached: (id: string) => fetchEvent(id),
}));
vi.mock('@/features/feature-flags', () => ({ fetchFeatureFlags: async () => ({ chat: true, ads_delivery: false }) }));
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NOT_FOUND');
  },
}));
vi.mock('@/features/streaming/components/WatchGate', () => ({ WatchGate: () => null }));

import WatchPage, { generateMetadata } from './page';

const props = (t?: string | string[]) => ({
  params: Promise.resolve({ id: 'evt-1' }),
  searchParams: Promise.resolve(t === undefined ? {} : { t }),
});

describe('/watch/[id] page', () => {
  beforeEach(() => fetchEvent.mockClear());

  it('hands the event, flags and ?t= to the watch gate', async () => {
    const el = (await WatchPage(props('90'))) as ReactElement<Record<string, unknown>>;
    expect(el.props).toMatchObject({ event: EVENT, chatEnabled: true, adsEnabled: false, startAtSeconds: 90 });
  });

  it('ignores a malformed or repeated ?t=', async () => {
    expect(((await WatchPage(props('abc'))) as ReactElement<Record<string, unknown>>).props.startAtSeconds).toBeNull();
    expect(((await WatchPage(props(['1', '2']))) as ReactElement<Record<string, unknown>>).props.startAtSeconds).toBeNull();
  });

  it('404s an unknown event', async () => {
    fetchEvent.mockRejectedValueOnce(new Error('404'));
    await expect(WatchPage(props())).rejects.toThrow('NOT_FOUND');
  });
});

describe('/watch/[id] generateMetadata', () => {
  it('titles the page with the event and carries a full openGraph (it replaces the layout one)', async () => {
    const meta = await generateMetadata(props());
    expect(meta.title).toBe('Rock in Rio');
    expect(meta.description).toBe('Tres dias de rock.');
    expect(meta.openGraph).toMatchObject({
      type: 'website',
      siteName: 'showon.io',
      url: expect.stringMatching(/\/watch\/evt-1$/),
      title: 'Rock in Rio',
      description: 'Tres dias de rock.',
      images: [{ url: 'https://cdn/banner.jpg' }],
    });
  });

  it('falls back to generic, unindexed copy for an unknown event', async () => {
    fetchEvent.mockRejectedValueOnce(new Error('404'));
    expect(await generateMetadata(props())).toEqual({ title: 'Assistir', robots: { index: false, follow: false } });
  });
});
