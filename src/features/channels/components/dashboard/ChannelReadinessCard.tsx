'use client';

import { Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ChannelReadiness, ReadinessItemId } from '../../hooks/useChannelReadiness';
import styles from './ChannelDetail.module.scss';

interface Props {
  readiness: ChannelReadiness;
  isSubscription: boolean;
  cameraCount: number;
  camerasWithSignal: number;
  programCount: number;
}

export function ChannelReadinessCard({
  readiness,
  isSubscription,
  cameraCount,
  camerasWithSignal,
  programCount,
}: Props) {
  const t = useTranslations('channels.detail.readiness');

  const copy: Record<ReadinessItemId, { title: string; description: string }> = {
    cameras: {
      title: t('camerasTitle'),
      description: t('camerasDone', { withSignal: camerasWithSignal, total: cameraCount }),
    },
    programs: {
      title: t('programsTitle'),
      description: t('programsDone', { count: programCount }),
    },
    pricing: isSubscription
      ? { title: t('pricingTitle'), description: t('pricingDone') }
      : { title: t('pricingFreeTitle'), description: t('pricingFreeDone') },
  };

  const pendingCopy: Record<ReadinessItemId, string> = {
    cameras: t('camerasPending'),
    programs: t('programsPending'),
    pricing: t('pricingPending'),
  };

  const progress = readiness.total > 0 ? readiness.doneCount / readiness.total : 0;

  return (
    <section className={styles.readiness} aria-label={t('eyebrow')}>
      <div className={styles.readinessTop}>
        <div>
          <span className={styles.eyebrow}>{t('eyebrow')}</span>
          <p className={styles.readinessHeadline}>
            {t(readiness.ready ? 'headlineReady' : 'headlinePending')}
          </p>
        </div>

        <div className={styles.readinessProgress}>
          <span className={styles.progressTrack}>
            <span className={styles.progressBar} style={{ width: `${progress * 100}%` }} />
          </span>
          <span className={styles.progressCount}>
            {t('progress', { done: readiness.doneCount, total: readiness.total })}
          </span>
        </div>
      </div>

      <ul className={styles.readinessList}>
        {readiness.items.map((item) => (
          <li
            key={item.id}
            className={`${styles.readinessItem} ${item.done ? styles.readinessItemDone : styles.readinessItemPending}`}
          >
            <span className={styles.readinessMark}>
              {item.done && <Check size={11} aria-hidden="true" />}
            </span>
            <span>
              <span className={styles.readinessItemTitle}>{copy[item.id].title}</span>
              <span className={styles.readinessItemBody}>
                {item.done ? copy[item.id].description : pendingCopy[item.id]}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
