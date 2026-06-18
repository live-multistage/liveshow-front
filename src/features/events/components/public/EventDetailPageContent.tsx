'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  Calendar, Clock, MapPin, Camera, RotateCcw,
  Play, ChevronLeft, Building2,
} from 'lucide-react';
import { useGetEventQuery, useListTicketProductsQuery } from '../../queries/get-event';
import { TicketPanel } from './TicketPanel';
import { formatDate, formatTime, formatDuration, statusLabel } from '../../utils/event-formatters';
import { useEventCamerasQuery } from '@/features/streams/queries/streams.queries';
import { useOrganization } from '@/features/organizations';
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

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <button onClick={() => router.back()} className={styles.backBtn}>
          <ChevronLeft size={18} /> {t('back')}
        </button>
      </div>

      <div className={styles.hero}>
        <div className={styles.heroImageWrap}>
          {heroImage
            ? <img src={heroImage} alt={event.title} className={styles.heroImage} />
            : <div className={styles.heroImage} style={{ background: 'linear-gradient(135deg, #1a1a2e, #16213e)' }} />}
          <div className={styles.heroOverlay} />
          <div className={styles.heroBadges}>
            <div className={styles.badgeRow}>
              {isLive && (
                <span className={styles.badgeLive}>
                  <span className={styles.liveDot} /> {t('live')}
                </span>
              )}
              {isFinished && (
                <span className={styles.badgeReplay}>
                  <RotateCcw size={10} /> {t('replay')}
                </span>
              )}
              <span className={styles.badgeGenre}>{statusLabel(event.status)}</span>
            </div>
            <h1 className={styles.heroTitle}>{event.title}</h1>
            {event.venue && <p className={styles.heroVenue}>{event.venue}</p>}
          </div>
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.grid}>
          <div className={styles.content}>
            <div className={styles.infoGrid}>
              {[
                { icon: <Calendar size={14} />, label: t('date'), value: formatDate(event.startsAt) },
                { icon: <Clock size={14} />, label: t('time'), value: `${formatTime(event.startsAt)} · ${formatDuration(event.startsAt, event.endsAt)}` },
                { icon: <MapPin size={14} />, label: t('venue'), value: [event.city, event.country].filter(Boolean).join(', ') || '—' },
                { icon: <Camera size={14} />, label: t('cameras'), value: t('angles', { count: cameras.length || event.camerasCount }) },
              ].map((info) => (
                <div key={info.label} className={styles.infoCard}>
                  <div className={styles.infoLabel}>
                    {info.icon}
                    <span className={styles.infoLabelText}>{info.label}</span>
                  </div>
                  <p className={styles.infoValue}>{info.value}</p>
                </div>
              ))}
            </div>

            {org && (
              <button
                className={styles.orgCard}
                onClick={() => router.push(`/o/${org.slug}`)}
              >
                <div className={styles.orgAvatar}>
                  {org.logoUrl
                    ? <img src={org.logoUrl} alt={org.name} className={styles.orgAvatarImg} />
                    : <Building2 size={18} />}
                </div>
                <div className={styles.orgInfo}>
                  <span className={styles.orgLabel}>{t('organization')}</span>
                  <span className={styles.orgName}>{org.name}</span>
                </div>
                <span className={styles.orgArrow}>{t('viewProfile')}</span>
              </button>
            )}

            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>{t('about')}</h2>
              <p className={styles.description}>{event.description}</p>
            </div>

            {(cameras.length > 0 || camerasLoading) && (
              <div className={styles.section}>
                <h2 className={styles.sectionTitle}>{t('availableCameras', { count: cameras.length })}</h2>
                <div className={styles.cameraGrid}>
                  {camerasLoading
                    ? Array.from({ length: event.camerasCount || 2 }).map((_, i) => (
                        <div key={i} className={`${styles.cameraCard} ${styles.cameraCardSkeleton}`}>
                          <div className={styles.cameraPreview} />
                          <div className={styles.cameraMeta}>
                            <p className={styles.cameraName} style={{ opacity: 0 }}>—</p>
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

          <div className={styles.sidePanel}>
            <TicketPanel event={event} tickets={tickets} />
          </div>
        </div>
      </div>
    </div>
  );
}
