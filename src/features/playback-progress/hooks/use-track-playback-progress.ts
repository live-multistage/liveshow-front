'use client';

import { useCallback, useEffect, useRef } from 'react';
import { playbackProgressService } from '../services/playback-progress.service';

/**
 * De quanto em quanto tempo a posição sobe para o servidor.
 *
 * O <video> dispara `timeupdate` ~4x por segundo; mandar cada um seria um DDoS
 * do próprio player. Dez segundos é o pior caso de perda se a aba morrer sem
 * aviso — e a saída limpa é coberta pelo flush do `pagehide` abaixo.
 */
const REPORT_INTERVAL_MS = 10_000;

/** Abaixo disto não vale gravar: ninguém quer retomar 3s dentro do vídeo. */
const MIN_REPORTABLE_SECONDS = 5;

interface Options {
  eventId: string;
  /** Só replay tem posição estável para retomar; ao vivo a timeline desliza. */
  enabled: boolean;
}

export function useTrackPlaybackProgress({ eventId, enabled }: Options) {
  // Refs, não estado: isto é atualizado a cada timeupdate e um setState aqui
  // re-renderizaria o player inteiro quatro vezes por segundo.
  const latest = useRef({ position: 0, duration: 0 });
  const lastSentAt = useRef(0);

  const flush = useCallback(() => {
    const { position, duration } = latest.current;
    if (!enabled || position < MIN_REPORTABLE_SECONDS || duration <= 0) return;

    void playbackProgressService
      .save({
        eventId,
        positionSeconds: Math.floor(position),
        durationSeconds: Math.floor(duration),
      })
      // Progresso de reprodução não vale um toast: falhar em salvar custa ao
      // usuário reencontrar o ponto, não o acesso. Ruído aqui atrapalharia
      // mais que o próprio erro.
      .catch(() => {});
  }, [enabled, eventId]);

  const report = useCallback(
    (position: number, duration: number) => {
      latest.current = { position, duration };
      const now = Date.now();
      if (now - lastSentAt.current < REPORT_INTERVAL_MS) return;
      lastSentAt.current = now;
      flush();
    },
    [flush],
  );

  useEffect(() => {
    if (!enabled) return;

    // `pagehide` e não `beforeunload`: este dispara também quando a aba vai
    // para o bfcache ou o app é enviado para segundo plano no mobile, que é
    // como a maioria das sessões de fato termina.
    const onHide = () => flush();
    window.addEventListener('pagehide', onHide);

    return () => {
      window.removeEventListener('pagehide', onHide);
      // Sair do player é o momento mais provável de todos; grava sem esperar
      // o próximo tick do intervalo.
      flush();
    };
  }, [enabled, flush]);

  return { report };
}
