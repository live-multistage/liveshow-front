import { describe, expect, it, vi } from 'vitest';

const cookieJar = new Map<string, string>();
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (name: string) => (cookieJar.has(name) ? { value: cookieJar.get(name) } : undefined) }),
}));

import { GET } from './route';

describe('GET /api/auth/session', () => {
  it('answers an anonymous visitor with 200 so the browser logs no console error', async () => {
    cookieJar.clear();
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ authenticated: false });
  });
});
