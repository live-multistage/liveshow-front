'use client';

import { useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { advertisementsService } from '../services/advertisements.service';
import { SERVE_QUERY_CACHE } from '../queries/use-serve-ads';
import type { ServedAd } from '../types/advertisement.types';

const seenKey = (eventId: string) => `preroll:${eventId}`;

function alreadySeen(eventId: string): boolean {
  try {
    return sessionStorage.getItem(seenKey(eventId)) !== null;
  } catch {
    return true; // storage indisponível: melhor não repetir anúncio do que arriscar loop
  }
}

// `ready` = acesso concedido e transmissão no ar. Antes disso o serve não é
// pedido: o anúncio é um registro cobrável e não pode ser consumido por quem
// ainda nem vai ver o player.
export function usePrerollGate(eventId: string, adsEnabled = true, ready = true) {
  const [seen] = useState(() => alreadySeen(eventId));

  const query = useQuery({
    queryKey: ['ads', 'serve', 'PRE_ROLL', eventId],
    queryFn: () => advertisementsService.serve('PRE_ROLL', 1, eventId),
    enabled: adsEnabled && ready && !seen,
    ...SERVE_QUERY_CACHE,
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
  const ad = adsEnabled && ready && !seen && served?.videoUrl ? served : null;
  return { ad, pending: adsEnabled && ready && !seen && query.isLoading, markSeen };
}
