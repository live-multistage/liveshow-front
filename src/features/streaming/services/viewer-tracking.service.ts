import { httpClient } from '@/lib/http/client';
import { tokenStore } from '@/lib/auth/token-store';

export const viewerTrackingService = {
  join(eventId: string, sessionId: string, cameraId: string, visitId: string): Promise<void> {
    return httpClient
      .post(`/events/${eventId}/viewers/join`, { sessionId, cameraId, visitId })
      .then(() => {}, () => {});
  },

  heartbeat(eventId: string, sessionId: string): Promise<number> {
    return httpClient
      .post(`/events/${eventId}/viewers/heartbeat`, { sessionId })
      .then(
        (res) => res.status,
        (err) => err?.response?.status ?? 0,
      );
  },

  leave(eventId: string, sessionId: string): Promise<void> {
    // Use keepalive to ensure the request completes even on page unload.
    // Note: navigator.sendBeacon() cannot include custom headers (like
    // Authorization), so we keep fetch with keepalive. Include the Bearer
    // token from tokenStore if available; backend accepts anonymous leave
    // where the event allows it (via OptionalJwtStrictGuard).
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = tokenStore.get();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return fetch(`${httpClient.defaults.baseURL}/events/${eventId}/viewers/leave`, {
      method: 'POST',
      headers,
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
