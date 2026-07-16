import { httpClient } from '@/lib/http/client';
import type {
  OrderResponse,
  EntryPassResponse,
  CheckInResponse,
  CheckInSummaryResponse,
  GateableEvent,
} from '../types/ticket.types';

export const ticketingService = {
  getMyOrders: async (): Promise<OrderResponse[]> => {
    const { data } = await httpClient.get<OrderResponse[]>('/orders/mine');
    return data;
  },

  getEntryPass: async (eventId: string): Promise<EntryPassResponse> => {
    const { data } = await httpClient.get<EntryPassResponse>(`/shows/${eventId}/entry-pass`);
    return data;
  },

  checkIn: async (
    eventId: string,
    body: { grantId?: string; entryCode?: string },
  ): Promise<CheckInResponse> => {
    const { data } = await httpClient.post<CheckInResponse>(`/shows/${eventId}/check-in`, body);
    return data;
  },

  getCheckInSummary: async (eventId: string): Promise<CheckInSummaryResponse> => {
    const { data } = await httpClient.get<CheckInSummaryResponse>(`/shows/${eventId}/check-in/summary`);
    return data;
  },

  getEntryPassPublicKey: async (): Promise<{ algorithm: string; publicKeyPem: string }> => {
    const { data } = await httpClient.get<{ algorithm: string; publicKeyPem: string }>(
      '/ticketing/entry-pass/public-key',
    );
    return data;
  },

  getGateableEvents: async (): Promise<GateableEvent[]> => {
    const { data } = await httpClient.get<GateableEvent[]>('/ticketing/check-in/events');
    return data;
  },
};
