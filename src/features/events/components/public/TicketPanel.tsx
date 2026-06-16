'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Ticket, Tv2, RotateCcw, CheckCircle2 } from 'lucide-react';
import { formatPrice } from '../../utils/event-formatters';
import type { EventResponse, TicketProductResponse } from '../../types/event.types';
import { useAddToCartMutation } from '@/features/cart';
import { useAuth } from '@/features/account';
import {
  useLiveAccessQuery,
  useReplayAccessQuery,
  useLivePlaybackQuery,
} from '@/features/streaming/queries/live.queries';
import styles from './TicketPanel.module.scss';

interface Props {
  event: EventResponse;
  tickets: TicketProductResponse[];
}

export function TicketPanel({ event, tickets }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(tickets[0]?.id ?? null);
  const addToCart = useAddToCartMutation();
  const { isLoggedIn } = useAuth();

  // Entitlement checks (JWT-only) — skipped when logged out.
  const liveAccess = useLiveAccessQuery(event.id, isLoggedIn);
  const replayAccess = useReplayAccessQuery(event.id, isLoggedIn);

  const ticket = tickets.find((t) => t.id === selected) ?? tickets[0];
  const isLive = event.status === 'LIVE';
  const isFinished = event.status === 'FINISHED';

  const ownsLive = liveAccess.data === true;
  const ownsReplay = replayAccess.data === true;
  const owns = isLoggedIn && (ownsLive || ownsReplay);
  const accessLoading =
    isLoggedIn && (liveAccess.isLoading || replayAccess.isLoading);

  // Real liveness comes from the transmission (a LIVE stream with a RUNNING
  // transcode job), NOT event.status — which only flips on an explicit
  // "Start Event" admin action. Poll it for entitled-live viewers.
  const playback = useLivePlaybackQuery(event.id, ownsLive);
  const liveNow = playback.data?.live === true;

  if (event.status === 'CANCELLED') {
    return (
      <div className={styles.panel}>
        <h3 className={styles.panelTitle}>Ingresso</h3>
        <p className={styles.empty}>Este evento foi cancelado.</p>
      </div>
    );
  }

  // Avoid flashing the buy panel to an owner while entitlement resolves.
  if (accessLoading) {
    return (
      <div className={styles.panel}>
        <h3 className={styles.panelTitle}>Ingresso</h3>
        <p className={styles.empty}>Verificando seu acesso…</p>
      </div>
    );
  }

  // Owner: surface access to the transmission instead of the purchase flow.
  if (owns) {
    return (
      <div className={styles.panel}>
        <div className={styles.ownedBadge}>
          <CheckCircle2 size={18} /> Ingresso garantido
        </div>
        {liveNow ? (
          <>
            <button
              onClick={() => router.push(`/live/${event.id}`)}
              className={styles.btnPrimary}
            >
              <Tv2 size={16} /> Assistir agora
            </button>
            <p className={styles.ownedNote}>A transmissão está ao vivo.</p>
          </>
        ) : isFinished && ownsReplay ? (
          <>
            <button
              onClick={() => router.push(`/replay/${event.id}`)}
              className={styles.btnPrimary}
            >
              <RotateCcw size={16} /> Ver reprise
            </button>
            <p className={styles.ownedNote}>Reprise disponível.</p>
          </>
        ) : (
          <p className={styles.ownedNote}>
            Você já tem acesso. A transmissão aparecerá aqui quando começar.
          </p>
        )}
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className={styles.panel}>
        <h3 className={styles.panelTitle}>Ingresso</h3>
        <p className={styles.empty}>Nenhum ingresso disponível ainda.</p>
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      <h3 className={styles.panelTitle}>Comprar Ingresso</h3>
      <div className={styles.ticketOptions}>
        {tickets.map((t) => (
          <button key={t.id} onClick={() => setSelected(t.id)}
            className={`${styles.ticketOption} ${selected === t.id ? styles.ticketOptionSelected : ''}`}>
            <div className={styles.ticketOptionInner}>
              <div>
                <p className={`${styles.ticketOptionName} ${selected === t.id ? styles.ticketOptionNameSelected : ''}`}>
                  {t.name}
                </p>
                <p className={styles.ticketOptionDesc}>{t.description}</p>
              </div>
              <p className={styles.ticketOptionPrice}>{formatPrice(t.price)}</p>
            </div>
          </button>
        ))}
      </div>
      {ticket && (
        <div className={styles.totalRow}>
          <div className={styles.totalLine}>
            <span className={styles.totalLabel}>Total</span>
            <span className={styles.totalPrice}>{formatPrice(ticket.price)}</span>
          </div>
          <p className={styles.totalNote}>Acesso válido para uma pessoa</p>
        </div>
      )}
      <button
        onClick={() => {
          if (!ticket) return;
          if (!isLoggedIn) {
            router.push('/login');
            return;
          }
          // Server cart: send only the ticket id; the backend resolves the rest.
          addToCart.mutate(ticket.id, { onSuccess: () => router.push('/cart') });
        }}
        disabled={addToCart.isPending}
        className={styles.btnPrimary}
      >
        <Ticket size={16} /> {addToCart.isPending ? 'Adicionando…' : 'Comprar Ingresso'}
      </button>
      {isLive && (
        <div className={styles.demoLink}>
          <button onClick={() => router.push(`/live/${event.id}`)} className={styles.demoBtn}>
            Assistir demonstração gratuita →
          </button>
        </div>
      )}
    </div>
  );
}
