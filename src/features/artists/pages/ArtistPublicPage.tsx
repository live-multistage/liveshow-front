'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Calendar, Heart, Ticket, User } from 'lucide-react';
import { useArtist, useArtistEvents } from '../hooks/use-artists';
import { ShowCard } from '@/features/events/components/public/ShowCard';
import { eventToShow } from '@/features/events/utils/event-adapter';
import { Skeleton } from '@live-show/design-system';
import { SOCIAL_ICONS } from '../components/SocialIcons';
import styles from './ArtistPublicPage.module.scss';

interface Props {
  slugOrId: string;
}

const SOCIAL_LABEL_KEYS: Record<string, string> = {
  instagram: 'socials.instagram',
  youtube: 'socials.youtube',
  x: 'socials.x',
  twitter: 'socials.x',
  tiktok: 'socials.tiktok',
  site: 'socials.site',
  website: 'socials.site',
};

export function ArtistPublicPage({ slugOrId }: Props) {
  const t = useTranslations('artists');

  const { data: artist, isLoading: artistLoading, isError } = useArtist(slugOrId);
  const { data: eventsPage, isLoading: eventsLoading } = useArtistEvents(slugOrId);

  const events = eventsPage?.items ?? [];
  const shows = events.map(eventToShow);
  const hasLive = events.some((e) => e.status === 'LIVE');
  const isLoading = artistLoading || eventsLoading;

  if (isLoading) return <ArtistPageSkeleton />;

  if (isError || !artist) {
    return (
      <div className={styles.notFound}>
        <h1 className={styles.notFoundTitle}>{t('notFound.title')}</h1>
        <p className={styles.notFoundDescription}>{t('notFound.description')}</p>
      </div>
    );
  }

  const socials = artist.socialLinks ?? [];
  const eventsCount = artist.eventCount ?? events.length;
  // ponytail: the artist model carries no city; the first listed show's city is
  // the best signal we have. Drop the segment entirely when there is none.
  const city = events[0]?.city;
  // No banner (external stubs only get an avatar): blow the avatar up behind the
  // gradient as ambient texture — the design renders it at ~18% luminosity, so
  // a blurred square photo reads as depth, not a bad crop.
  const heroBg = artist.bannerUrl ?? artist.imageUrl;

  return (
    <div className={styles.page}>
      <nav className={styles.breadcrumb} aria-label="breadcrumb">
        <Link href="/artists" className={styles.breadcrumbLink}>
          {t('breadcrumbRoot')}
        </Link>
        <span className={styles.breadcrumbSep}>/</span>
        <span className={styles.breadcrumbCurrent}>{artist.name.toUpperCase()}</span>
      </nav>

      {/* Cinematic full-bleed hero: breaks out of the page column, content is
          re-constrained to the column width inside. */}
      <section className={styles.hero}>
        <div className={styles.heroBanner}>
          {heroBg && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={heroBg}
              alt=""
              className={artist.bannerUrl ? styles.heroBannerImg : `${styles.heroBannerImg} ${styles.heroBannerImgBlur}`}
            />
          )}
          <div className={styles.heroScrim} />
          {artist.bannerAttribution && (
            <span className={styles.heroCredit}>{artist.bannerAttribution}</span>
          )}

          <div className={styles.heroContent}>
            <div className={styles.avatar}>
              {artist.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={artist.imageUrl} alt={artist.name} className={styles.avatarImg} />
              ) : (
                <div className={styles.avatarPlaceholder}>
                  <User size={44} />
                </div>
              )}
            </div>

            <div className={styles.heroInfo}>
              <div className={styles.nameRow}>
                <h1 className={styles.name}>{artist.name}</h1>
                {hasLive && (
                  <span className={styles.liveBadge}>
                    <span className={styles.liveDot} />
                    {t('liveNow')}
                  </span>
                )}
              </div>

              <p className={styles.metaLine}>
                <span>@{artist.slug}</span>
                {city && (
                  <>
                    <span className={styles.metaSep}>·</span>
                    <span>{city}</span>
                  </>
                )}
                <span className={styles.metaSep}>·</span>
                <span>{t('eventsCount', { count: eventsCount })}</span>
              </p>

              {artist.genres && artist.genres.length > 0 && (
                <div className={styles.genreRow}>
                  {artist.genres.map((genre) => (
                    <span key={genre} className={styles.genreChip}>
                      {genre.toUpperCase()}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className={styles.heroBottom}>
          <div className={styles.actionsRow}>
            {/* ponytail: no follow backend yet — visual only, disabled. Wire to
                a real follow mutation when one exists for artists. */}
            <button type="button" className={styles.followButton} disabled>
              <Heart size={15} />
              {t('follow')}
            </button>
            <a href="#events" className={styles.seeShowsButton}>
              <Ticket size={15} />
              {t('seeShows')}
            </a>

            {socials.length > 0 && (
              <div className={styles.socialsRow}>
                {socials.map((social) => {
                  const platform = social.platform.toLowerCase();
                  const Icon = SOCIAL_ICONS[platform];
                  if (!Icon) return null;
                  return (
                    <a
                      key={social.platform}
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className={styles.socialLink}
                      aria-label={SOCIAL_LABEL_KEYS[platform] ? t(SOCIAL_LABEL_KEYS[platform]) : social.platform}
                      title={SOCIAL_LABEL_KEYS[platform] ? t(SOCIAL_LABEL_KEYS[platform]) : social.platform}
                    >
                      <Icon size={16} />
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      {artist.description && (
        <section className={styles.bioCard}>
          <span className={styles.bioLabel}>{t('aboutLabel')}</span>
          <p className={styles.bioText}>{artist.description}</p>
        </section>
      )}

      <section id="events" className={styles.eventsSection}>
        <div className={styles.eventsHeader}>
          <h2 className={styles.eventsHeading}>{t('eventsHeading')}</h2>
          {events.length > 0 && (
            <span className={styles.eventsCountChip}>{t('eventsCount', { count: events.length })}</span>
          )}
        </div>

        {events.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIconBox}>
              <Calendar size={28} />
            </div>
            <p className={styles.emptyTitle}>{t('empty.title')}</p>
            <p className={styles.emptyDescription}>{t('empty.description')}</p>
            <button type="button" className={styles.followButton} disabled>
              <Heart size={15} />
              {t('empty.cta')}
            </button>
          </div>
        ) : (
          <div className={styles.eventsGrid}>
            {shows.map((show) => (
              <ShowCard key={show.id} show={show} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// Mirrors the loaded layout (banner → avatar + name/meta → poster grid) so the
// page doesn't jump when data lands.
function ArtistPageSkeleton() {
  return (
    <div className={styles.page}>
      <Skeleton className={styles.skeletonBreadcrumb} />
      <div className={styles.skeletonHero}>
        <Skeleton className={styles.skeletonBanner} />
        <div className={styles.skeletonHeroBody}>
          <Skeleton className={styles.skeletonAvatar} />
          <div className={styles.skeletonLines}>
            <Skeleton className={styles.skeletonName} />
            <Skeleton className={styles.skeletonMeta} />
          </div>
        </div>
      </div>
      <div className={styles.eventsGrid}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className={styles.skeletonCard} />
        ))}
      </div>
    </div>
  );
}
