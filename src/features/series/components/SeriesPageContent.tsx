'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { CalendarDays, RotateCcw } from 'lucide-react';
import { formatDate, formatTime, formatPrice } from '@/features/events/utils/event-formatters';
import { ShowCard } from '@/features/events/components/public/ShowCard';
import { useAuth } from '@/features/account';
import { useAddToCartMutation, useCartQuery } from '@/features/cart';
import { useSeriesQuery } from '../queries/series.queries';
import { getRecurrenceParts, formatStartTime } from '../utils/recurrence';
import { episodeToShow } from '../utils/episode-adapter';
import styles from './SeriesPageContent.module.scss';

interface Props {
  slug: string;
}

export function SeriesPageContent({ slug }: Props) {
  const t = useTranslations('series');
  const locale = useLocale();
  const router = useRouter();
  const { data: series, isLoading, isError, refetch } = useSeriesQuery(slug);
  const { isLoggedIn } = useAuth();
  const { data: cart } = useCartQuery();
  const addToCart = useAddToCartMutation();

  if (isLoading) {
    return (
      <div className={styles.centered}>
        <span className={styles.spinner} />
      </div>
    );
  }

  if (isError || !series) {
    return (
      <div className={styles.centered}>
        <p className={styles.notFound}>{t('notFound')}</p>
        <button onClick={() => refetch()} className={styles.retry}>
          {t('retry')}
        </button>
      </div>
    );
  }

  const recurrenceParts = getRecurrenceParts(
    series.rrule,
    formatStartTime(series.dtstart, series.timezone, locale),
    locale,
  );
  const recurrence =
    recurrenceParts.type === 'daily'
      ? t('recurrence.daily', { time: recurrenceParts.time })
      : t('recurrence.weekly', { day: recurrenceParts.day, time: recurrenceParts.time });
  const { nextEpisode, upcoming, replays, seasonPasses } = series;
  // nextEpisode is already the first upcoming episode — drop it from the
  // list below so it isn't shown twice.
  const upcomingList = nextEpisode ? upcoming.slice(1) : upcoming;

  const isPassInCart = (passId: string) =>
    isLoggedIn && (cart?.items.some((item) => item.ticketProductId === passId) ?? false);

  const buySeasonPass = (passId: string) => {
    if (!isLoggedIn) {
      router.push(`/login?redirect=${encodeURIComponent(`/series/${slug}`)}`);
      return;
    }
    addToCart.mutate(passId, { onSuccess: () => router.push('/checkout') });
  };

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>{t('eyebrow')}</p>
        <h1 className={styles.title}>{series.name}</h1>
        <p className={styles.recurrence}>
          <CalendarDays size={14} aria-hidden="true" />
          {recurrence}
        </p>
        {series.description && <p className={styles.description}>{series.description}</p>}

        {nextEpisode && (
          <div className={styles.nextEpisode}>
            <span className={styles.nextLabel}>{t('nextEpisode')}</span>
            <p className={styles.nextTitle}>{nextEpisode.title}</p>
            <p className={styles.nextDate}>
              {formatDate(nextEpisode.startsAt)} · {formatTime(nextEpisode.startsAt)}
            </p>
            <div className={styles.ctaRow}>
              <Link href={`/events/${nextEpisode.id}`} className={styles.ctaPrimary}>
                {t('buyEpisode')}
              </Link>
              {seasonPasses.length > 0 && (
                <a href="#season-passes" className={styles.ctaSecondary}>
                  {t('buySeasonPass')}
                </a>
              )}
            </div>
          </div>
        )}
      </section>

      {upcomingList.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('upcoming')}</h2>
          <ul className={styles.upcomingList}>
            {upcomingList.map((episode) => (
              <li key={episode.id} className={styles.upcomingItem}>
                <Link href={`/events/${episode.id}`} className={styles.upcomingLink}>
                  <span className={styles.upcomingItemTitle}>{episode.title}</span>
                  <span className={styles.upcomingItemDate}>
                    {formatDate(episode.startsAt)} · {formatTime(episode.startsAt)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {seasonPasses.length > 0 && (
        <section id="season-passes" className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('seasonPasses')}</h2>
          <div className={styles.passGrid}>
            {seasonPasses.map((pass) => {
              const inCart = isPassInCart(pass.id);
              return (
                <div key={pass.id} className={styles.passCard}>
                  <p className={styles.passName}>{pass.name}</p>
                  <p className={styles.passPrice}>{formatPrice(pass.price, pass.currency)}</p>
                  {pass.description && <p className={styles.passDescription}>{pass.description}</p>}
                  <button
                    className={styles.passBuyBtn}
                    disabled={addToCart.isPending || inCart}
                    onClick={() => buySeasonPass(pass.id)}
                  >
                    {inCart ? t('alreadyInCart') : t('buySeasonPass')}
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {replays.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <RotateCcw size={16} aria-hidden="true" /> {t('replays')}
          </h2>
          <div className={styles.replayGrid}>
            {replays.map((episode) => (
              <ShowCard key={episode.id} show={episodeToShow(episode, series.name, locale)} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
