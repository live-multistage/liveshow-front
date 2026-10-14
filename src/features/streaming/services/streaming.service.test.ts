import { describe, it, expect, vi } from 'vitest';

const get = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/client', () => ({ httpClient: { get } }));

import { streamingService } from './streaming.service';

describe('streamingService.getReplayChapters', () => {
  it('reads the public chapters endpoint and unwraps the list', async () => {
    const chapters = [{ id: 'c1', stageId: null, startsAtMs: 1, endsAtMs: 2, title: 'Intro', description: null, artists: [] }];
    get.mockResolvedValueOnce({ data: { chapters } });

    await expect(streamingService.getReplayChapters('evt-1')).resolves.toEqual(chapters);
    expect(get).toHaveBeenCalledWith('/events/evt-1/replay-chapters');
  });
});
