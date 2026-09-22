import { useTranslations } from 'next-intl';
import { Pause } from 'lucide-react';
import styles from './PauseAdMock.module.scss';

/**
 * Product mock of the pause-ad takeover (hero S1) plus the floating
 * 728×90 banner, ported from the Claude Design file's HTML/CSS mock —
 * decorative, not a real player, so it's aria-hidden as a whole.
 */
export function PauseAdMock() {
  const t = useTranslations('advertisersPage.hero.mock');

  return (
    <div className={styles.wrap} aria-hidden="true">
      <div className={styles.glow} />
      <div className={styles.player}>
        <div className={styles.topBar}>
          <span className={styles.pausedPill}>
            <Pause size={10} fill="currentColor" />
            {t('paused')}
          </span>
          <span className={styles.eventTitle}>{t('event')}</span>
        </div>
        <div className={styles.takeover}>
          <span className={styles.sponsoredTag}>{t('sponsored')}</span>
          <div className={styles.copy}>
            <div className={styles.eyebrow}>{t('eyebrow')}</div>
            <div className={styles.headline}>{t('headline')}</div>
            <span className={styles.cta}>{t('cta')}</span>
          </div>
          <span className={styles.resume}>{t('resume')} ▸</span>
        </div>
      </div>
      <div className={styles.floatingBanner}>
        <span className={styles.floatingSwatch} />
        <div className={styles.floatingText}>
          <div className={styles.floatingTitle}>{t('bannerTitle')}</div>
          <div className={styles.floatingPositions}>{t('bannerPositions')}</div>
        </div>
      </div>
    </div>
  );
}
