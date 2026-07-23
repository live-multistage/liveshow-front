import { config } from '@/config';
import { tokenStore } from '@/lib/auth/token-store';
import { getSessionId } from './session-id';
import { hasAnalyticsConsent } from './consent';

type TrackParams = {
  eventType: string;
  entityType?: string;
  entityId?: string;
  properties?: Record<string, unknown>;
  userId?: string;
};

export function track(params: TrackParams): void {
  if (typeof window === 'undefined') return; // skip SSR
  // LGPD: no behavioral analytics/profiling without opt-in consent.
  if (!hasAnalyticsConsent()) return;

  const sessionId = getSessionId();
  const deviceType = /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop';

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-session-id': sessionId,
    'x-analytics-consent': 'granted', // gate above guarantees consent here
  };

  const token = tokenStore.get();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  fetch(`${config.apiUrl}/v1/analytics/events`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      ...params,
      sessionId,
      deviceType,
    }),
    keepalive: true, // survives page unload
  }).catch(() => {}); // silent fail
}
