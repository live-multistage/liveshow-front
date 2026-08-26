'use client';

import { useTranslations } from 'next-intl';
import { Carousel } from '../Carousel/Carousel';
import { ChannelCard } from '@/features/channels/components/ChannelCard';
import type { ChannelListItem } from '@/features/channels';
import styles from './ChannelsRail.module.scss';

interface Props {
  channels: ChannelListItem[];
}

// Trilho de canais da home. Sem canais publicados o trilho some por completo —
// um carrossel vazio com título é pior do que nenhum.
export function ChannelsRail({ channels }: Props) {
  const t = useTranslations('channels');
  if (channels.length === 0) return null;

  const onAirCount = channels.filter((c) => c.isOnAir).length;

  return (
    <Carousel
      title={t('title')}
      seeAllHref="/channels"
      eyebrow={
        <span className={styles.eyebrow}>
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <rect x="3" y="6" width="18" height="14" rx="2" />
            <path d="m8 2 4 4 4-4" />
          </svg>
          {t('railEyebrow')}
          {onAirCount > 0 && (
            <span className={styles.onAirCount}>{t('onAirCount', { count: onAirCount })}</span>
          )}
        </span>
      }
    >
      {channels.map((channel) => (
        <Carousel.Item fit="content" key={channel.id}>
          <div className={styles.item}>
            <ChannelCard channel={channel} />
          </div>
        </Carousel.Item>
      ))}
    </Carousel>
  );
}
