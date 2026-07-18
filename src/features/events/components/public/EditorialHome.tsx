// Server component: the editorial home shell. Renders entirely on the server
// (no hydration) except two islands — GenreGrid (the interactive filter) and
// AdBanner. Data comes straight from the SSR fetch; the old react-query hooks
// (staleTime 5min) were dropped in favor of fresh-per-navigation server data.
import Link from 'next/link';
import { eventToShow } from '@/features/events/utils/event-adapter';
import type { EventResponse, RecommendedEventsResponse } from '@/features/events';
import { AdBanner } from '@/features/advertisements/components/AdBanner';
import { Carousel } from '@/app/(public)/_components/Carousel/Carousel';
import { SmartImage } from './editorial/SmartImage';
import { GenreGrid } from './editorial/GenreGrid';
import {
  LiveTicker, LiveRailItem, UpcomingRailItem, EditorialCard,
  fmtPrice, fmtDate, playHref, infoHref,
} from './editorial/editorial-parts';
import styles from './EditorialHomeContent.module.scss';

interface Props {
  initialEvents?: EventResponse[];
  initialRecommended?: RecommendedEventsResponse;
  initialReplayCatalog?: RecommendedEventsResponse;
  localeCode: string;
  isLoggedIn: boolean;
}

export function EditorialHome({
  initialEvents = [], initialRecommended, initialReplayCatalog, localeCode, isLoggedIn,
}: Props) {
  const shows = initialEvents.map(eventToShow);
  const recommendedShows = (initialRecommended?.items ?? []).map(eventToShow);
  const onDemandShows = (initialReplayCatalog?.items ?? []).map(eventToShow);

  const liveShows = shows.filter((s) => s.isLive);
  const featured = liveShows[0] ?? shows[0] ?? null;
  // Fill the rail's dead space with upcoming shows when fewer than 3 lives.
  const railUpcoming = shows.filter((s) => !s.isLive).slice(0, Math.max(0, 3 - liveShows.length));

  return (
    <div className={styles.page}>
      <LiveTicker shows={liveShows} />

      <div className={styles.inner}>
        {featured && (
          <div className={styles.heroGrid}>
            <div className={styles.heroCard}>
              <SmartImage src={featured.image} alt={featured.title} className={styles.heroImage} />
              <div className={styles.heroOverlay} />

              <div className={styles.heroBadges}>
                <span className={styles.heroFeaturedBadge}>EM DESTAQUE</span>
                <span className={styles.heroCamBadge}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="7" width="20" height="13" rx="2" />
                    <circle cx="12" cy="13" r="3.4" />
                    <path d="M8 7l2-3h4l2 3" />
                  </svg>
                  {featured.cameras.length}
                </span>
              </div>

              <Link href={playHref(featured)} className={styles.heroPlayBtn} aria-label="Assistir">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </Link>

              <div className={styles.heroContent}>
                <div className={styles.heroGenre}>
                  {featured.category.toUpperCase()} · {featured.venue.toUpperCase()}
                </div>
                <h1 className={styles.heroTitle}>{featured.title}</h1>
                <div className={styles.heroMeta}>
                  {featured.viewers ? (
                    <span className={styles.heroMetaItem}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="3" /><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                      </svg>
                      {featured.viewers.toLocaleString('pt-BR')} assistindo
                    </span>
                  ) : null}
                  <span className={styles.heroMetaItem}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="7" width="20" height="13" rx="2" />
                      <circle cx="12" cy="13" r="3.4" />
                      <path d="M8 7l2-3h4l2 3" />
                    </svg>
                    {featured.cameras.length} câmeras
                  </span>
                  <span className={styles.heroMetaItem}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 9h18M8 2v4M16 2v4" />
                    </svg>
                    {fmtDate(featured.date, localeCode)}
                  </span>
                </div>
                <div className={styles.heroActions}>
                  <Link href={playHref(featured)} className={styles.heroWatchBtn}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    Assistir agora
                  </Link>
                  <Link href={infoHref(featured)} className={styles.heroTicketsBtn}>
                    Ingressos ·{' '}
                    <span className={styles.heroTicketsPrice}>{fmtPrice(featured)}</span>
                  </Link>
                </div>
              </div>
            </div>

            <div className={styles.liveRail}>
              <div className={styles.liveRailHeader}>
                <h2 className={styles.liveRailTitle}>Ao Vivo para você</h2>
                {liveShows.length > 0 && (
                  <span className={styles.liveRailBadge}>
                    <span className={styles.liveDot} />
                    {liveShows.length} AO VIVO
                  </span>
                )}
              </div>
              <div className={styles.liveItems}>
                {liveShows.slice(0, 3).map((show) => (
                  <LiveRailItem key={show.id} show={show} />
                ))}
                {liveShows.length === 0 && (
                  <div className={styles.liveRailEmpty}>Nenhum show ao vivo no momento.</div>
                )}
                {railUpcoming.map((show) => (
                  <UpcomingRailItem key={show.id} show={show} localeCode={localeCode} />
                ))}
              </div>
              <Link href="/events" className={styles.liveRailMore}>
                VER TODA A PROGRAMAÇÃO AO VIVO →
              </Link>
            </div>
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
                  {isLoggedIn ? 'Recomendados para você' : 'Em alta agora'}
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
                <div className={styles.sectionTitle}>Reprises disponíveis</div>
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
