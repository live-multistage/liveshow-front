// Server component: the editorial home shell. Renders entirely on the server
// (no hydration) except two islands — GenreGrid (the interactive filter) and
// AdBanner. Data comes straight from the SSR fetch; the old react-query hooks
// (staleTime 5min) were dropped in favor of fresh-per-navigation server data.
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { eventToShow } from '@/features/events/utils/event-adapter';
import type { EventResponse, RecommendedEventsResponse } from '@/features/events';
import { AdBanner } from '@/features/advertisements/components/AdBanner';
import { Carousel } from '@/app/(public)/_components/Carousel/Carousel';
import { ChannelsRail } from '@/app/(public)/_components/ChannelsRail/ChannelsRail';
import type { ChannelListItem } from '@/features/channels';
import { SeriesRail } from '@/features/series/components/SeriesRail';
import type { SeriesListItem } from '@/features/series';
import { GenreGrid } from './editorial/GenreGrid';
import { EditorialHero } from './editorial/EditorialHero';
import { LiveTicker, EditorialCard } from './editorial/editorial-parts';
import styles from './EditorialHomeContent.module.scss';

interface Props {
  initialEvents?: EventResponse[];
  initialRecommended?: RecommendedEventsResponse;
  initialReplayCatalog?: RecommendedEventsResponse;
  initialChannels?: ChannelListItem[];
  initialSeries?: SeriesListItem[];
  localeCode: string;
  isLoggedIn: boolean;
}

export function EditorialHome({
  initialEvents = [], initialRecommended, initialReplayCatalog, initialChannels = [],
  initialSeries = [], localeCode, isLoggedIn,
}: Props) {
  const t = useTranslations('home');
  const shows = initialEvents.map(eventToShow);
  const recommendedShows = (initialRecommended?.items ?? []).map(eventToShow);
  const onDemandShows = (initialReplayCatalog?.items ?? []).map(eventToShow);

  const liveShows = shows.filter((s) => s.isLive);
  const upcomingShows = shows
    .filter((s) => !s.isLive)
    .sort((a, b) => a.date.localeCompare(b.date));
  const seenIds = new Set<string>();
  const heroSlides = [...liveShows, ...upcomingShows]
    .filter((s) => (seenIds.has(s.id) ? false : (seenIds.add(s.id), true)))
    .slice(0, 5);

  return (
    <div className={styles.page}>

      {heroSlides.length > 0 && <EditorialHero slides={heroSlides} localeCode={localeCode} />}

      <div className={styles.inner}>
        {liveShows.length > 0 && (
          <div className={styles.gridSection}>
            <div className={styles.sectionHeader}>
              <div>
                <div className={styles.sectionEyebrow}>AGORA</div>
                <div className={styles.sectionTitle}>Ao Vivo Agora</div>
              </div>
              <Link href="/events" className={styles.sectionMore}>
                VER TODOS →
              </Link>
            </div>
            <Carousel>
              {liveShows.map((show) => (
                <div key={show.id} className={styles.recommendedItem}>
                  <EditorialCard show={show} localeCode={localeCode} />
                </div>
              ))}
            </Carousel>
          </div>
        )}

        {initialChannels.length > 0 && (
          <div className={styles.gridSection}>
            <ChannelsRail channels={initialChannels} />
          </div>
        )}

        {initialSeries.length > 0 && (
          <div className={styles.gridSection}>
            <SeriesRail series={initialSeries} />
          </div>
        )}

        {recommendedShows.length > 0 && (
          <div className={styles.gridSection}>
            <div className={styles.sectionHeader}>
              <div>
                <div className={styles.sectionEyebrow}>
                  {isLoggedIn ? 'PARA VOCÊ' : 'DESTAQUES'}
                </div>
                <div className={styles.sectionTitle}>
                  {isLoggedIn ? t('recommendedForYou') : t('trendingNow')}
                </div>
              </div>
              <Link href="/events" className={styles.sectionMore}>
                VER TODOS →
              </Link>
            </div>
            <Carousel>
              {recommendedShows.map((show) => (
                <div key={show.id} className={styles.recommendedItem}>
                  <EditorialCard show={show} localeCode={localeCode} />
                </div>
              ))}
            </Carousel>
          </div>
        )}

        {onDemandShows.length > 0 && (
          <div className={styles.gridSection}>
            <div className={styles.sectionHeader}>
              <div>
                <div className={styles.sectionEyebrow}>SOB DEMANDA</div>
                <div className={styles.sectionTitle}>{t('replaysAvailable')}</div>
              </div>
              <Link href="/events" className={styles.sectionMore}>
                VER TODOS →
              </Link>
            </div>
            <Carousel>
              {onDemandShows.map((show) => (
                <div key={show.id} className={styles.recommendedItem}>
                  <EditorialCard show={show} localeCode={localeCode} />
                </div>
              ))}
            </Carousel>
          </div>
        )}

        <div className={styles.adBannerWrapper}>
          <AdBanner placement="FEED" className={styles.feedAd} />
        </div>

        <GenreGrid shows={shows} localeCode={localeCode} />
      </div>
    </div>
  );
}
