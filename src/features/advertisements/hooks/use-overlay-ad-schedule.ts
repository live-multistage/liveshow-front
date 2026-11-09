'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { advertisementsService } from '../services/advertisements.service';
import type { ServedAd, ServeOverlayResponse } from '../types/advertisement.types';

// Sem resposta do servidor não há ritmo a seguir: espera uma hora, o mesmo
// que ele manda com o kill switch desligado, em vez de insistir.
const FAILURE_RETRY_SEC = 3600;

// Pedido em voo por evento. O servidor grava o anúncio servido (e o conta no limite do
// espectador) assim que responde, então a resposta nunca pode ser descartada: se o efeito
// for refeito (StrictMode, remontagem, troca de `enabled`) com o pedido ainda no ar, a
// montagem viva reaproveita a mesma promessa em vez de pedir de novo.
const inFlight = new Map<string, Promise<ServeOverlayResponse>>();

function serveOnce(eventId: string, watchedSec: number): Promise<ServeOverlayResponse> {
  const pending = inFlight.get(eventId);
  if (pending) return pending;
  const request = advertisementsService.serveOverlay(eventId, watchedSec).finally(() => {
    if (inFlight.get(eventId) === request) inFlight.delete(eventId);
  });
  inFlight.set(eventId, request);
  return request;
}

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
        const res = await serveOnce(eventId, watchedSec);
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
