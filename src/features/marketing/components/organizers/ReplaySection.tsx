import { useTranslations } from 'next-intl';
import { Reveal } from '../shared/Reveal';
import { SectionHeader } from '../shared/SectionHeader';
import { ReplayMock } from '../mocks/ReplayMock';
import styles from './ReplaySection.module.scss';

export function ReplaySection() {
  const t = useTranslations('organizersPage');
  const bullets = t.raw('replay.bullets') as string[];

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <Reveal as="div" variant="scale" delay={120} className={styles.mockWrap}>
          <ReplayMock />
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
