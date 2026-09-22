import { useTranslations } from 'next-intl';
import { Wallet } from 'lucide-react';
import { Reveal } from '../shared/Reveal';
import { SectionHeader } from '../shared/SectionHeader';
import styles from './PricingSection.module.scss';

const CARD_KEYS = ['cpm', 'cpc'] as const;

export function PricingSection() {
  const t = useTranslations('advertisersPage.pricing');
  const conditions = t.raw('conditions') as string[];

  return (
    <section className={styles.section}>
      <div className={styles.glow} />
      <div className={styles.container}>
        <SectionHeader label={t('label')} title={t('title')} align="center" maxTitleCh={16} size="lg" />

        <div className={styles.grid}>
          {CARD_KEYS.map((key, i) => (
            <Reveal as="div" key={key} delay={i * 100} className={styles.card}>
              <div className={styles.glyph}>{t(`cards.${key}.label`)}</div>
              <h3 className={styles.title}>{t(`cards.${key}.title`)}</h3>
              <p className={styles.text}>{t(`cards.${key}.text`)}</p>
            </Reveal>
          ))}
        </div>

        <Reveal as="div" delay={150} className={styles.budgetCard}>
          <span className={styles.budgetIcon}>
            <Wallet size={20} strokeWidth={2} />
          </span>
          <div>
            <div className={styles.budgetTitle}>{t('budgetTitle')}</div>
            <div className={styles.budgetText}>{t('budgetText')}</div>
          </div>
        </Reveal>

        <Reveal as="div" delay={200} className={styles.conditions}>
          {conditions.map((item, i) => (
            <span key={item}>
              {i > 0 ? (
                <span className={styles.dot} aria-hidden="true">
                  ·
                </span>
              ) : null}
              {item}
            </span>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
