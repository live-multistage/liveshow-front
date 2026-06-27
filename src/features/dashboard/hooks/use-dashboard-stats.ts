'use client';

import { useMemo } from 'react';
import { useMyEventsQuery } from '@/features/events/queries/get-my-events';
import type { EventResponse } from '@/features/events/types/event.types';

export interface DashboardStats {
  totalEvents: number;
  liveNow: number;
  upcoming: number;
  drafts: number;
  finished: number;
  events: EventResponse[];
  recentEvents: EventResponse[];
  isLoading: boolean;
  isError: boolean;
}

export function useDashboardStats(): DashboardStats {
  const { data: events = [], isLoading, isError } = useMyEventsQuery();

  return useMemo(() => {
    const now = new Date();
    const recentEvents = [...events]
      .sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime())
      .slice(0, 5);

    return {
      totalEvents: events.length,
      liveNow: events.filter((e) => e.status === 'LIVE').length,
      upcoming: events.filter(
        (e) => (e.status === 'PUBLISHED' || e.status === 'SCHEDULED') && new Date(e.startsAt) > now,
      ).length,
      drafts: events.filter((e) => e.status === 'DRAFT').length,
      finished: events.filter((e) => e.status === 'FINISHED').length,
      events,
      recentEvents,
      isLoading,
      isError,
    };
  }, [events, isLoading, isError]);
}
