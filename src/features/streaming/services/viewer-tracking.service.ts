import { config } from '@/config';

const base = () => config.apiUrl;

export const viewerTrackingService = {
  join(eventId: string, sessionId: string, userId?: string | null): Promise<void> {
    return fetch(`${base()}/events/${eventId}/viewers/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, userId: userId ?? undefined }),
    }).then(() => {}, () => {});
  },

  heartbeat(eventId: string, sessionId: string): Promise<Response> {
    return fetch(`${base()}/events/${eventId}/viewers/heartbeat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    });
  },

  leave(eventId: string, sessionId: string): Promise<void> {
    return fetch(`${base()}/events/${eventId}/viewers/leave`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
      keepalive: true,
    }).then(() => {}, () => {});
  },

  async getViewers(eventId: string): Promise<{ currentViewers: number; totalViews: number }> {
    const res = await fetch(`${base()}/events/${eventId}/viewers`);
    if (!res.ok) return { currentViewers: 0, totalViews: 0 };
    return res.json();
  },
};
