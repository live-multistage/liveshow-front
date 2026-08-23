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

  return (
    <Carousel title={t('title')} seeAllHref="/channels">
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
