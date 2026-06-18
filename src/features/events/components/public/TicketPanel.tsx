'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Ticket, Tv2, RotateCcw, CheckCircle2, ShoppingCart } from 'lucide-react';
import { formatPrice } from '../../utils/event-formatters';
import type { EventResponse, TicketProductResponse } from '../../types/event.types';
import { useTranslations } from 'next-intl';
import { useAddToCartMutation } from '@/features/cart';
import { Button } from '@/shared/components/Button';
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
  const [pendingAction, setPendingAction] = useState<'buy' | 'cart' | null>(null);
  const addToCart = useAddToCartMutation();
  const { isLoggedIn } = useAuth();
  const t = useTranslations('ticketPanel');

  // Entitlement checks (JWT-only) — skipped when logged out.
  const liveAccess = useLiveAccessQuery(event.id, isLoggedIn);
  const replayAccess = useReplayAccessQuery(event.id, isLoggedIn);

  const isLive = event.status === 'LIVE';
  const isFinished = event.status === 'FINISHED';

  // Finished events: only show tickets that include replay — live-only tickets are no longer useful.
  const purchasableTickets = isFinished
    ? tickets.filter((t) => t.capabilities.includes('REPLAY_VIEW'))
    : tickets;

  const ticket = purchasableTickets.find((t) => t.id === selected) ?? purchasableTickets[0];

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
        <h3 className={styles.panelTitle}>{t('title')}</h3>
        <p className={styles.empty}>{t('cancelled')}</p>
      </div>
    );
  }

  // Avoid flashing the buy panel to an owner while entitlement resolves.
  if (accessLoading) {
    return (
      <div className={styles.panel}>
        <h3 className={styles.panelTitle}>{t('title')}</h3>
        <p className={styles.empty}>{t('verifyingAccess')}</p>
      </div>
    );
  }

  // Owner: surface access to the transmission instead of the purchase flow.
  if (owns) {
    return (
      <div className={styles.panel}>
        <div className={styles.ownedBadge}>
          <CheckCircle2 size={18} /> {t('ticketSecured')}
        </div>
        {liveNow ? (
          <>
            <Button
              variant="primary"
              fullWidth
              icon={<Tv2 size={16} />}
              className={styles.ticketAction}
              onClick={() => router.push(`/live/${event.id}`)}
            >
              {t('watchNow')}
            </Button>
            <p className={styles.ownedNote}>{t('streamIsLive')}</p>
          </>
        ) : isFinished && ownsReplay ? (
          <>
            <Button
              variant="primary"
              fullWidth
              icon={<RotateCcw size={16} />}
              className={styles.ticketAction}
              onClick={() => router.push(`/replay/${event.id}`)}
            >
              {t('watchReplay')}
            </Button>
            <p className={styles.ownedNote}>{t('replayAvailable')}</p>
          </>
        ) : (
          <p className={styles.ownedNote}>{t('alreadyHaveAccess')}</p>
        )}
      </div>
    );
  }

  if (purchasableTickets.length === 0) {
    return (
      <div className={styles.panel}>
        <h3 className={styles.panelTitle}>{t('title')}</h3>
        <p className={styles.empty}>
          {isFinished ? t('noReplay') : t('noTickets')}
        </p>
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      <h3 className={styles.panelTitle}>{isFinished ? t('buyReplay') : t('buyTicket')}</h3>
      <div className={styles.ticketOptions}>
        {purchasableTickets.map((opt) => (
          <button key={opt.id} onClick={() => setSelected(opt.id)}
            className={`${styles.ticketOption} ${selected === opt.id ? styles.ticketOptionSelected : ''}`}>
            <div className={styles.ticketOptionInner}>
              <div>
                <p className={`${styles.ticketOptionName} ${selected === opt.id ? styles.ticketOptionNameSelected : ''}`}>
                  {opt.name}
                </p>
                <p className={styles.ticketOptionDesc}>{opt.description}</p>
              </div>
              <p className={styles.ticketOptionPrice}>{formatPrice(opt.price)}</p>
            </div>
          </button>
        ))}
      </div>
      {ticket && (
        <div className={styles.totalRow}>
          <div className={styles.totalLine}>
            <span className={styles.totalLabel}>{t('total')}</span>
            <span className={styles.totalPrice}>{formatPrice(ticket.price)}</span>
          </div>
          <p className={styles.totalNote}>{t('validFor')}</p>
        </div>
      )}
      <Button
        variant="primary"
        fullWidth
        isLoading={pendingAction === 'buy'}
        loadingLabel={t('adding')}
        icon={<Ticket size={16} />}
        disabled={addToCart.isPending}
        className={styles.ticketAction}
        onClick={() => {
          if (!ticket) return;
          if (!isLoggedIn) { router.push('/login'); return; }
          setPendingAction('buy');
          addToCart.mutate(ticket.id, {
            onSuccess: () => router.push('/cart'),
            onSettled: () => setPendingAction(null),
          });
        }}
      >
        {isFinished ? t('buyReplay') : t('buyTicket')}
      </Button>
      <Button
        variant="outline"
        fullWidth
        isLoading={pendingAction === 'cart'}
        loadingLabel={t('adding')}
        icon={<ShoppingCart size={16} />}
        disabled={addToCart.isPending}
        className={styles.ticketAction}
        onClick={() => {
          if (!ticket) return;
          if (!isLoggedIn) { router.push('/login'); return; }
          setPendingAction('cart');
          addToCart.mutate(ticket.id, {
            onSettled: () => setPendingAction(null),
          });
        }}
      >
        {t('addToCart')}
      </Button>
      {isLive && (
        <div className={styles.demoLink}>
          <button onClick={() => router.push(`/live/${event.id}`)} className={styles.demoBtn}>
            {t('freePreview')}
          </button>
        </div>
      )}
    </div>
  );
}
