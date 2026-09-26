'use client';

import { Fragment, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { AlertCircle, ArrowRight, RotateCcw } from 'lucide-react';
import type { HomeRailsResponse } from '@live-show/api-contracts';
import { AdBanner } from '@/features/advertisements/components/AdBanner';
import { useHomeRailsQuery } from '../queries/get-home-rails';
import { HomeRailSection } from './HomeRail';
import { HomeRailsSkeleton } from './HomeRailsSkeleton';
import styles from './HomeRails.module.scss';

// Rails after which the feed ad is injected (once, mid-scroll — a second ad
// would be the same creative anyway, since AdBanner serves per placement).
const AD_AFTER_RAIL_INDEX = 2;
const SKELETON_RAILS = 2;

export function HomeRails({ initialPage }: { initialPage?: HomeRailsResponse }) {
  const t = useTranslations('home.rails');
  const tHome = useTranslations('home');
  const q = useHomeRailsQuery(initialPage);
  const rails = useMemo(() => (q.data?.pages ?? []).flatMap((page) => page.rails), [q.data]);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !q.hasNextPage || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !q.isFetchingNextPage) void q.fetchNextPage();
      },
      // Start the next page a viewport and a half early so the scroll never
      // reaches the end of the loaded rails.
      { rootMargin: '0px 0px 150% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [q.hasNextPage, q.isFetchingNextPage, q.fetchNextPage]);

  if (!q.isFetching && rails.length === 0 && !q.isError) {
    return <div className={styles.empty}>{tHome('noShows')}</div>;
  }

  return (
    <div className={styles.list}>
      {rails.map((rail, index) => (
        <Fragment key={rail.key}>
          <HomeRailSection rail={rail} />
          {index === AD_AFTER_RAIL_INDEX && <AdBanner placement="FEED" className={styles.ad} />}
        </Fragment>
      ))}

      {q.isFetchingNextPage && <HomeRailsSkeleton rails={SKELETON_RAILS} />}

      {q.isError && (
        <div role="alert" className={styles.error}>
          <div className={styles.errorText}>
            <span className={styles.errorIcon} aria-hidden>
              <AlertCircle size={16} />
            </span>
            <span>{t('loadError')}</span>
          </div>
          {/* Nothing loaded yet means the first page itself failed — retrying a
              "next" page there would do nothing. */}
          <button
            type="button"
            className={styles.retry}
            onClick={() => void (rails.length > 0 ? q.fetchNextPage() : q.refetch())}
          >
            <RotateCcw size={14} aria-hidden />
            {t('retry')}
          </button>
        </div>
      )}

      {!q.hasNextPage && rails.length > 0 && (
        <div className={styles.end}>
          <span className={styles.endLabel}>{t('end')}</span>
          <Link href="/events" className={styles.endLink}>
            {t('seeAllEvents')}
            <ArrowRight size={16} aria-hidden />
          </Link>
        </div>
      )}

      <div ref={sentinelRef} aria-hidden className={styles.sentinel} />
    </div>
  );
}
