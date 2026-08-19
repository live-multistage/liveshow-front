'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { isAxiosError } from 'axios';
import { useTranslations } from 'next-intl';
import { Calendar, Clock, MapPin, Camera, RotateCcw } from 'lucide-react';
import { useGetEventQuery, useListTicketProductsQuery } from '../../queries/get-event';
import { TicketPanel } from './TicketPanel';
import { formatDate, formatTime, formatDuration, statusLabel } from '../../utils/event-formatters';
import { useOrganization } from '@/features/organizations';
import { useAuth } from '@/features/account/hooks/use-auth';
import { useTrackEventView } from '../../hooks/use-track-event-view';
import { AdBanner } from '@/features/advertisements';
import { ReportButton } from '@/features/reports';
import { WishlistButton } from '@/features/wishlist';
import { MediaWithTeaserVideo } from '@/shared/components/MediaWithTeaserVideo';
import styles from './EventDetailPageContent.module.scss';

interface Props {
  id: string;
}

export function EventDetailPageContent({ id }: Props) {
  const router = useRouter();
  const t = useTranslations('events.detail');
  const tc = useTranslations('collaborations');
  const { data: event, isLoading, isError, error, refetch } = useGetEventQuery(id);
  const { data: tickets = [] } = useListTicketProductsQuery(id);
  const { data: org } = useOrganization(event?.organizationId ?? '');
  const { user } = useAuth();
  const [heroImgFailed, setHeroImgFailed] = useState(false);
  useTrackEventView(id, user?.id);

  if (isLoading) {
    return (
      <div className={styles.centered}>
        <span className={styles.spinner} />
      </div>
    );
  }

  if (isError || !event) {
    const isNotFound = isError && isAxiosError(error) && error.response?.status === 404;
    return (
      <div className={styles.centered}>
        <p className={styles.notFound}>{isNotFound ? t('notFound') : t('loadError')}</p>
        {isNotFound
          ? <Link href="/" className={styles.backLink}>{t('backToHome')}</Link>
          : <button onClick={() => refetch()} className={styles.backLink}>{t('retry')}</button>}
      </div>
    );
  }

  const isLive = event.status === 'LIVE';
  const isFinished = event.status === 'FINISHED';
  const heroImage = heroImgFailed ? null : event.bannerUrl ?? event.thumbnailUrl;
  // The production topology (streams → stages → feeds → cameras) is org-admin
  // only, so this public page can't enumerate cameras — camerasCount on the
  // event itself is the one camera fact a visitor is allowed to see.
  const cameraCount = event.camerasCount || 0;

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.topRow}>
          <button onClick={() => router.back()} className={styles.backBtn}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M11 18l-6-6 6-6"/>
            </svg>
            VOLTAR
          </button>
          {/* Agrupadas porque .topRow é space-between: um terceiro filho solto
              cairia no centro da faixa em vez de encostar na direita. */}
          <div className={styles.topActions}>
            <WishlistButton eventId={id} variant="inline" />
            <ReportButton eventId={id} className={styles.reportTrigger} />
          </div>
        </div>

        <div className={styles.hero}>
          {heroImage
            ? (
              <MediaWithTeaserVideo
                posterSrc={heroImage}
                posterAlt={event.title}
                videoSrc={event.teaserVideoUrl}
                posterClassName={styles.heroImg}
                videoClassName={styles.heroVideo}
                videoVisibleClassName={styles.heroVideoVisible}
                posterOnError={() => setHeroImgFailed(true)}
              />
            )
            : <div className={styles.heroPlaceholder} />}
          <div className={styles.heroScrim} />

          {cameraCount > 0 && (
            <div className={styles.camerasChip}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 7l-7 5 7 5V7Z"/>
                <rect x="1" y="5" width="15" height="14" rx="2"/>
              </svg>
              {cameraCount} CÂMERAS
            </div>
          )}

          <div className={styles.heroContent}>
            <div className={styles.heroBadges}>
              {isFinished && (
                <span className={styles.badgeReplay}>
                  <RotateCcw size={12} />REPLAY
                </span>
              )}
              {isLive && (
                <span className={styles.badgeLive}>
                  <span className={styles.liveDot} />AO VIVO
                </span>
              )}
              {!isLive && (
                <span className={styles.badgeStatus}>{statusLabel(event.status)}</span>
              )}
            </div>
            <h1 className={styles.heroTitle}>{event.title}</h1>
            {event.venue && (
              <div className={styles.heroVenue}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ff5fb4" strokeWidth="2">
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
                  <circle cx="12" cy="10" r="2.6"/>
                </svg>
                {event.venue}
              </div>
            )}
          </div>
        </div>

        <div className={styles.grid}>
          <div>
            <div className={styles.metaGrid}>
              {[
                { icon: <Calendar size={14} />, label: t('date'), value: formatDate(event.startsAt) },
                { icon: <Clock size={14} />, label: t('time'), value: `${formatTime(event.startsAt)} · ${formatDuration(event.startsAt, event.endsAt)}` },
                { icon: <MapPin size={14} />, label: t('venue'), value: [event.city, event.country].filter(Boolean).join(', ') || '—' },
                { icon: <Camera size={14} />, label: t('cameras'), value: t('angles', { count: cameraCount }) },
              ].map((info) => (
                <div key={info.label} className={styles.metaCard}>
                  <div className={styles.metaLabel}>
                    <span className={styles.metaIcon}>{info.icon}</span>
                    {info.label}
                  </div>
                  <p className={styles.metaValue}>{info.value}</p>
                </div>
              ))}
            </div>

            {org && (
              <>
                <Link href={`/o/${org.slug}`} className={styles.orgCard}>
                  <div className={styles.orgAvatar}>
                    {org.logoUrl && <img src={org.logoUrl} alt={org.name} className={styles.orgAvatarImg} />}
                  </div>
                  <div className={styles.orgInfo}>
                    <span className={styles.orgLabel}>
                      {event.collaborators?.length ? tc('organizedBy') : t('organization')}
                    </span>
                    <span className={styles.orgName}>{org.name}</span>
                  </div>
                  <span className={styles.orgArrow}>VER PERFIL →</span>
                </Link>
                {!!event.collaborators?.length && (
                  <div className={styles.collaboratorsRow}>
                    <span className={styles.collaboratorsLabel}>{tc('withCollaborators')}</span>
                    {event.collaborators.map((collaborator) => (
                      <Link
                        key={collaborator.id}
                        href={`/o/${collaborator.slug}`}
                        className={styles.collaboratorLink}
                      >
                        {collaborator.logoUrl && (
                          <img
                            src={collaborator.logoUrl}
                            alt={collaborator.name}
                            className={styles.collaboratorLogo}
                          />
                        )}
                        {collaborator.name}
                      </Link>
                    ))}
                  </div>
                )}
              </>
            )}

            <div className={styles.section}>
              <div className={styles.sectionLabel}>SOBRE O SHOW</div>
              <p className={styles.description}>{event.description}</p>
            </div>

          </div>

          <div className={styles.sidebarCol}>
            <TicketPanel event={event} tickets={tickets} />

            <AdBanner placement="EVENT_DETAIL" className={styles.sidebarAd} />
          </div>
        </div>
      </div>
    </div>
  );
}
