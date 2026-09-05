import { describe, it, expect } from 'vitest';
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
  it('sets X-Request-Id without dropping existing headers', () => {
    const init = withRequestId({ headers: { Authorization: 'Bearer x' } });
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer x');
    expect(headers['X-Request-Id']).toBeTruthy();
  });

  it('works with no init argument at all', () => {
    const init = withRequestId();
    expect((init.headers as Record<string, string>)['X-Request-Id']).toBeTruthy();
  });

  it('preserves other RequestInit fields', () => {
    const init = withRequestId({ method: 'POST', cache: 'no-store' });
    expect(init.method).toBe('POST');
    expect(init.cache).toBe('no-store');
  });
});
