'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Bell, Check, Heart, Search, Ticket } from 'lucide-react';
import { Button, Skeleton } from '@live-show/design-system';
import { EmptyStatePanel } from '@/shared/components/EmptyStatePanel/EmptyStatePanel';
import { eventHref } from '@/features/events/utils/slug';
import { eventToShow } from '@/features/events/utils/event-adapter';
import { ShowCard } from '@/features/events/components/public/ShowCard';
import { useRecommendedEventsQuery } from '@/features/events/queries/use-recommended-events';
import { coverGradient, coverUrl, placeLabel } from '@/shared/utils/event-cover';
import { dateLabel } from '@/features/my-list/utils/format';
import {
  useNotificationPreferencesQuery,
  useUpdateNotificationPreferencesMutation,
} from '@/features/account/queries/get-notification-preferences';
import { useWishlistQuery } from '../queries/get-wishlist';
import type { WishlistItem } from '../types/wishlist.types';
import { WishlistButton } from './WishlistButton';
import { WishlistEmptyIllustration } from './WishlistEmptyIllustration';
import styles from './WishlistPageContent.module.scss';

type WishlistTab = 'all' | 'upcoming' | 'live' | 'finished';

const TABS: WishlistTab[] = ['all', 'upcoming', 'live', 'finished'];

function isLive(item: WishlistItem): boolean {
  return item.status === 'LIVE';
}

function isFinished(item: WishlistItem, now: number): boolean {
  return item.status === 'FINISHED' || new Date(item.endsAt).getTime() < now;
}

function isUpcoming(item: WishlistItem, now: number): boolean {
  return !isLive(item) && !isFinished(item, now) && new Date(item.startsAt).getTime() > now;
}

function filterByTab(items: WishlistItem[], tab: WishlistTab): WishlistItem[] {
  if (tab === 'all') return items;

  const now = Date.now();
  if (tab === 'live') return items.filter(isLive);
  if (tab === 'upcoming') return items.filter((item) => isUpcoming(item, now));
  return items.filter((item) => isFinished(item, now));
}

export function WishlistPageContent() {
  const t = useTranslations('wishlist');
  const locale = useLocale();
  const [tab, setTab] = useState<WishlistTab>('all');

  const { data: items, isLoading, isError, refetch } = useWishlistQuery();
  const { data: recommended } = useRecommendedEventsQuery();
  const { data: prefs, isLoading: prefsLoading } = useNotificationPreferencesQuery();
  const updatePrefs = useUpdateNotificationPreferencesMutation();

  const notifyOn = prefs?.NEWS_PROMOS ?? false;

  const handleNotifyToggle = () => {
    const next = !notifyOn;
    updatePrefs.mutate(
      { NEWS_PROMOS: next },
      { onSuccess: () => next && toast.success(t('notify.toast')) },
    );
  };

  const filteredItems = useMemo(() => filterByTab(items ?? [], tab), [items, tab]);
  const hasItems = filteredItems.length > 0;

  const teaserShows = useMemo(
    () => (recommended?.items ?? []).slice(0, 4).map(eventToShow),
    [recommended],
  );

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>{t('eyebrow')}</p>
          <h1 className={styles.heading}>{t('title')}</h1>
          <p className={styles.subtitle}>{t('subtitle')}</p>
        </div>

        <div className={styles.tabs} role="group" aria-label={t('title')}>
          {TABS.map((value) => (
            <button
              key={value}
              type="button"
              className={styles.tab}
              aria-pressed={tab === value}
              onClick={() => setTab(value)}
            >
              {t(`tabs.${value}`)}
            </button>
          ))}
        </div>
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
        <>
          <EmptyStatePanel
            illustration={<WishlistEmptyIllustration />}
            badge={t(`empty.${tab}.badge`)}
            title={t(`empty.${tab}.title`)}
            text={t(`empty.${tab}.text`)}
            primaryCta={{
              href: '/events',
              label: t('emptyCta'),
              icon: <Search size={16} aria-hidden="true" />,
            }}
            secondary={
              <button
                type="button"
                className={`${styles.notifyButton} ${notifyOn ? styles.notifyButtonOn : ''}`}
                onClick={handleNotifyToggle}
                disabled={prefsLoading || updatePrefs.isPending}
                aria-pressed={notifyOn}
              >
                {notifyOn ? (
                  <Check size={16} aria-hidden="true" />
                ) : (
                  <Bell size={16} aria-hidden="true" />
                )}
                {notifyOn ? t('notify.on') : t('notify.off')}
              </button>
            }
            kindsLabel={t('kindsLabel')}
            kinds={[
              {
                icon: <Heart size={16} aria-hidden="true" />,
                title: t('kinds.save.title'),
                text: t('kinds.save.text'),
              },
              {
                icon: <Bell size={16} aria-hidden="true" />,
                title: t('kinds.notify.title'),
                text: t('kinds.notify.text'),
              },
              {
                icon: <Ticket size={16} aria-hidden="true" />,
                title: t('kinds.buy.title'),
                text: t('kinds.buy.text'),
              },
            ]}
          />

          {teaserShows.length > 0 && (
            <div className={styles.teaser}>
              <div className={styles.teaserHeader}>
                <div>
                  <p className={styles.eyebrow}>{t('teaser.eyebrow')}</p>
                  <h2 className={styles.teaserTitle}>
                    {t('teaser.title')} <span className={styles.teaserAccent}>{t('teaser.titleAccent')}</span>
                  </h2>
                </div>
                <Link href="/events" className={styles.teaserAll}>
                  {t('teaser.all')} →
                </Link>
              </div>

              <div className={styles.teaserGrid}>
                {teaserShows.map((show) => (
                  <ShowCard key={show.id} show={show} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {!isLoading && !isError && hasItems && (
        <div className={styles.grid}>
          {filteredItems.map((item) => {
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
