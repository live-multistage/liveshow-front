import { describe, it, expect, vi, beforeEach } from 'vitest';

const { get, put } = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn() }));
vi.mock('@/lib/http/client', () => ({ httpClient: { get, put } }));

import { eventsService } from './events.service';

describe('eventsService my events', () => {
  beforeEach(() => vi.clearAllMocks());

  it('listMyEvents sends page, pageSize and status to the paged endpoint', async () => {
    const body = { items: [], page: 2, pageSize: 20, total: 0 };
    get.mockResolvedValueOnce({ data: body });
    await expect(eventsService.listMyEvents({ page: 2, status: 'LIVE' })).resolves.toEqual(body);
    expect(get).toHaveBeenCalledWith('/events/mine/paged', {
      params: { page: 2, pageSize: 20, status: 'LIVE' },
    });
  });

  it('listMyEvents defaults to page 1 and omits status for every event', async () => {
    get.mockResolvedValueOnce({ data: { items: [], page: 1, pageSize: 20, total: 0 } });
    await eventsService.listMyEvents();
    expect(get).toHaveBeenCalledWith('/events/mine/paged', {
      params: { page: 1, pageSize: 20, status: undefined },
    });
  });

  it('getMyEventCounts reads the counts endpoint', async () => {
    const counts = { all: 3, live: 1, upcoming: 1, finished: 1 };
    get.mockResolvedValueOnce({ data: counts });
    await expect(eventsService.getMyEventCounts()).resolves.toEqual(counts);
    expect(get).toHaveBeenCalledWith('/events/mine/counts');
  });
});

describe('eventsService.setOverlayAds', () => {
  beforeEach(() => vi.clearAllMocks());

  it('PUTs both switches and returns the saved settings', async () => {
    put.mockResolvedValueOnce({ data: { overlayAds: { allowed: false, onReplay: true } } });
    await expect(eventsService.setOverlayAds('evt-1', { allowed: false, onReplay: true })).resolves.toEqual({
      overlayAds: { allowed: false, onReplay: true },
    });
    expect(put).toHaveBeenCalledWith('/events/evt-1/overlay-ads', { allowed: false, onReplay: true });
  });
});
