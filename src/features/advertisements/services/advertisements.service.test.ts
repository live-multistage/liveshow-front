import { describe, it, expect, vi, beforeEach } from 'vitest';

const get = vi.fn();
vi.mock('@/lib/http/client', () => ({ httpClient: { get: (...a: unknown[]) => get(...a), post: vi.fn() } }));

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
