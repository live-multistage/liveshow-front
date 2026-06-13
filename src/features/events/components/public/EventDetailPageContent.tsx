'use client';

import { useRouter } from 'next/navigation';
import {
  Calendar, Clock, MapPin, Camera, RotateCcw,
  Play, ChevronLeft, Building2,
} from 'lucide-react';
import { useGetEventQuery, useListTicketProductsQuery } from '../../queries/get-event';
import { TicketPanel } from './TicketPanel';
import {
  formatDate, formatTime, formatDuration,
  buildCameras, statusLabel,
} from '../../utils/event-formatters';
import { useOrganization } from '@/features/organizations';
import styles from './EventDetailPageContent.module.scss';

interface Props {
  id: string;
}

export function EventDetailPageContent({ id }: Props) {
  const router = useRouter();
  const { data: event, isLoading, isError } = useGetEventQuery(id);
  const { data: tickets = [] } = useListTicketProductsQuery(id);
  const { data: org } = useOrganization(event?.organizationId ?? '');

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
        <p className={styles.notFound}>Show não encontrado.</p>
        <button onClick={() => router.push('/')} className={styles.backLink}>Voltar ao início</button>
      </div>
    );
  }

  const isLive = event.status === 'LIVE';
  const isFinished = event.status === 'FINISHED';
  const cameras = buildCameras(event.camerasCount);
  const heroImage = event.bannerUrl ?? event.thumbnailUrl;

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <button onClick={() => router.back()} className={styles.backBtn}>
          <ChevronLeft size={18} /> Voltar
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
                  <span className={styles.liveDot} /> AO VIVO
                </span>
              )}
              {isFinished && (
                <span className={styles.badgeReplay}>
                  <RotateCcw size={10} /> REPRISE
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
                { icon: <Calendar size={14} />, label: 'Data', value: formatDate(event.startsAt) },
                { icon: <Clock size={14} />, label: 'Horário', value: `${formatTime(event.startsAt)} · ${formatDuration(event.startsAt, event.endsAt)}` },
                { icon: <MapPin size={14} />, label: 'Local', value: [event.city, event.country].filter(Boolean).join(', ') || '—' },
                { icon: <Camera size={14} />, label: 'Câmeras', value: `${cameras.length} ângulo${cameras.length !== 1 ? 's' : ''}` },
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
                  <span className={styles.orgLabel}>Organização</span>
                  <span className={styles.orgName}>{org.name}</span>
                </div>
                <span className={styles.orgArrow}>Ver perfil →</span>
              </button>
            )}

            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Sobre o Show</h2>
              <p className={styles.description}>{event.description}</p>
            </div>

            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Câmeras Disponíveis ({cameras.length})</h2>
              <div className={styles.cameraGrid}>
                {cameras.map((camera) => (
                  <div key={camera.id} className={styles.cameraCard}>
                    <div className={styles.cameraPreview} style={{ background: camera.gradient }}>
                      <div className={styles.cameraPlayIcon}>
                        <Play size={20} color="white" fill="white" />
                      </div>
                      {isLive && (
                        <div className={styles.cameraBadge}>
                          <span className={styles.liveDot} /> LIVE
                        </div>
                      )}
                    </div>
                    <div className={styles.cameraMeta}>
                      <p className={styles.cameraName}>{camera.name}</p>
                      <p className={styles.cameraAngle}>{camera.angle}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className={styles.sidePanel}>
            <TicketPanel event={event} tickets={tickets} />
          </div>
        </div>
      </div>
    </div>
  );
}
