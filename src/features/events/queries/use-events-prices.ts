'use client';

import { useQueries } from '@tanstack/react-query';
import { eventsService } from '../services/events.service';
import { eventKeys } from './get-event';

export type PriceRange = { min: number; max: number };
export type PriceMap = Record<string, PriceRange | null>;

export function useEventsPriceMap(eventIds: string[]): PriceMap {
  return useQueries({
    queries: eventIds.map((id) => ({
      queryKey: eventKeys.tickets(id),
      queryFn: () => eventsService.listTicketProducts(id),
      staleTime: 5 * 60_000,
      enabled: eventIds.length > 0,
    })),
    combine: (results) => {
      const map: PriceMap = {};
      eventIds.forEach((id, i) => {
        const tickets = results[i]?.data;
        if (tickets && tickets.length > 0) {
          const prices = tickets.map((t) => t.price);
          map[id] = { min: Math.min(...prices), max: Math.max(...prices) };
        } else {
          map[id] = null;
        }
      });
      return map;
    },
  });
}
