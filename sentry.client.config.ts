// Picked up automatically once next.config.ts is wrapped with
// withSentryConfig (out of this phase's ownership — see report). Until then,
// src/lib/error-reporting's reportError() self-initializes, so manual calls
// still work regardless of this file's wiring.
import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
  });
}
