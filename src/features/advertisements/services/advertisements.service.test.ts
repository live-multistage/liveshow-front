import { describe, it, expect, vi, beforeEach } from 'vitest';

const get = vi.fn();
const post = vi.fn();
vi.mock('@/lib/http/client', () => ({ httpClient: { get: (...a: unknown[]) => get(...a), post: (...a: unknown[]) => post(...a) } }));

import { advertisementsService } from './advertisements.service';

describe('advertisementsService.serve', () => {
  beforeEach(() => {
    sessionStorage.clear();
    get.mockReset().mockResolvedValue({ data: [] });
  });

  it('sends the stable browser-session id on every serve', async () => {
    await advertisementsService.serve('PRE_ROLL', 1, 'e1');
    await advertisementsService.serve('PLAYER_PAUSE', 1, 'e1');
    const [first, second] = get.mock.calls.map((c) => c[1].params.sessionId);
    expect(first).toBeTruthy();
    expect(second).toBe(first);
  });
});

describe('advertisementsService.recordEvent', () => {
  it('posts the event type to the served record and never throws on failure', async () => {
    post.mockReset().mockRejectedValue(new Error('network'));
    expect(() => advertisementsService.recordEvent('srv-1', 'video_q50')).not.toThrow();
    expect(post).toHaveBeenCalledWith('/ads/serve/srv-1/event', { type: 'video_q50' });
    await Promise.resolve();
  });
});
