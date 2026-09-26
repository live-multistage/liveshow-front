import { describe, it, expect, vi, beforeEach } from 'vitest';

const cookieValues: Record<string, string | undefined> = {};

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => (cookieValues[name] !== undefined ? { value: cookieValues[name] } : undefined),
  }),
}));

import { fetchHomeRails } from './get-home-rails.server';

describe('fetchHomeRails', () => {
  beforeEach(() => {
    delete cookieValues.access_token;
    delete cookieValues.locale;
    vi.stubGlobal('fetch', vi.fn());
  });

  it('sends Accept-Language for the locale cookie', async () => {
    cookieValues.locale = 'en';
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => ({ rails: [] }) } as Response);

    await fetchHomeRails();

    const init = vi.mocked(fetch).mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>)['Accept-Language']).toBe('en');
  });

  it('defaults to pt when no locale cookie is set', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => ({ rails: [] }) } as Response);

    await fetchHomeRails();

    const init = vi.mocked(fetch).mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>)['Accept-Language']).toBe('pt');
  });

  it('sends Authorization and skips the Data Cache when a token cookie is present', async () => {
    cookieValues.access_token = 'a-token';
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => ({ rails: [] }) } as Response);

    await fetchHomeRails();

    const init = vi.mocked(fetch).mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer a-token');
    expect(init.cache).toBe('no-store');
  });

  it('revalidates every 30s and sends no Authorization when there is no token', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => ({ rails: [] }) } as Response);

    await fetchHomeRails();

    const init = vi.mocked(fetch).mock.calls[0][1] as RequestInit;
    expect(init.next).toEqual({ revalidate: 30 });
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
  });

  it('returns null when the response is not ok', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false } as Response);

    const result = await fetchHomeRails();

    expect(result).toBeNull();
  });

  it('returns null when fetch throws', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('network error'));

    const result = await fetchHomeRails();

    expect(result).toBeNull();
  });
});
