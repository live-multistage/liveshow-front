import { httpClient } from '@/lib/http/client';
import type { OrderResponse } from '../types/ticket.types';

export const ticketingService = {
  getMyOrders: async (): Promise<OrderResponse[]> => {
    const { data } = await httpClient.get<OrderResponse[]>('/orders/mine');
    return data;
  },
};
