'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Calendar, Clock, MapPin, Camera, RotateCcw, Play } from 'lucide-react';
import { useGetEventQuery, useListTicketProductsQuery } from '../../queries/get-event';
import { TicketPanel } from './TicketPanel';
import { formatDate, formatTime, formatDuration, statusLabel } from '../../utils/event-formatters';
import { useEventCamerasQuery } from '@/features/streams/queries/streams.queries';
import { useOrganization } from '@/features/organizations';
import { useAuth } from '@/features/account/hooks/use-auth';
import { useTrackEventView } from '../../hooks/use-track-event-view';
import { AdBanner } from '@/features/advertisements';
import styles from './EventDetailPageContent.module.scss';

interface Props {
  id: string;
}

export function EventDetailPageContent({ id }: Props) {
  const router = useRouter();
  const t = useTranslations('events.detail');
  const { data: event, isLoading, isError } = useGetEventQuery(id);
  const { data: tickets = [] } = useListTicketProductsQuery(id);
  const { data: org } = useOrganization(event?.organizationId ?? '');
  const { cameras, isLoading: camerasLoading } = useEventCamerasQuery(event ? id : null);
  const { user } = useAuth();
  useTrackEventView(id, user?.id);

  if (isLoading) {
    return (
      <div className={styles.centered}>
        <span className={styles.spinner} />
      </div>
    );
  }

  if (isError || !event) {
    return (
      <div className={styles.centered}>
        <p className={styles.notFound}>{t('notFound')}</p>
        <button onClick={() => router.push('/')} className={styles.backLink}>{t('backToHome')}</button>
      </div>
    );
  }

  const isLive = event.status === 'LIVE';
  const isFinished = event.status === 'FINISHED';
  const heroImage = event.bannerUrl ?? event.thumbnailUrl;
  const cameraCount = cameras.length || event.camerasCount || 0;

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <button onClick={() => router.back()} className={styles.backBtn}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M11 18l-6-6 6-6"/>
          </svg>
          VOLTAR
        </button>

        <div className={styles.hero}>
          {heroImage
            ? <img src={heroImage} alt={event.title} className={styles.heroImg} />
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
              <button className={styles.orgCard} onClick={() => router.push(`/o/${org.slug}`)}>
                <div className={styles.orgAvatar}>
                  {org.logoUrl && <img src={org.logoUrl} alt={org.name} className={styles.orgAvatarImg} />}
                </div>
                <div className={styles.orgInfo}>
                  <span className={styles.orgLabel}>{t('organization')}</span>
                  <span className={styles.orgName}>{org.name}</span>
                </div>
                <span className={styles.orgArrow}>VER PERFIL →</span>
              </button>
            )}

            <div className={styles.section}>
              <div className={styles.sectionLabel}>SOBRE O SHOW</div>
              <p className={styles.description}>{event.description}</p>
            </div>

            {(cameras.length > 0 || camerasLoading) && (
              <div className={styles.section}>
                <div className={styles.sectionLabel}>{t('availableCameras', { count: cameras.length })}</div>
                <div className={styles.cameraGrid}>
                  {camerasLoading
                    ? Array.from({ length: event.camerasCount || 2 }).map((_, i) => (
                        <div key={i} className={`${styles.cameraCard} ${styles.cameraCardSkeleton}`}>
                          <div className={styles.cameraPreview} />
                          <div className={styles.cameraMeta}>
                            <p className={`${styles.cameraName} ${styles.cameraNameHidden}`}>—</p>
                          </div>
                        </div>
                      ))
                    : cameras.map((camera) => (
                        <div key={camera.id} className={styles.cameraCard}>
                          <div className={styles.cameraPreview}>
                            <div className={styles.cameraPlayIcon}>
                              <Play size={20} color="white" fill="white" />
                            </div>
                            {isLive && camera.enabled && (
                              <div className={styles.cameraBadge}>
                                <span className={styles.liveDot} /> {t('live')}
                              </div>
                            )}
                          </div>
                          <div className={styles.cameraMeta}>
                            <p className={styles.cameraName}>{camera.name}</p>
                            <p className={styles.cameraAngle}>{camera.stageName}</p>
                          </div>
                        </div>
                      ))}
                </div>
              </div>
            )}
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
