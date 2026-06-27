import { httpClient } from '@/lib/http/client';
import type { SalesSummary, SalesGranularity, EventSalesResult } from '../types/sales.types';

export const analyticsService = {
  getMySales: async (granularity: SalesGranularity): Promise<SalesSummary> => {
    const { data } = await httpClient.get<SalesSummary>('/sales/mine', { params: { granularity } });
    return data;
  },
  getEventSales: async (): Promise<EventSalesResult> => {
    const { data } = await httpClient.get<EventSalesResult>('/sales/events');
    return data;
  },
};
