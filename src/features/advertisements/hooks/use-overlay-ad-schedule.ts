'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { advertisementsService } from '../services/advertisements.service';
import type { ServedAd } from '../types/advertisement.types';

// Sem resposta do servidor não há ritmo a seguir: espera uma hora, o mesmo
// que ele manda com o kill switch desligado, em vez de insistir.
const FAILURE_RETRY_SEC = 3600;

interface Options {
  // false = nunca pergunta (anúncios desligados, preview, transmissão fora do ar).
  enabled?: boolean;
}

// Agenda da vitrine: pergunta ao servidor, guarda o anúncio devolvido e só
// pergunta de novo depois de `retryAfterSec`, venha anúncio ou não. O servidor
// é quem sabe os limites; o cliente só informa há quanto tempo assiste.
export function useOverlayAdSchedule(eventId: string, { enabled = true }: Options = {}) {
  const [ad, setAd] = useState<ServedAd | null>(null);
  const dismiss = useCallback(() => setAd(null), []);
  // Tempo assistido desde a montagem do player, não desde a última vez que `enabled` virou true.
  const mountedAt = useRef(Date.now());

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const ask = async () => {
      let retryAfterSec = FAILURE_RETRY_SEC;
      try {
        const watchedSec = Math.floor((Date.now() - mountedAt.current) / 1000);
        const res = await advertisementsService.serveOverlay(eventId, watchedSec);
        if (cancelled) return;
        retryAfterSec = res.retryAfterSec;
        if (res.ad) setAd(res.ad);
      } catch {
        if (cancelled) return;
      }
      timer = setTimeout(ask, retryAfterSec * 1000);
    };

    void ask();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [eventId, enabled]);

  return { ad, dismiss };
}
