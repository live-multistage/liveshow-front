import { useTranslations } from 'next-intl';
import { Reveal } from '../shared/Reveal';
import { SectionHeader } from '../shared/SectionHeader';
import { PositionMock, type PositionMockKind } from './PositionMock';
import styles from './PositionsSection.module.scss';

interface PositionItem {
  title: string;
  text: string;
}

const MOCK_KINDS: PositionMockKind[] = ['feed', 'event', 'checkout', 'post', 'preroll', 'pause'];

export function PositionsSection() {
  const t = useTranslations('advertisersPage');
  const items = t.raw('positions.items') as PositionItem[];

  const mockCopy = {
    skipLabel: t('positions.mock.skipLabel'),
    sponsored: t('hero.mock.sponsored'),
    headline: t('positions.mock.pauseHeadline'),
    cta: t('positions.mock.pauseCta'),
  };

  return (
    <section id="posicoes" className={styles.section}>
      <div className={styles.header}>
        <SectionHeader label={t('positions.label')} title={t('positions.title')} text={t('positions.subtitle')} />
      </div>
      <Reveal as="div" delay={60} className={styles.trail}>
        {items.map((item, i) => (
          <div key={item.title} className={styles.card}>
            <div className={styles.mockFrame}>
              <PositionMock kind={MOCK_KINDS[i] ?? 'feed'} copy={mockCopy} />
            </div>
            <div className={styles.body}>
              <div className={styles.numRow}>
                <span className={styles.num}>{i + 1}</span>
                <h3 className={styles.title}>{item.title}</h3>
              </div>
              <p className={styles.text}>{item.text}</p>
            </div>
          </div>
        ))}
      </Reveal>
    </section>
  );
}
