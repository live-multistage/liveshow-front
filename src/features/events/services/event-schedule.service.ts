import { httpClient } from '@/lib/http/client';
import type { EventScheduleItem, EventScheduleItemInput } from '@live-show/api-contracts';

export const eventScheduleService = {
  getSchedule: async (eventId: string): Promise<EventScheduleItem[]> => {
    const { data } = await httpClient.get<EventScheduleItem[]>(`/events/${eventId}/schedule`);
    return data;
  },

  replaceSchedule: async (eventId: string, items: EventScheduleItemInput[]): Promise<void> => {
    await httpClient.put(`/events/${eventId}/schedule`, { items });
  },
};
