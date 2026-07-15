'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Tv2, RotateCcw, CheckCircle2 } from 'lucide-react';
import { formatPrice } from '../../utils/event-formatters';
import { useServiceFeeRateQuery } from '../../queries/get-event';
import type { EventResponse, TicketProductResponse } from '../../types/event.types';
import { useTranslations } from 'next-intl';
import { useAddToCartMutation, useCartQuery } from '@/features/cart';
import { Button } from '@/shared/components/Button';
import { useAuth } from '@/features/account';
import { trackCartAdd } from '@/features/cart/hooks/use-track-cart';
import {
  useLiveAccessQuery,
  useReplayAccessQuery,
  useLivePlaybackQuery,
} from '@/features/streaming/queries/live.queries';
import { useClaimFreeTicketMutation } from '@/features/streaming/mutations/free-ticket.mutations';
import styles from './TicketPanel.module.scss';

interface Props {
  event: EventResponse;
  tickets: TicketProductResponse[];
}

export function TicketPanel({ event, tickets }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(tickets[0]?.id ?? null);
  const [pendingAction, setPendingAction] = useState<'cart' | 'buy' | null>(null);
  const addToCart = useAddToCartMutation();
  const { isLoggedIn, user } = useAuth();
  const { data: cart } = useCartQuery();
  const isTicketInCart = (ticketId: string) =>
    isLoggedIn && (cart?.items.some((i) => i.ticketProductId === ticketId) ?? false);
  const t = useTranslations('ticketPanel');
  const { data: serviceFeeRate = 0 } = useServiceFeeRateQuery(event.id);

  const liveAccess = useLiveAccessQuery(event.id, isLoggedIn);
  const replayAccess = useReplayAccessQuery(event.id, isLoggedIn);

  const isLive = event.status === 'LIVE';
  const isFinished = event.status === 'FINISHED';

  const purchasableTickets = isFinished
    ? tickets.filter((t) => t.capabilities.includes('REPLAY_VIEW'))
    : tickets;

  const ticket = purchasableTickets.find((t) => t.id === selected) ?? purchasableTickets[0];
  // Both re-entry checks key off the selected ticket product id (the cart stores ticketProductId).
  const isInCart = ticket ? isTicketInCart(ticket.id) : false;

  const ownsLive = liveAccess.data === true;
  const ownsReplay = replayAccess.data === true;
  const owns = isLoggedIn && (ownsLive || ownsReplay);
  const accessLoading = isLoggedIn && (liveAccess.isLoading || replayAccess.isLoading);

  const claimFreeTicket = useClaimFreeTicketMutation(event.id);

  const playback = useLivePlaybackQuery(event.id, ownsLive);
  const liveNow = playback.data?.live === true;

  // fee = rate × price, rounded half-up to cents — must match checkout's charge.
  const serviceFee = ticket ? Math.round(ticket.price * serviceFeeRate * 100) / 100 : 0;

  // Mobile sticky buy bar: only rendered in the purchase state below, hidden
  // while the panel itself is on screen.
  const showPurchaseUI =
    event.status !== 'CANCELLED' && !accessLoading && !owns && !event.isFree && purchasableTickets.length > 0;
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelInView, setPanelInView] = useState(true);
  useEffect(() => {
    const el = panelRef.current;
    if (!showPurchaseUI || !el) return;
    const obs = new IntersectionObserver(([entry]) => setPanelInView(entry.isIntersecting));
    obs.observe(el);
    return () => obs.disconnect();
  }, [showPurchaseUI]);

  const scrollToPanel = () => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    panelRef.current?.scrollIntoView({ behavior: reduced ? 'instant' : 'smooth', block: 'center' });
  };

  if (event.status === 'CANCELLED') {
    return (
      <div className={styles.panel}>
        <div className={styles.glow} aria-hidden />
        <div className={styles.panelContent}>
          <p className={styles.empty}>{t('cancelled')}</p>
        </div>
      </div>
    );
  }

  if (accessLoading) {
    return (
      <div className={styles.panel}>
        <div className={styles.glow} aria-hidden />
        <div className={styles.panelContent}>
          <p className={styles.empty}>{t('verifyingAccess')}</p>
        </div>
      </div>
    );
  }

  if (owns) {
    return (
      <div className={styles.panel}>
        <div className={styles.glow} aria-hidden />
        <div className={styles.panelContent}>
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
                href={`/live/${event.id}`}
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
                href={`/replay/${event.id}`}
              >
                {t('watchReplay')}
              </Button>
              <p className={styles.ownedNote}>{t('replayAvailable')}</p>
            </>
          ) : (
            <p className={styles.ownedNote}>{t('alreadyHaveAccess')}</p>
          )}
        </div>
      </div>
    );
  }

  if (event.isFree) {
    return (
      <div className={styles.panel}>
        <div className={styles.glow} aria-hidden />
        <div className={styles.panelContent}>
          <p className={styles.panelLabel}>{t('freeEvent')}</p>
          <Button
            variant="primary"
            fullWidth
            className={styles.ticketAction}
            disabled={claimFreeTicket.isPending}
            onClick={() => {
              if (!isLoggedIn) {
                router.push(`/login?next=/events/${event.id}`);
                return;
              }
              claimFreeTicket.mutate();
            }}
          >
            {claimFreeTicket.isPending ? t('adding') : t('watchNow')}
          </Button>
        </div>
      </div>
    );
  }

  if (purchasableTickets.length === 0) {
    return (
      <div className={styles.panel}>
        <div className={styles.glow} aria-hidden />
        <div className={styles.panelContent}>
          <p className={styles.empty}>
            {isFinished ? t('noReplay') : t('noTickets')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.panel} ref={panelRef}>
      <div className={styles.glow} aria-hidden />
      <div className={styles.panelContent}>
        <div className={styles.panelLabel}>
          {isFinished ? t('buyReplay') : t('buyTicket')}
        </div>

        <div className={styles.ticketOptions}>
          {purchasableTickets.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setSelected(opt.id)}
              className={`${styles.ticketOption} ${selected === opt.id ? styles.ticketOptionSelected : styles.ticketOptionDefault}`}
            >
              <div className={styles.ticketOptionHeader}>
                <span className={styles.ticketOptionName}>{opt.name}</span>
                <span className={styles.ticketOptionPrice}>{formatPrice(opt.price)}</span>
              </div>
              <div className={styles.tierChips}>
                {opt.capabilities.includes('LIVE_VIEW') && <span className={styles.tierChip}>AO VIVO</span>}
                {opt.capabilities.includes('REPLAY_VIEW') && <span className={styles.tierChip}>REPRISE</span>}
                {opt.camerasLimit != null
                  ? <span className={styles.tierChip}>{opt.camerasLimit} CÂMERAS</span>
                  : opt.capabilities.includes('CAMERA_VIEW') && <span className={styles.tierChip}>TODAS AS CÂMERAS</span>}
              </div>
              {opt.description && (
                <p className={styles.ticketOptionDesc}>{opt.description}</p>
              )}
            </button>
          ))}
        </div>

        <div className={styles.divider} />

        {ticket && (
          <>
            <div className={styles.feeLines}>
              <div className={styles.feeLine}>
                <span>Ingresso</span>
                <span>{formatPrice(ticket.price)}</span>
              </div>
              <div className={styles.feeLine}>
                <span>Taxa de serviço</span>
                <span>{formatPrice(serviceFee)}</span>
              </div>
            </div>
            <div className={styles.totalRow}>
              <span className={styles.totalLabel}>Total</span>
              <div className={styles.totalRight}>
                <span className={styles.currency}>BRL</span>
                <span className={styles.totalAmount}>{formatPrice(ticket.price + serviceFee)}</span>
              </div>
            </div>
            <p className={styles.totalNote}>{t('validFor')}</p>
          </>
        )}

        <button
          className={styles.buyBtn}
          disabled={pendingAction === 'buy'}
          onClick={() => {
            if (!ticket) return;
            if (!isLoggedIn) {
              router.push(`/login?next=/events/${event.id}/checkout?ticketId=${ticket.id}`);
              return;
            }
            if (isTicketInCart(ticket.id)) {
              router.push('/checkout');
              return;
            }
            setPendingAction('buy');
            addToCart.mutate(ticket.id, {
              onSuccess: () => {
                trackCartAdd(event.id, ticket.id, ticket.price, user?.id);
                router.push('/checkout');
              },
              onSettled: () => setPendingAction(null),
            });
          }}
        >
          {pendingAction === 'buy' ? (
            <><span className={styles.btnSpinner} />{t('adding')}</>
          ) : (
            <>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2 2 2 0 0 0 0 4 2 2 0 0 1-2 2H5a2 2 0 0 1-2-2 2 2 0 0 0 0-4Z"/>
              </svg>
              {isFinished ? t('buyReplay') : t('buyTicket')}
            </>
          )}
        </button>

        <button
          className={styles.cartBtn}
          disabled={addToCart.isPending || isInCart}
          onClick={() => {
            if (!ticket) return;
            if (!isLoggedIn) { router.push('/login'); return; }
            setPendingAction('cart');
            addToCart.mutate(ticket.id, {
              onSuccess: () => trackCartAdd(event.id, ticket.id, ticket.price, user?.id),
              onSettled: () => setPendingAction(null),
            });
          }}
        >
          {pendingAction === 'cart' ? (
            <><span className={styles.btnSpinner} />{t('adding')}</>
          ) : isInCart ? (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              {t('alreadyInCart')}
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 4h2l2.5 12h11l2-8H6.5"/>
                <circle cx="9" cy="20" r="1.4"/>
                <circle cx="18" cy="20" r="1.4"/>
              </svg>
              {t('addToCart')}
            </>
          )}
        </button>

        {isLive && (
          <div className={styles.demoLink}>
            <Link href={`/live/${event.id}`} className={styles.demoBtn}>
              {t('freePreview')}
            </Link>
          </div>
        )}

        <div className={styles.secureNote}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z"/>
            <path d="M9 12l2 2 4-4"/>
          </svg>
          COMPRA 100% SEGURA
        </div>
      </div>

      {/* Mobile-only (≤859px via CSS) sticky buy bar; hidden while the panel is on screen. */}
      {ticket && !panelInView && (
        <div className={styles.mobileBar}>
          <div>
            <span className={styles.mobileBarLabel}>{isFinished ? 'REPRISE' : 'INGRESSO'}</span>
            <span className={styles.mobileBarAmount}>{formatPrice(ticket.price)}</span>
          </div>
          <button className={styles.mobileBarBtn} onClick={scrollToPanel}>
            Comprar ingresso
          </button>
        </div>
      )}
    </div>
  );
}
