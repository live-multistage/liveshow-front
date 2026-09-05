import { describe, it, expect, vi } from 'vitest';
import axios from 'axios';
import { applyInterceptors } from './interceptors';

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
