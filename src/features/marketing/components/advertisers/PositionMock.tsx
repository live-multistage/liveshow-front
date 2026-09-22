import { Check, Play } from 'lucide-react';
import styles from './PositionMock.module.scss';

export type PositionMockKind = 'feed' | 'event' | 'checkout' | 'post' | 'preroll' | 'pause';

interface PositionMockCopy {
  /** "PULAR EM 5s" — pre-roll skip countdown label. */
  skipLabel: string;
  /** Shared with the hero pause-ad mock: "PATROCINADO". */
  sponsored: string;
  /** Shared with the hero pause-ad mock, shortened for the small card. */
  headline: string;
  cta: string;
}

/**
 * Tiny illustrative mock per journey stop (S3) — decorative, not a real
 * screen, so format labels like "300×600" stay as design constants (same
 * precedent as HeroPlayerMock's CAM codes); only user-facing prose is passed
 * in translated from the parent.
 */
export function PositionMock({ kind, copy }: { kind: PositionMockKind; copy: PositionMockCopy }) {
  if (kind === 'feed') {
    return (
      <div className={styles.wrap}>
        <div className={styles.row}>
          <span className={styles.card} />
          <span className={styles.card} />
          <span className={styles.card} />
        </div>
        <div className={styles.adBarH}>BANNER 728×90</div>
      </div>
    );
  }

  if (kind === 'event') {
    return (
      <div className={styles.wrap}>
        <div className={styles.rowFlex}>
          <div className={styles.colMain}>
            <span className={styles.cardTall} />
            <span className={styles.skel} style={{ width: '70%' }} />
            <span className={styles.skelDim} style={{ width: '45%' }} />
          </div>
          <div className={styles.adBarV}>300×600</div>
        </div>
      </div>
    );
  }

  if (kind === 'checkout') {
    return (
      <div className={styles.wrap}>
        <div className={styles.lineRow}>
          <span className={styles.skel} style={{ width: '40%' }} />
          <span className={styles.skelDim} style={{ width: '18%' }} />
        </div>
        <div className={styles.lineRow}>
          <span className={styles.skelDim} style={{ width: '50%' }} />
          <span className={styles.skelDim} style={{ width: '16%' }} />
        </div>
        <div className={styles.adBarH}>BANNER</div>
      </div>
    );
  }

  if (kind === 'post') {
    return (
      <div className={styles.wrap}>
        <div className={styles.checkRow}>
          <span className={styles.checkIcon}>
            <Check size={16} strokeWidth={3} />
          </span>
          <span className={styles.skelDim} style={{ width: '45%' }} />
        </div>
        <div className={styles.adBarH}>BANNER</div>
      </div>
    );
  }

  if (kind === 'preroll') {
    return (
      <div className={styles.prerollWrap}>
        <span className={styles.adTag}>AD</span>
        <span className={styles.playIcon}>
          <Play size={20} fill="currentColor" strokeWidth={0} />
        </span>
        <span className={styles.skipTag}>{copy.skipLabel}</span>
      </div>
    );
  }

  return (
    <div className={styles.pauseWrap}>
      <span className={styles.sponsoredTag}>{copy.sponsored}</span>
      <div className={styles.pauseHeadline}>{copy.headline}</div>
      <span className={styles.pauseCta}>{copy.cta} ▸</span>
    </div>
  );
}
