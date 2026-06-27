import { config } from '@/config';
import { tokenStore } from '@/lib/auth/token-store';

const SESSION_KEY = 'ls_session_id';

function getSessionId(): string {
  if (typeof window === 'undefined') return 'ssr';
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

type TrackParams = {
  eventType: string;
  entityType?: string;
  entityId?: string;
  properties?: Record<string, unknown>;
  userId?: string;
};

export function track(params: TrackParams): void {
  if (typeof window === 'undefined') return; // skip SSR

  const sessionId = getSessionId();
  const deviceType = /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop';

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-session-id': sessionId,
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
