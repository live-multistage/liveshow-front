'use client';

import { useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { advertisementsService } from '../services/advertisements.service';
import type { ServedAd } from '../types/advertisement.types';

const seenKey = (eventId: string) => `preroll:${eventId}`;

function alreadySeen(eventId: string): boolean {
  try {
    return sessionStorage.getItem(seenKey(eventId)) !== null;
  } catch {
    return true; // storage indisponível: melhor não repetir anúncio do que arriscar loop
  }
}

export function usePrerollGate(eventId: string) {
  const [seen] = useState(() => alreadySeen(eventId));

  const query = useQuery({
    queryKey: ['ads', 'serve', 'PRE_ROLL', eventId],
    queryFn: () => advertisementsService.serve('PRE_ROLL', 1, eventId),
    enabled: !seen,
    staleTime: Infinity,
    retry: false,
  });

  const markSeen = useCallback(() => {
    try {
      sessionStorage.setItem(seenKey(eventId), '1');
    } catch {
      // ignore
    }
  }, [eventId]);

  const served = query.data?.[0];
  const ad = !seen && served?.videoUrl ? served : null;
  return { ad, pending: !seen && query.isLoading, markSeen };
}
