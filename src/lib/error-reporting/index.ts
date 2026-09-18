const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

// Lazy, idempotent: sentry.{client,server,edge}.config.ts only run once
// next.config.ts is wrapped with withSentryConfig (out of this phase's
// ownership) — until that wiring lands, this makes reportError work on its
// own wherever it's called from.
//
// The SDK is loaded with a dynamic import on the first report: a static import
// put ~240 KB of Sentry into the root layout bundle of every page, even though
// it is only ever needed once something has actually gone wrong.
let sentryPromise: Promise<typeof import('@sentry/nextjs')> | undefined;
function loadSentry() {
  sentryPromise ??= import('@sentry/nextjs').then((Sentry) => {
    Sentry.init({
      dsn,
      // Errors only — no performance tracing, no session replay.
      tracesSampleRate: 0,
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 0,
    });
    return Sentry;
  });
  return sentryPromise;
}

/**
 * Reports an error to Sentry when NEXT_PUBLIC_SENTRY_DSN is set; otherwise
 * no-ops to console.error so nothing is silently swallowed locally or in an
 * environment without a DSN configured. Fire-and-forget: callers don't await.
 */
export async function reportError(error: unknown, context?: Record<string, unknown>): Promise<void> {
  if (!dsn) {
    console.error(error, context);
    return;
  }
  try {
    const Sentry = await loadSentry();
    Sentry.captureException(error, context ? { extra: context } : undefined);
  } catch {
    // The reporter itself failing (chunk blocked by an ad blocker, offline)
    // must never surface as a second, unhandled error.
    console.error(error, context);
  }
}
