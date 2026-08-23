'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { ChannelCamera } from '../../hooks/useChannelCameras';
import styles from './ChannelDetail.module.scss';

interface Props {
  cameras: ChannelCamera[];
  manageHref: string;
}

export function ChannelCamerasCard({ cameras, manageHref }: Props) {
  const t = useTranslations('channels.detail.camerasCard');

  return (
    <section className={styles.railCard}>
      <div className={styles.railHeader}>
        <span className={styles.eyebrow}>{t('eyebrow')}</span>
        <Link className={styles.railLink} href={manageHref}>
          {t('manage')} →
        </Link>
      </div>

      {cameras.length === 0 ? (
        <p className={styles.help}>{t('empty')}</p>
      ) : (
        <ul className={styles.cameraList}>
          {cameras.map((camera) => (
            <li
              key={camera.id}
              className={`${styles.cameraItem} ${camera.live ? '' : styles.cameraItemOffline}`}
            >
              <span className={camera.live ? styles.dotPulse : styles.dotIdle} />
              <span>
                <span className={styles.cameraName}>{camera.name}</span>
                <span className={styles.cameraMeta}>
                  {t('meta', { status: t(camera.live ? 'statusLive' : 'statusOffline') })}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
