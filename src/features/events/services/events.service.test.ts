import { describe, it, expect, vi, beforeEach } from 'vitest';

const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('@/lib/http/client', () => ({ httpClient: { get } }));

import { eventsService } from './events.service';

describe('eventsService my events', () => {
  beforeEach(() => vi.clearAllMocks());

  it('listMyEvents sends page, pageSize and status to the paged endpoint', async () => {
    const body = { items: [], page: 2, pageSize: 20, total: 0 };
    get.mockResolvedValueOnce({ data: body });
    await expect(eventsService.listMyEvents({ page: 2, status: 'live' })).resolves.toEqual(body);
    expect(get).toHaveBeenCalledWith('/events/mine/paged', {
      params: { page: 2, pageSize: 20, status: 'live' },
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
