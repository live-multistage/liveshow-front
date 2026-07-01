import { httpClient } from '@/lib/http/client';
import type { SalesSummary, SalesGranularity, EventSalesResult } from '../types/sales.types';
import type { EventMetricsResult } from '../types/analytics.types';
import type { ViewerAnalyticsResult } from '../types/viewer-analytics.types';

export const analyticsService = {
  getMySales: async (granularity: SalesGranularity): Promise<SalesSummary> => {
    const { data } = await httpClient.get<SalesSummary>('/sales/mine', { params: { granularity } });
    return data;
  },
  getEventSales: async (): Promise<EventSalesResult> => {
    const { data } = await httpClient.get<EventSalesResult>('/sales/events');
    return data;
  },
  getEventMetrics: async (eventId: string): Promise<EventMetricsResult> => {
    const { data } = await httpClient.get<EventMetricsResult>(`/analytics/events/${eventId}/metrics`);
    return data;
  },
  getViewerAnalytics: async (orgId: string, eventId: string): Promise<ViewerAnalyticsResult> => {
    const { data } = await httpClient.get<ViewerAnalyticsResult>(
      `/organizations/${orgId}/events/${eventId}/analytics/viewers`,
    );
    return data;
  },
};
