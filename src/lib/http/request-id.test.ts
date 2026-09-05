import { describe, it, expect, vi, afterEach } from 'vitest';
import { generateRequestId, withRequestId } from './request-id';

describe('generateRequestId', () => {
  it('returns a non-empty, unique id on each call', () => {
    const a = generateRequestId();
    const b = generateRequestId();
    expect(a).toBeTruthy();
    expect(a).not.toBe(b);
  });
});

describe('withRequestId', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('sets X-Request-Id without dropping existing headers', () => {
    const init = withRequestId({ headers: { Authorization: 'Bearer x' }, cache: 'no-store' });
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer x');
    expect(headers['X-Request-Id']).toBeTruthy();
  });

  it('works with no other init fields, as long as cache is no-store', () => {
    const init = withRequestId({ cache: 'no-store' });
    expect((init.headers as Record<string, string>)['X-Request-Id']).toBeTruthy();
  });

  it('preserves other RequestInit fields', () => {
    const init = withRequestId({ method: 'POST', cache: 'no-store' });
    expect(init.method).toBe('POST');
    expect(init.cache).toBe('no-store');
  });

  // Next's fetch Data Cache keys on request headers, so a header that's random
  // on every call (X-Request-Id) makes a cached/revalidated fetch effectively
  // uncacheable. withRequestId must only be used on cache: 'no-store' fetches.
  it('throws outside production when init.next.revalidate is set', () => {
    vi.stubEnv('NODE_ENV', 'development');
    expect(() => withRequestId({ next: { revalidate: 30 } })).toThrow(/no-store/);
  });

  it('throws outside production when cache is not no-store', () => {
    vi.stubEnv('NODE_ENV', 'development');
    expect(() => withRequestId()).toThrow(/no-store/);
    expect(() => withRequestId({ cache: 'force-cache' })).toThrow(/no-store/);
  });

  it('warns instead of throwing in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(() => withRequestId({ next: { revalidate: 30 } })).not.toThrow();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
