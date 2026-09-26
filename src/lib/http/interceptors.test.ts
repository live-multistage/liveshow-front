import { describe, it, expect, vi, afterEach } from 'vitest';
import axios from 'axios';
import { applyInterceptors, getUiLocale } from './interceptors';
import { tokenStore } from '@/lib/auth/token-store';
import { useImpersonationStore } from '@/features/platform-admin/impersonation/impersonation.store';

vi.mock('@/lib/auth/token-store', () => ({
  tokenStore: { get: vi.fn(() => null as string | null), clear: vi.fn() },
}));
vi.mock('@/lib/analytics/attribution', () => ({ getAttribution: () => null }));
vi.mock('@/lib/analytics/consent', () => ({ getAnalyticsConsent: () => null }));

describe('applyInterceptors — request id origination', () => {
  it('sets a unique X-Request-Id header on every outgoing request', async () => {
    const client = axios.create();
    applyInterceptors(client);

    const req1 = await client.interceptors.request.handlers[0].fulfilled({
      headers: new axios.AxiosHeaders(),
    } as never);
    const req2 = await client.interceptors.request.handlers[0].fulfilled({
      headers: new axios.AxiosHeaders(),
    } as never);

    const id1 = req1.headers.get('X-Request-Id');
    const id2 = req2.headers.get('X-Request-Id');
    expect(id1).toBeTruthy();
    expect(id2).toBeTruthy();
    expect(id1).not.toBe(id2);
  });
});

describe('applyInterceptors — Accept-Language', () => {
  afterEach(() => {
    document.documentElement.lang = '';
  });

  it('sets Accept-Language from <html lang>', async () => {
    document.documentElement.lang = 'es';
    const client = axios.create();
    applyInterceptors(client);

    const req = await client.interceptors.request.handlers[0].fulfilled({
      headers: new axios.AxiosHeaders(),
    } as never);

    expect(req.headers.get('Accept-Language')).toBe('es');
  });

  it('does not set Accept-Language when <html lang> is unsupported', async () => {
    document.documentElement.lang = 'fr';
    const client = axios.create();
    applyInterceptors(client);

    const req = await client.interceptors.request.handlers[0].fulfilled({
      headers: new axios.AxiosHeaders(),
    } as never);

    expect(req.headers.get('Accept-Language')).toBeUndefined();
  });

  it('does not clobber an explicitly set Accept-Language', async () => {
    document.documentElement.lang = 'es';
    const client = axios.create();
    applyInterceptors(client);

    const headers = new axios.AxiosHeaders();
    headers.set('Accept-Language', 'en');
    const req = await client.interceptors.request.handlers[0].fulfilled({
      headers,
    } as never);

    expect(req.headers.get('Accept-Language')).toBe('en');
  });
});

describe('getUiLocale', () => {
  afterEach(() => {
    document.documentElement.lang = '';
  });

  it('reads a supported locale from <html lang>', () => {
    document.documentElement.lang = 'pt';
    expect(getUiLocale()).toBe('pt');
  });

  it('returns undefined for an unsupported value', () => {
    document.documentElement.lang = 'fr';
    expect(getUiLocale()).toBeUndefined();
  });
});

describe('applyInterceptors — 401 during a support session', () => {
  function reject401() {
    const client = axios.create();
    applyInterceptors(client);
    const handler = client.interceptors.response.handlers[0].rejected;
    return handler({
      config: { headers: new axios.AxiosHeaders() },
      response: { status: 401 },
    } as never);
  }

  /**
   * The refresh cookie belongs to the admin, so refreshing here would hand the
   * app the admin's own token while the banner still names the impersonated
   * user — the session would keep its admin powers behind an organizer UI.
   */
  it('does not refresh while impersonating, even with a token present', async () => {
    vi.mocked(tokenStore.get).mockReturnValue('read-only-token');
    useImpersonationStore.setState({ active: true });
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    try {
      await expect(reject401()).rejects.toBeDefined();
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      vi.mocked(tokenStore.get).mockReturnValue(null);
      useImpersonationStore.setState({ active: false });
      fetchSpy.mockRestore();
    }
  });
});
