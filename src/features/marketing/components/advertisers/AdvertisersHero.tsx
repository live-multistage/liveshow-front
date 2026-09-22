import { useTranslations } from 'next-intl';
import { ArrowRight } from 'lucide-react';
import { Reveal } from '../shared/Reveal';
import { PauseAdMock } from './PauseAdMock';
import { ADS_SIGNUP_URL, ADS_LOGIN_URL } from '../../constants';
import styles from './AdvertisersHero.module.scss';

export function AdvertisersHero() {
  const t = useTranslations('advertisersPage.hero');
  const guarantees = t.raw('guarantees') as string[];

  return (
    <section className={styles.section}>
      <div className={styles.glowTop} aria-hidden="true" />
      <div className={styles.blob} aria-hidden="true" />
      <div className={styles.container}>
        <Reveal as="div" className={styles.text}>
          <div className={styles.label}>
            <span className={styles.dot} aria-hidden="true" />
            {t('label')}
          </div>
          <h1 className={styles.title}>
            {t('title')} <span className={styles.accent}>{t('titleAccent')}</span>
          </h1>
          <p className={styles.subtitle}>{t('subtitle')}</p>
          <div className={styles.ctaRow}>
            <a href={ADS_SIGNUP_URL} className={styles.primaryCta}>
              {t('cta')}
              <ArrowRight size={17} strokeWidth={2.4} />
            </a>
            <a href="#posicoes" className={styles.secondaryLink}>
              {t('secondary')}
            </a>
          </div>
          <div className={styles.guarantees}>
            {guarantees.map((item, i) => (
              <span key={item}>
                {i > 0 ? <span className={styles.dividerDot} aria-hidden="true">·</span> : null}
                {item}
              </span>
            ))}
          </div>
          <div className={styles.loginLine}>
            {t.rich('login', { link: (chunks) => <a href={ADS_LOGIN_URL}>{chunks}</a> })}
          </div>
        </Reveal>

        <Reveal as="div" delay={120} variant="scale" className={styles.mockCol}>
          <PauseAdMock />
        </Reveal>
      </div>
    </section>
  );
}
