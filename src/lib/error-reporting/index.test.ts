import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

const initMock = vi.fn();
const captureExceptionMock = vi.fn();

vi.mock('@sentry/nextjs', () => ({
  init: initMock,
  captureException: captureExceptionMock,
}));

describe('reportError', () => {
  const originalDsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

  beforeEach(() => {
    vi.resetModules();
    initMock.mockClear();
    captureExceptionMock.mockClear();
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_SENTRY_DSN = originalDsn;
  });

  it('no-ops to console.error without a DSN', async () => {
    delete process.env.NEXT_PUBLIC_SENTRY_DSN;
    const { reportError } = await import('./index');
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const error = new Error('boom');

    reportError(error, { userId: 'u1' });

    expect(consoleSpy).toHaveBeenCalledWith(error, { userId: 'u1' });
    expect(initMock).not.toHaveBeenCalled();
    expect(captureExceptionMock).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('forwards to Sentry, tracing/replay off, when a DSN is configured', async () => {
    process.env.NEXT_PUBLIC_SENTRY_DSN = 'https://example.ingest.sentry.io/1';
    const { reportError } = await import('./index');
    const error = new Error('boom');

    reportError(error, { orderId: 'o1' });

    expect(initMock).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: 'https://example.ingest.sentry.io/1',
        tracesSampleRate: 0,
        replaysSessionSampleRate: 0,
        replaysOnErrorSampleRate: 0,
      }),
    );
    expect(captureExceptionMock).toHaveBeenCalledWith(error, { extra: { orderId: 'o1' } });
  });
});
