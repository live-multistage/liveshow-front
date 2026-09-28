import type { TrackingContext } from '@live-show/api-contracts';

export const SDK_VERSION = '0.1.0';
const LIBRARY = { name: '@live-show/analytics-sdk', version: SDK_VERSION };

export function buildContext(sessionId: string): TrackingContext {
  if (typeof window === 'undefined') {
    return { library: LIBRARY, sessionId };
  }
  return {
    library: LIBRARY,
    page: {
      path: location.pathname,
      url: location.href,
      referrer: document.referrer || undefined,
      title: document.title || undefined,
      search: location.search || undefined,
    },
    locale: navigator.language,
    userAgent: navigator.userAgent,
    screen: { width: screen.width, height: screen.height },
    sessionId,
  };
}
