import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

// Lazy, idempotent: sentry.{client,server,edge}.config.ts only run once
// next.config.ts is wrapped with withSentryConfig (out of this phase's
// ownership) — until that wiring lands, this makes reportError work on its
// own wherever it's called from.
let initialized = false;
function ensureInitialized(): void {
  if (initialized || !dsn) return;
  Sentry.init({
    dsn,
    // Errors only — no performance tracing, no session replay.
    tracesSampleRate: 0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
  });
  initialized = true;
}

/**
 * Reports an error to Sentry when NEXT_PUBLIC_SENTRY_DSN is set; otherwise
 * no-ops to console.error so nothing is silently swallowed locally or in an
 * environment without a DSN configured.
 */
export function reportError(error: unknown, context?: Record<string, unknown>): void {
  if (!dsn) {
    console.error(error, context);
    return;
  }
  ensureInitialized();
  Sentry.captureException(error, context ? { extra: context } : undefined);
}
