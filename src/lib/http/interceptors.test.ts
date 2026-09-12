import { describe, it, expect, vi, afterEach } from 'vitest';
import axios from 'axios';
import { applyInterceptors, getUiLocale } from './interceptors';

vi.mock('@/lib/auth/token-store', () => ({ tokenStore: { get: () => null, clear: vi.fn() } }));
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
