import { describe, it, expect, vi, afterEach } from 'vitest';
import { AxiosError, AxiosHeaders } from 'axios';
import { normalizeError } from './errors';

describe('normalizeError', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reads requestId from the response body when the server echoed one back', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const error = new AxiosError(
      'Request failed',
      undefined,
      {
        url: '/orders',
        headers: new AxiosHeaders({ 'X-Request-Id': 'sent-id', Authorization: 'Bearer super-secret-token' }),
      } as never,
      undefined,
      {
        status: 400,
        data: { message: 'bad request', code: 'INVALID', requestId: 'server-id' },
      } as never,
    );

    expect(normalizeError(error)).toEqual({
      message: 'bad request',
      status: 400,
      code: 'INVALID',
      requestId: 'server-id',
    });

    const logged = JSON.stringify(spy.mock.calls);
    expect(logged).not.toContain('super-secret-token');
    expect(logged).not.toContain('Authorization');
  });

  it('falls back to the sent X-Request-Id when there is no response body (network error)', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const error = new AxiosError('Network Error', undefined, {
      headers: new AxiosHeaders({ 'X-Request-Id': 'sent-id' }),
    } as never);

    const result = normalizeError(error);
    expect(result.requestId).toBe('sent-id');
    expect(result.status).toBe(0);
  });

  it('omits requestId when neither the response nor the sent config carry one', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const error = new AxiosError('Network Error');

    expect(normalizeError(error).requestId).toBeUndefined();
  });

  it('never logs the raw axios error (config.headers/config.data can carry auth tokens and PII)', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const error = new AxiosError(
      'Request failed',
      undefined,
      {
        url: '/orders',
        headers: new AxiosHeaders({ Authorization: 'Bearer super-secret-token' }),
        data: JSON.stringify({ cardNumber: '4111111111111111' }),
      } as never,
      undefined,
      { status: 500, data: { message: 'server error' } } as never,
    );

    normalizeError(error);

    expect(spy).toHaveBeenCalledWith(
      '[http error]',
      expect.any(Object),
      { url: '/orders', message: 'Request failed' },
    );
    const logged = JSON.stringify(spy.mock.calls);
    expect(logged).not.toContain('super-secret-token');
    expect(logged).not.toContain('4111111111111111');
  });

  it('logs to the console for a non-axios error and returns a generic AppError', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = normalizeError(new Error('boom'));

    expect(result).toEqual({ message: 'Unexpected error', status: 0 });
    expect(spy).toHaveBeenCalled();
  });
});
