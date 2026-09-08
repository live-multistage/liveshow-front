'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Calendar, User } from 'lucide-react';
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
  const eventsCountLabel = artist.eventCount ?? events.length;

  return (
    <div className={styles.page}>
      <nav className={styles.breadcrumb} aria-label="breadcrumb">
        <Link href="/artists" className={styles.breadcrumbLink}>
          {t('breadcrumbRoot')}
        </Link>
        <span className={styles.breadcrumbSep}>/</span>
        <span className={styles.breadcrumbCurrent}>{artist.name.toUpperCase()}</span>
      </nav>

      <section className={styles.hero}>
        <div className={styles.banner}>
          {artist.bannerUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={artist.bannerUrl} alt="" className={styles.bannerImg} />
          )}
          <div className={styles.bannerScrim} />
        </div>

        <div className={styles.heroBody}>
          <div className={styles.avatar}>
            {artist.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={artist.imageUrl} alt={artist.name} className={styles.avatarImg} />
            ) : (
              <div className={styles.avatarPlaceholder}>
                <User size={40} />
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
              @{artist.slug}
              {events[0]?.city ? ` · ${events[0].city}` : ''}
              {' · '}
              {t('eventsCount', { count: eventsCountLabel })}
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

            <div className={styles.actionsRow}>
              {/* ponytail: no follow backend yet — visual only, disabled. Wire to
                  a real follow/wishlist mutation when one exists for artists. */}
              <button type="button" className={styles.followButton} disabled>
                {t('follow')}
              </button>
              <a href="#events" className={styles.seeShowsButton}>
                {t('seeShows')}
              </a>
            </div>

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
          <span className={styles.eventsCountChip}>{t('eventsCount', { count: events.length })}</span>
        </div>

        {events.length === 0 ? (
          <div className={styles.empty}>
            <Calendar size={32} className={styles.emptyIcon} />
            <p className={styles.emptyTitle}>{t('empty.title')}</p>
            <p className={styles.emptyDescription}>{t('empty.description')}</p>
            <button type="button" className={styles.followButton} disabled>
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

function ArtistPageSkeleton() {
  return (
    <div className={styles.page}>
      <Skeleton className={styles.skeletonBreadcrumb} />
      <Skeleton className={styles.skeletonHero} />
      <Skeleton className={styles.skeletonBio} />
      <div className={styles.eventsGrid}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className={styles.skeletonCard} />
        ))}
      </div>
    </div>
  );
}
