import { beforeEach, describe, expect, it, vi } from 'vitest';

const { revalidateTag } = vi.hoisted(() => ({
  revalidateTag: vi.fn(),
}));

vi.mock('next/cache', () => ({ revalidateTag }));

import { POST } from './route';

function req(body: unknown, secret?: string) {
  return new Request('http://x/api/revalidate', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(secret ? { 'x-revalidate-secret': secret } : {}) },
    body: JSON.stringify(body),
  });
}

describe('POST /api/revalidate', () => {
  beforeEach(() => {
    revalidateTag.mockReset();
    process.env.WEB_REVALIDATE_SECRET = 'right';
  });

  it('401 on wrong or missing secret', async () => {
    expect((await POST(req({ tags: ['seo'] }, 'wrong'))).status).toBe(401);
    expect((await POST(req({ tags: ['seo'] }))).status).toBe(401);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it('401 when the server has no secret configured', async () => {
    delete process.env.WEB_REVALIDATE_SECRET;
    expect((await POST(req({ tags: ['seo'] }, 'anything'))).status).toBe(401);
  });

  it('400 on unknown tags', async () => {
    expect((await POST(req({ tags: ['events'] }, 'right'))).status).toBe(400);
    expect((await POST(req({}, 'right'))).status).toBe(400);
  });

  it('revalidates allowed tags', async () => {
    const res = await POST(req({ tags: ['seo', 'legal'] }, 'right'));
    expect(res.status).toBe(200);
    expect(revalidateTag.mock.calls.map((c) => c[0])).toEqual(['seo', 'legal']);
  });
});
