'use client';

import Link from 'next/link';
import { Pencil, Video } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { publicOrigin } from '@/features/events/utils/slug';
import type { PublicChannel } from '../../types/channel.types';
import styles from './ChannelDetail.module.scss';

interface Props {
  channel: PublicChannel;
  canPublish: boolean;
  isPublishing: boolean;
  onEdit: () => void;
  onPublish: () => void;
}

export function ChannelHeader({ channel, canPublish, isPublishing, onEdit, onPublish }: Props) {
  const t = useTranslations('channels.detail');
  const tStatus = useTranslations('channels.dashboard.status');

  const isPublished = channel.status === 'PUBLISHED';
  const statusClass =
    channel.status === 'PUBLISHED'
      ? styles.statusPublished
      : channel.status === 'ARCHIVED'
        ? styles.statusArchived
        : styles.statusDraft;

  return (
    <header className={styles.header}>
      <div className={styles.headerIdentity}>
        {channel.coverUrl ? (
          // Capa vem de storage externo — mesmo tratamento do ChannelCard.
          <img className={styles.cover} src={channel.coverUrl} alt="" />
        ) : (
          <div className={`${styles.cover} ${styles.coverPlaceholder}`} aria-hidden="true">
            {t('coverPlaceholder')}
          </div>
        )}

        <div>
          <div className={styles.titleRow}>
            <h1 className={styles.title}>{channel.name}</h1>
            <span className={`${styles.pill} ${statusClass}`}>{tStatus(channel.status)}</span>
            {isPublished && (
              <span
                className={`${styles.pill} ${channel.isOnAir ? styles.pillOnAir : styles.pillOffAir}`}
              >
                {channel.isOnAir && <span className={styles.dotPulse} />}
                {t(channel.isOnAir ? 'onAir' : 'offAir')}
              </span>
            )}
          </div>

          <p className={styles.headerMeta}>
            {publicOrigin().replace(/^https?:\/\//, '')}/channels/
            <span className={styles.headerMetaSlug}>{channel.slug}</span>
            {' · '}
            {t(channel.accessMode === 'SUBSCRIPTION' ? 'accessSubscription' : 'accessFree')}
            {' · '}
            {channel.timezone}
          </p>
        </div>
      </div>

      <div className={styles.headerActions}>
        {/* O container do canal não aparece em /events (é format=CHANNEL), então
            o seletor de streams não sabe o nome dele — mandamos junto na URL. */}
        <Link
          className={styles.ghostAction}
          href={`/dashboard/streams?eventId=${channel.broadcastEventId}&title=${encodeURIComponent(channel.name)}`}
        >
          <Video size={14} aria-hidden="true" />
          {t('cameras')}
        </Link>

        <button type="button" className={styles.ghostAction} onClick={onEdit}>
          <Pencil size={14} aria-hidden="true" />
          {t('edit')}
        </button>

        {/* Não existe rota de despublicar: um canal publicado só sai do ar
            arquivando (link no card de detalhes). */}
        {!isPublished && (
          <button
            type="button"
            className={styles.primaryAction}
            disabled={!canPublish || isPublishing}
            onClick={onPublish}
          >
            {t(isPublishing ? 'publishing' : 'publish')}
          </button>
        )}
      </div>
    </header>
  );
}
