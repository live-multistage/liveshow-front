'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Lock, Ticket, Camera, ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import { Navbar } from '@/shared/components/Navbar';
import {
  useGetEventQuery,
  useListTicketProductsQuery,
  formatPrice,
  formatPriceRange,
  formatDate,
  formatDuration,
} from '@/features/events';
import { useViewerCount } from '../hooks/use-viewer-count';
import styles from './LiveNoAccess.module.scss';

interface Props {
  eventId: string;
  eventTitle?: string;
  isLoggedIn: boolean;
}

function fmtCompact(v: number): string {
  if (v >= 1000) return `${(v / 1000).toFixed(1).replace('.', ',')}k`;
  return v.toLocaleString('pt-BR');
}

export function LiveNoAccess({ eventId, eventTitle, isLoggedIn }: Props) {
  const t = useTranslations('liveGate');
  const { data: event } = useGetEventQuery(eventId);
  const { data: tickets } = useListTicketProductsQuery(eventId);
  const { currentViewers } = useViewerCount(eventId);

  const title = event?.title ?? eventTitle ?? '';
  const isLive = event?.status === 'LIVE';

  const priceRange = tickets && tickets.length > 0
    ? { min: Math.min(...tickets.map((tk) => tk.price)), max: Math.max(...tickets.map((tk) => tk.price)) }
    : undefined;
  const priceLabel = priceRange ? formatPriceRange(priceRange) : null;

  const buyHref = `/events/${eventId}`;

  return (
    <div className={styles.root}>
      <div className={styles.glowPink} aria-hidden="true" />
      <div className={styles.glowPurple} aria-hidden="true" />
      <div className={styles.grid} aria-hidden="true" />

      <Navbar />

      <main className={styles.main}>
        <section className={styles.left}>
          <div className={styles.badge}>
            <Lock size={12} aria-hidden="true" />
            {t('restricted')}
          </div>

          <div>
            <div className={styles.eyebrow}>{t('liveEyebrow')}</div>
            <h1 className={styles.headline}>{t('headline')}</h1>
            <p className={styles.subtitle}>{t('needTicket', { title })}</p>
          </div>

          <div className={styles.actions}>
            <Link href={buyHref} className={styles.primaryBtn}>
              <Ticket size={16} aria-hidden="true" />
              {t('buyTicket')}
            </Link>
            {!isLoggedIn && (
              <Link href="/login" className={styles.secondaryBtn}>
                {t('login')}
                <ArrowRight size={14} aria-hidden="true" />
              </Link>
            )}
          </div>

          <div className={styles.reassurance}>
            <span className={styles.reassuranceItem}>
              <ShieldCheck size={13} aria-hidden="true" />
              {t('securePayment')}
            </span>
            <span className={styles.reassuranceItem}>
              <Zap size={13} aria-hidden="true" />
              {t('instantAccess')}
            </span>
          </div>
        </section>

        <aside className={styles.right}>
          {isLive && (
            <div className={styles.livePill}>
              <span className={styles.liveDot} aria-hidden="true" />
              {t('liveNow')}
            </div>
          )}

          <div className={styles.card}>
            <div className={styles.poster}>
              <div className={styles.posterGlow} aria-hidden="true" />
              <div className={styles.padlock}>
                <Lock size={40} aria-hidden="true" />
              </div>
              {typeof event?.camerasCount === 'number' && event.camerasCount > 0 && (
                <div className={styles.camerasChip}>
                  <Camera size={12} aria-hidden="true" />
                  {t('camerasCount', { count: event.camerasCount })}
                </div>
              )}
              <div className={styles.posterFooter}>
                <div className={styles.eventTitleOverlay}>{title}</div>
              </div>
            </div>

            <div className={styles.details}>
              <div className={styles.statsGrid}>
                <div className={styles.stat}>
                  <div className={styles.statLabel}>{t('watching')}</div>
                  <div className={styles.statValue}>
                    {fmtCompact(currentViewers)}
                  </div>
                </div>
                <div className={styles.stat}>
                  <div className={styles.statLabel}>{isLive ? t('endsIn') : t('startsAt')}</div>
                  <div className={styles.statValue}>
                    {event && (isLive ? formatDuration(new Date().toISOString(), event.endsAt) : formatDate(event.startsAt))}
                  </div>
                </div>
              </div>

              {priceLabel && (
                <div className={styles.priceRow}>
                  <div>
                    <div className={styles.priceLabel}>{t('startingFrom')}</div>
                    <div className={styles.priceValue}>{priceRange && priceRange.min === priceRange.max ? formatPrice(priceRange.min) : priceLabel}</div>
                  </div>
                  <Link href={buyHref} className={styles.priceBtn}>
                    {t('viewTickets')}
                    <ArrowRight size={14} aria-hidden="true" />
                  </Link>
                </div>
              )}
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
