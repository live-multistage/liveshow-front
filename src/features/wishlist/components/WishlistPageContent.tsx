'use client';

import Link from 'next/link';
import { eventHref } from '@/features/events/utils/slug';
import { useLocale, useTranslations } from 'next-intl';
import { Button, Skeleton } from '@live-show/design-system';
import { coverGradient, coverUrl, placeLabel } from '@/shared/utils/event-cover';
import { dateLabel } from '@/features/my-list/utils/format';
import { useWishlistQuery } from '../queries/get-wishlist';
import { WishlistButton } from './WishlistButton';
import styles from './WishlistPageContent.module.scss';

export function WishlistPageContent() {
  const t = useTranslations('wishlist');
  const locale = useLocale();
  const { data: items, isLoading, isError, refetch } = useWishlistQuery();

  const hasItems = (items?.length ?? 0) > 0;

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.heading}>{t('title')}</h1>
        <p className={styles.subtitle}>{t('subtitle')}</p>
      </div>

      {isLoading && (
        <div className={styles.grid} aria-busy="true">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className={styles.cardSkeleton} />
          ))}
        </div>
      )}

      {/* Erro é distinto de vazio: dizer "você não salvou nada" para quem
          teve a request falhar seria mentira. */}
      {isError && (
        <div className={styles.state} role="alert">
          <p>{t('loadError')}</p>
          <Button variant="outline" onClick={() => void refetch()}>
            {t('retry')}
          </Button>
        </div>
      )}

      {!isLoading && !isError && !hasItems && (
        <div className={styles.state}>
          <p>{t('empty')}</p>
          <Button asChild>
            <Link href="/events">{t('emptyCta')}</Link>
          </Button>
        </div>
      )}

      {!isLoading && !isError && hasItems && (
        <div className={styles.grid}>
          {items!.map((item) => {
            const cover = coverUrl(item);
            const place = placeLabel(item);

            return (
              <Link key={item.id} href={eventHref(item)} className={styles.card}>
                <div className={styles.cover} style={{ background: coverGradient(item.id) }}>
                  {cover && <img src={cover} alt="" className={styles.image} />}
                  <div className={styles.scrim} aria-hidden="true" />
                  <WishlistButton
                    eventId={item.id}
                    variant="overlay"
                    className={styles.wishlistButton}
                  />
                </div>

                <div className={styles.body}>
                  <h3 className={styles.title}>{item.title}</h3>
                  <p className={styles.meta}>
                    {dateLabel(item.startsAt, locale)}
                    {place && ` · ${place}`}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
