'use client';

import { useState } from 'react';
import Link from 'next/link';
import { isAxiosError } from 'axios';
import { useTranslations } from 'next-intl';
import { RotateCcw } from 'lucide-react';
import { useGetEventQuery, useListTicketProductsQuery } from '../../queries/get-event';
import { TicketPanel } from './TicketPanel';
import { formatDateShort, formatTime, formatDuration, statusLabel } from '../../utils/event-formatters';
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

  const metaRows = [
    { label: t('date'), value: formatDateShort(event.startsAt) },
    { label: t('time'), value: `${formatTime(event.startsAt)} · ${formatDuration(event.startsAt, event.endsAt)}` },
    { label: t('venue'), value: [event.city, event.country].filter(Boolean).join(', ') || '—' },
    { label: t('cameras'), value: t('angles', { count: cameraCount }), accent: true },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.heroFull}>
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
        <div className={styles.heroFullScrim} />

        <div className={styles.heroBottom}>
          <div className={styles.heroText}>
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
              {cameraCount > 0 && (
                <span className={styles.camerasChip}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M23 7l-7 5 7 5V7Z"/>
                    <rect x="1" y="5" width="15" height="14" rx="2"/>
                  </svg>
                  {cameraCount} CÂMERAS
                </span>
              )}
            </div>
            <h1 className={styles.heroFullTitle}>{event.title}</h1>
            {event.venue && <p className={styles.heroPlace}>{event.venue}</p>}
            <p className={styles.heroDateLine}>
              {formatDateShort(event.startsAt)} · {formatTime(event.startsAt)} · duração {formatDuration(event.startsAt, event.endsAt)}
            </p>
          </div>
          <div className={styles.heroPanel}>
            <TicketPanel event={event} tickets={tickets} />
          </div>
        </div>
      </div>

      <div className={styles.inner}>
        <div className={styles.grid}>
          <div>
            <div className={styles.topActions}>
              <WishlistButton eventId={id} variant="inline" />
              <ReportButton eventId={id} className={styles.reportTrigger} />
            </div>

            <div className={styles.section}>
              <div className={styles.sectionLabel}>SOBRE O SHOW</div>
              <p className={styles.description}>{event.description}</p>
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
          </div>

          <div className={styles.sidebarCol}>
            {metaRows.map((info) => (
              <div key={info.label} className={styles.metaRow}>
                <span className={styles.metaRowLabel}>{info.label}</span>
                <span className={info.accent ? styles.metaRowValueAccent : styles.metaRowValue}>{info.value}</span>
              </div>
            ))}

            <AdBanner placement="EVENT_DETAIL" className={styles.sidebarAd} />
          </div>
        </div>
      </div>
    </div>
  );
}
