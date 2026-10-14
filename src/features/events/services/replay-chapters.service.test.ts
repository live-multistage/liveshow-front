import { describe, it, expect, vi, beforeEach } from 'vitest';

const { get, put } = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn() }));
vi.mock('@/lib/http/client', () => ({ httpClient: { get, put } }));

import { replayChaptersService } from './replay-chapters.service';

describe('replayChaptersService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('get reads the chapters endpoint', async () => {
    const body = { chapters: [], window: null };
    get.mockResolvedValueOnce({ data: body });
    await expect(replayChaptersService.get('e1')).resolves.toEqual(body);
    expect(get).toHaveBeenCalledWith('/events/e1/replay-chapters');
  });

  it('replace PUTs the body and returns the response', async () => {
    const req = { chapters: [] };
    const res = { chapters: [], window: { startsAtMs: 1, endsAtMs: 2 } };
    put.mockResolvedValueOnce({ data: res });
    await expect(replayChaptersService.replace('e1', req)).resolves.toEqual(res);
    expect(put).toHaveBeenCalledWith('/events/e1/replay-chapters', req);
  });

  it('suggestions unwraps the list', async () => {
    get.mockResolvedValueOnce({ data: { suggestions: [{ title: 'x' }] } });
    await expect(replayChaptersService.suggestions('e1')).resolves.toEqual([{ title: 'x' }]);
    expect(get).toHaveBeenCalledWith('/events/e1/replay-chapters/suggestions');
  });
});
