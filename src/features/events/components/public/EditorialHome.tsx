// Server component: the editorial home shell. Renders entirely on the server
// (no hydration) except two islands — GenreGrid (the interactive filter) and
// AdBanner. Data comes straight from the SSR fetch; the old react-query hooks
// (staleTime 5min) were dropped in favor of fresh-per-navigation server data.
import { useTranslations } from 'next-intl';
import { eventToShow } from '@/features/events/utils/event-adapter';
import type { EventResponse, RecommendedEventsResponse } from '@/features/events';
import { AdBanner } from '@/features/advertisements/components/AdBanner';
import { Carousel } from '@/app/(public)/_components/Carousel/Carousel';
import { ChannelsRail } from '@/app/(public)/_components/ChannelsRail/ChannelsRail';
import { SectionHeader } from '@/shared/components/SectionHeader/SectionHeader';
import type { ChannelListItem } from '@/features/channels';
import { GenreGrid } from './editorial/GenreGrid';
import { EditorialHero } from './editorial/EditorialHero';
import { ShowCard } from './ShowCard';
import styles from './EditorialHomeContent.module.scss';

interface Props {
  initialEvents?: EventResponse[];
  initialRecommended?: RecommendedEventsResponse;
  initialReplayCatalog?: RecommendedEventsResponse;
  initialChannels?: ChannelListItem[];
  localeCode: string;
  isLoggedIn: boolean;
}

export function EditorialHome({
  initialEvents = [], initialRecommended, initialReplayCatalog, initialChannels = [],
  localeCode, isLoggedIn,
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

      {heroSlides.length > 0 && <EditorialHero slides={heroSlides} localeCode={localeCode} headline={t('headline')} />}

      <div className={styles.inner}>
        {liveShows.length > 0 && (
          <section className={styles.gridSection} aria-labelledby="home-live-now-heading">
            <SectionHeader title={t('liveNow')} titleId="home-live-now-heading" seeAllHref="/events" />
            <Carousel>
              {liveShows.map((show) => (
                <div key={show.id} className={styles.recommendedItem}>
                  <ShowCard show={show} size="compact" />
                </div>
              ))}
            </Carousel>
          </section>
        )}

        {initialChannels.length > 0 && (
          <section className={styles.gridSection} aria-labelledby="home-channels-heading">
            <ChannelsRail channels={initialChannels} />
          </section>
        )}

        {recommendedShows.length > 0 && (
          <section className={styles.gridSection} aria-labelledby="home-recommended-heading">
            <SectionHeader
              title={isLoggedIn ? t('recommendedForYou') : t('trendingNow')}
              titleId="home-recommended-heading"
              seeAllHref="/events"
            />
            <Carousel>
              {recommendedShows.map((show) => (
                <div key={show.id} className={styles.recommendedItem}>
                  <ShowCard show={show} size="compact" />
                </div>
              ))}
            </Carousel>
          </section>
        )}

        {onDemandShows.length > 0 && (
          <section className={styles.gridSection} aria-labelledby="home-replays-heading">
            <SectionHeader title={t('replaysAvailable')} titleId="home-replays-heading" seeAllHref="/events" />
            <Carousel>
              {onDemandShows.map((show) => (
                <div key={show.id} className={styles.recommendedItem}>
                  <ShowCard show={show} size="compact" />
                </div>
              ))}
            </Carousel>
          </section>
        )}

        <div className={styles.adBannerWrapper}>
          <AdBanner placement="FEED" className={styles.feedAd} />
        </div>

        <GenreGrid shows={shows} />
      </div>
    </div>
  );
}
