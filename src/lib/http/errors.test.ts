import { describe, it, expect, vi, afterEach } from 'vitest';
import { AxiosError } from 'axios';
import { normalizeError } from './errors';

describe('normalizeError', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reads requestId from the response body when the server echoed one back', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const error = new AxiosError('Request failed', undefined, {
      headers: { 'X-Request-Id': 'sent-id' },
    } as never, undefined, {
      status: 400,
      data: { message: 'bad request', code: 'INVALID', requestId: 'server-id' },
    } as never);

    expect(normalizeError(error)).toEqual({
      message: 'bad request',
      status: 400,
      code: 'INVALID',
      requestId: 'server-id',
    });
  });

  it('falls back to the sent X-Request-Id when there is no response body (network error)', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const error = new AxiosError('Network Error', undefined, {
      headers: { 'X-Request-Id': 'sent-id' },
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

  it('logs to the console for a non-axios error and returns a generic AppError', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = normalizeError(new Error('boom'));

    expect(result).toEqual({ message: 'Unexpected error', status: 0 });
    expect(spy).toHaveBeenCalled();
  });
});
