'use client';

import type { HomeRail } from '@live-show/api-contracts';
import { SectionHeader } from '@/shared/components/SectionHeader/SectionHeader';
import { Carousel } from '@/app/(public)/_components/Carousel/Carousel';
import { ShowCard } from '@/features/events/components/public/ShowCard';
import { eventToShow } from '@/features/events/utils/event-adapter';
import { ChannelCard } from '@/features/channels/components/ChannelCard';
import styles from './HomeRail.module.scss';

export function HomeRailSection({ rail }: { rail: HomeRail }) {
  const titleId = `rail-${rail.key.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`;
  const isLive = rail.key === 'curated:live';

  return (
    <section aria-labelledby={titleId} className={styles.rail} data-dimension={rail.dimension}>
      <SectionHeader
        titleId={titleId}
        title={rail.title}
        eyebrow={isLive ? <span className={styles.liveDot} data-testid="rail-live-dot" aria-hidden /> : undefined}
        seeAllHref={rail.seeAllHref}
      />
      {rail.subtitle && <p className={styles.subtitle}>{rail.subtitle}</p>}
      <Carousel>
        {rail.kind === 'channels'
          ? (rail.channels ?? []).map((channel) => (
              <Carousel.Item key={channel.id} fit="content">
                <ChannelCard channel={channel} />
              </Carousel.Item>
            ))
          : rail.items.map((item) => (
              <Carousel.Item key={item.id} fit="content">
                <div className={styles.card}>
                  <ShowCard show={eventToShow(item)} size="compact" progress={item.progress} />
                </div>
              </Carousel.Item>
            ))}
      </Carousel>
    </section>
  );
}
