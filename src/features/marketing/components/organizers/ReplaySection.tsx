import { useTranslations } from 'next-intl';
import { Reveal } from '../shared/Reveal';
import { SectionHeader } from '../shared/SectionHeader';
import styles from './ReplaySection.module.scss';

export function ReplaySection() {
  const t = useTranslations('organizersPage');
  const bullets = t.raw('replay.bullets') as string[];

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <Reveal as="div" variant="scale" delay={120} className={styles.mock}>
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
              <span>19:00:00</span>
              <span className={styles.marker}>{t('replay.mock.marker')}</span>
              <span>22:04:31</span>
            </div>
          </div>
        </Reveal>

        <div className={styles.textCol}>
          <SectionHeader label={t('replay.label')} title={t('replay.title')} />
          <div className={styles.bullets}>
            {bullets.map((bullet) => (
              <div key={bullet} className={styles.bulletRow}>
                <span className={styles.arrow}>→</span>
                {bullet}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
