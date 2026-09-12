import { describe, it, expect } from 'vitest';
import { AxiosError, AxiosHeaders } from 'axios';
import { RefreshFailedError } from '@/lib/http/interceptors';
import { isPlaybackUnauthorized } from './is-playback-unauthorized';

function makeHttpError(status: number) {
  return new AxiosError('Request failed', undefined, { headers: new AxiosHeaders() } as never, undefined, {
    status,
    data: {},
  } as never);
}

describe('isPlaybackUnauthorized', () => {
  it('is true for a 401 AxiosError', () => {
    expect(isPlaybackUnauthorized(makeHttpError(401))).toBe(true);
  });

  it('is true for a 403 AxiosError', () => {
    expect(isPlaybackUnauthorized(makeHttpError(403))).toBe(true);
  });

  it('is true for a failed silent token refresh', () => {
    expect(isPlaybackUnauthorized(new RefreshFailedError())).toBe(true);
  });

  it('is false for a 500 AxiosError', () => {
    expect(isPlaybackUnauthorized(makeHttpError(500))).toBe(false);
  });

  it('is false for an unrelated plain Error', () => {
    expect(isPlaybackUnauthorized(new Error('boom'))).toBe(false);
  });
});
