'use client';

import { useMemo } from 'react';
import { useListEventsQuery, eventToShow } from '@/features/events';
import { Logo } from '@/shared/components/Logo';
import styles from './MarketingPanel.module.scss';

export function MarketingPanel() {
  const { data: events = [] } = useListEventsQuery('all');
  const shows = useMemo(() => events.map(eventToShow), [events]);
  const liveShows = useMemo(() => shows.filter((s) => s.isLive), [shows]);

  return (
    <div className={styles.marketingPanel}>
      <div className={styles.glowPink} />
      <div className={styles.glowPurple} />

      <div className={styles.marketingContent}>
        <div className={styles.logo}>
          <a href='/' className={styles.logo}>
            <Logo size={20} wordmarkClassName={styles.logoWordmark} />
          </a>
        </div>

        <div className={styles.marketingBody}>
          <p className={styles.marketingEyebrow}>STREAMING AO VIVO</p>
          <h1 className={styles.marketingTitle}>Viva o evento em tempo real.</h1>
          <p className={styles.marketingDesc}>
            Acesse eventos exclusivos ao vivo e replays com múltiplas câmeras.
          </p>
        </div>

        {liveShows.length > 0 && (
          <div className={styles.ticker}>
            <div className={styles.tickerLabel}>
              <span className={styles.tickerDot} />
              AO VIVO AGORA
            </div>
            <div className={styles.tickerTrack}>
              {liveShows.map((show) => (
                <div key={show.id} className={styles.tickerItem}>
                  <img src={show.image} alt={show.title} className={styles.tickerThumb} />
                  <span className={styles.tickerName}>{show.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className={styles.marketingStats}>
          <div className={styles.marketingStat}>
            <span className={styles.marketingStatNum}>{liveShows.length}</span>
            <span className={styles.marketingStatLabel}>AO VIVO</span>
          </div>
          <div className={styles.marketingStatDivider} />
          <div className={styles.marketingStat}>
            <span className={styles.marketingStatNum}>{shows.length}</span>
            <span className={styles.marketingStatLabel}>EVENTOS</span>
          </div>
          <div className={styles.marketingStatDivider} />
          <div className={styles.marketingStat}>
            <span className={styles.marketingStatNum}>HD</span>
            <span className={styles.marketingStatLabel}>MULTI-CAM</span>
          </div>
        </div>
      </div>
    </div>
  );
}
