import { httpClient } from '@/lib/http/client';

export const viewerTrackingService = {
  join(eventId: string, sessionId: string, cameraId: string, visitId: string): Promise<void> {
    return httpClient
      .post(`/events/${eventId}/viewers/join`, { sessionId, cameraId, visitId })
      .then(() => {}, () => {});
  },

  heartbeat(eventId: string, sessionId: string): Promise<void> {
    return httpClient
      .post(`/events/${eventId}/viewers/heartbeat`, { sessionId })
      .then(() => {}, () => {});
  },

  leave(eventId: string, sessionId: string): Promise<void> {
    // Use keepalive to ensure the request completes even on page unload.
    // Note: navigator.sendBeacon() cannot include custom headers (like
    // Authorization), so we keep fetch with keepalive. The backend accepts
    // anonymous leave only where the event allows it (via OptionalJwtStrictGuard).
    return fetch(`${httpClient.defaults.baseURL}/events/${eventId}/viewers/leave`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getTokenForKeepAlive()}` },
      body: JSON.stringify({ sessionId }),
      keepalive: true,
    }).then(() => {}, () => {});
  },

  async getViewers(eventId: string): Promise<{ currentViewers: number; totalViews: number }> {
    try {
      const res = await httpClient.get(`/events/${eventId}/viewers`);
      return res.data;
    } catch {
      return { currentViewers: 0, totalViews: 0 };
    }
  },
};

// Helper to extract token for keepalive requests where interceptors don't run.
function getTokenForKeepAlive(): string {
  try {
    const stored = localStorage.getItem('token');
    return stored || '';
  } catch {
    return '';
  }
}
