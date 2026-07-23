import { httpClient } from '@/lib/http/client';
import { tokenStore } from '@/lib/auth/token-store';

// LGPD data-subject actions. Consent sync is best-effort: anonymous visitors
// have no account to persist against, so a 401 is silently ignored — their
// choice still lives in localStorage and gates the client.
export const privacyService = {
  async syncConsent(granted: boolean): Promise<void> {
    if (!tokenStore.get()) return;
    await httpClient.patch('/privacy/consent', { analyticsConsent: granted }).catch(() => {});
  },

  async exportData(): Promise<Record<string, unknown>> {
    const { data } = await httpClient.get<Record<string, unknown>>('/privacy/export');
    return data;
  },

  async deleteAnalyticsData(): Promise<{ deletedEvents: number; deletedViewRecords: number }> {
    const { data } = await httpClient.delete<{ deletedEvents: number; deletedViewRecords: number }>(
      '/privacy/analytics-data',
    );
    return data;
  },
};
