import type { TrackingContext } from '@live-show/api-contracts';

export const SDK_VERSION = '0.1.0';
const LIBRARY = { name: '@live-show/analytics-sdk', version: SDK_VERSION };

/** Rewrites a page URL before it is recorded, e.g. to redact secret path segments (`/invitations/<token>`). */
export type UrlSanitizer = (url: URL) => URL;

// Query strings routinely carry secrets (?token= on reset/verify/unsubscribe links) and
// messages are stored, shown in the debugger and forwarded to webhooks — so only campaign
// params survive; the hash is dropped for the same reason.
function sanitizePageUrl(href: string, sanitizeUrl?: UrlSanitizer): URL {
  const url = new URL(href);
  const utm = [...url.searchParams].filter(([k]) => k.startsWith('utm_'));
  url.search = new URLSearchParams(utm).toString();
  url.hash = '';
  return sanitizeUrl ? sanitizeUrl(url) : url;
}

function referrerOrigin(referrer: string): string | undefined {
  if (!referrer) return undefined;
  try {
    return new URL(referrer).origin;
  } catch {
    return undefined;
  }
}

export function buildContext(sessionId: string, sanitizeUrl?: UrlSanitizer): TrackingContext {
  if (typeof window === 'undefined') {
    return { library: LIBRARY, sessionId };
  }
  const url = sanitizePageUrl(location.href, sanitizeUrl);
  return {
    library: LIBRARY,
    page: {
      path: url.pathname,
      url: url.href,
      referrer: referrerOrigin(document.referrer),
      title: document.title || undefined,
      search: url.search || undefined,
    },
    locale: navigator.language,
    userAgent: navigator.userAgent,
    screen: { width: screen.width, height: screen.height },
    sessionId,
  };
}
