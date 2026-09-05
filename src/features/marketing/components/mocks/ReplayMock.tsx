import { useTranslations } from 'next-intl';
import styles from './ReplayMock.module.scss';

export function ReplayMock() {
  const t = useTranslations('organizersPage');

  return (
    <div className={styles.mock}>
      <div className={styles.stage}>
        <div className={styles.stageGrid} />
        <span className={styles.badge}>{t('replay.mock.badge')}</span>
        <div className={styles.playButton}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="#fff">
            <path d="M7 4v16l13-8z" />
          </svg>
        </div>
        <div className={styles.thumbs}>
          <span className={styles.thumbActive} />
          <span className={styles.thumb} />
          <span className={styles.thumb} />
        </div>
      </div>
      <div className={styles.timelineWrap}>
        <div className={styles.track}>
          <div className={styles.fill} />
          <div className={styles.knob} />
          <div className={[styles.tick, styles.tickA].join(' ')} />
          <div className={[styles.tick, styles.tickB].join(' ')} />
        </div>
        <div className={styles.times}>
          <span>00:00:00</span>
          <span className={styles.marker}>{t('replay.mock.marker')}</span>
          <span>03:04:31</span>
        </div>
      </div>
    </div>
  );
}
