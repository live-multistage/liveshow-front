'use client';

import type { HomeRail } from '@live-show/api-contracts';
import { SectionHeader } from '@/shared/components/SectionHeader/SectionHeader';
import { Carousel } from '@/app/(public)/_components/Carousel/Carousel';
import { ShowCard } from '@/features/events/components/public/ShowCard';
import { eventToShow } from '@/features/events/utils/event-adapter';
import { ChannelCard } from '@/features/channels/components/ChannelCard';
import { useTrackRailViewed } from '../hooks/use-track-rail-viewed';
import styles from './HomeRail.module.scss';

export function HomeRailSection({ rail, position = 0 }: { rail: HomeRail; position?: number }) {
  const titleId = `rail-${rail.key.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`;
  const isLive = rail.key === 'curated:live';
  const itemCount = rail.kind === 'channels' ? (rail.channels ?? []).length : rail.items.length;
  const railRef = useTrackRailViewed<HTMLElement>(rail.key, position, itemCount);
  const list = `home:${rail.key}`;

  return (
    <section ref={railRef} aria-labelledby={titleId} className={styles.rail} data-dimension={rail.dimension}>
      <SectionHeader
        titleId={titleId}
        title={rail.title}
        titleAdornment={isLive ? <span className={styles.liveDot} data-testid="rail-live-dot" /> : undefined}
        seeAllHref={rail.seeAllHref}
      />
      {rail.subtitle && <p className={styles.subtitle}>{rail.subtitle}</p>}
      <Carousel>
        {rail.kind === 'channels'
          ? (rail.channels ?? []).map((channel) => (
              <Carousel.Item key={channel.id} fit="content">
                <div className={styles.channelCard}>
                  <ChannelCard channel={channel} />
                </div>
              </Carousel.Item>
            ))
          : rail.items.map((item, index) => (
              <Carousel.Item key={item.id} fit="content">
                <div className={styles.card}>
                  <ShowCard show={eventToShow(item)} size="compact" progress={item.progress} list={list} position={index} />
                </div>
              </Carousel.Item>
            ))}
      </Carousel>
    </section>
  );
}
