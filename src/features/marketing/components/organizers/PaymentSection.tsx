import { CreditCard } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Reveal } from '../shared/Reveal';
import { SectionHeader } from '../shared/SectionHeader';
import styles from './PaymentSection.module.scss';

const CARD_KEYS = ['percent', 'payout', 'cards'] as const;

export function PaymentSection() {
  const t = useTranslations('organizersPage');

  const title = (
    <>
      {t('payment.title')} <span className={styles.accent}>{t('payment.titleAccent')}</span>
    </>
  );

  return (
    <section className={styles.section}>
      <div className={styles.glow} />
      <div className={styles.container}>
        <SectionHeader label={t('payment.label')} title={title} align="center" maxTitleCh={16} size="lg" />

        <div className={styles.grid}>
          {CARD_KEYS.map((key, i) => (
            <Reveal as="div" key={key} delay={i * 100} className={styles.card}>
              <div className={styles.glyph}>
                {key === 'percent' && '%'}
                {key === 'payout' && '→'}
                {key === 'cards' && <CreditCard size={40} strokeWidth={1.6} />}
              </div>
              <div className={styles.title}>{t(`payment.cards.${key}.title`)}</div>
              <p className={styles.text}>{t(`payment.cards.${key}.text`)}</p>
            </Reveal>
          ))}
        </div>

        <Reveal as="div" delay={240} className={styles.note}>
          {t('payment.note')}
        </Reveal>
      </div>
    </section>
  );
}
