'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Clock } from 'lucide-react';
import { Skeleton } from '@live-show/design-system';
import { useEventSchedule } from '../../hooks/use-event-schedule';
import styles from './EventSchedule.module.scss';

interface Props {
  eventId: string;
}

export function EventSchedule({ eventId }: Props) {
  const t = useTranslations('eventDetail.schedule');
  const { data: items = [], isLoading } = useEventSchedule(eventId);

  if (isLoading) {
    return (
      <div className={styles.section}>
        <h2 className={styles.sectionLabel}>{t('title')}</h2>
        <div className={styles.timeline}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className={styles.row}>
              <div className={styles.timeCol}>
                <Skeleton className={styles.skeletonTime} />
              </div>
              <div className={styles.dotCol}>
                <span className={styles.dot} />
                <span className={styles.line} />
              </div>
              <div className={styles.card}>
                <div className={styles.cardHead}>
                  <Skeleton className={styles.skeletonAvatar} />
                  <Skeleton className={styles.skeletonHeadline} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className={styles.section}>
        <h2 className={styles.sectionLabel}>{t('title')}</h2>
        <p className={styles.empty}>{t('empty')}</p>
      </div>
    );
  }

  return (
    <div className={styles.section}>
      <div className={styles.header}>
        <h2 className={styles.sectionLabel}>{t('title')}</h2>
        <span className={styles.countBadge}>{t('countBlocks', { count: items.length })}</span>
      </div>

      <div className={styles.timeline}>
        {items.map((item) => {
          const artist = item.artist;
          const href = artist ? `/artists/${artist.slug || artist.id}` : null;

          return (
            <div key={item.id} className={styles.row}>
              <div className={styles.timeCol}>
                <span className={styles.startTime}>{item.startTime}</span>
                {item.endTime && <span className={styles.endTime}>{item.endTime}</span>}
              </div>

              <div className={styles.dotCol}>
                {/* ponytail: live-block highlight (now vs. item times) skipped for MVP; add when needed */}
                <span className={styles.dot} />
                <span className={styles.line} />
              </div>

              <div className={styles.card}>
                {artist
                  ? (
                    <div className={styles.cardHead}>
                      <div className={styles.avatar}>
                        {artist.imageUrl && <img src={artist.imageUrl} alt={artist.name} className={styles.avatarImg} />}
                      </div>
                      <div className={styles.cardHeadInfo}>
                        <span className={styles.headline}>{artist.name}</span>
                        {href && (
                          <Link href={href} className={styles.artistLink}>
                            {artist.name} ↗
                          </Link>
                        )}
                      </div>
                      <span className={styles.badge}>{t('badgeArtist')}</span>
                    </div>
                  )
                  : (
                    <div className={styles.cardHead}>
                      <div className={styles.iconBox}>
                        <Clock size={18} />
                      </div>
                      <div className={styles.cardHeadInfo}>
                        <span className={styles.headline}>{item.title}</span>
                      </div>
                      <span className={styles.badge}>{t('badgeSegment')}</span>
                    </div>
                  )}

                {item.description && <p className={styles.description}>{item.description}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
