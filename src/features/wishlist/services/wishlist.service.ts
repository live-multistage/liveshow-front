import { httpClient } from '@/lib/http/client';
import type { WishlistItem } from '../types/wishlist.types';

export const wishlistService = {
  list: async (): Promise<WishlistItem[]> => {
    const { data } = await httpClient.get<WishlistItem[]>('/me/wishlist');
    return data;
  },

  listIds: async (): Promise<string[]> => {
    const { data } = await httpClient.get<string[]>('/me/wishlist/ids');
    return data;
  },

  add: async (eventId: string): Promise<void> => {
    await httpClient.post('/me/wishlist', { eventId });
  },

  remove: async (eventId: string): Promise<void> => {
    await httpClient.delete(`/me/wishlist/${eventId}`);
  },
};
