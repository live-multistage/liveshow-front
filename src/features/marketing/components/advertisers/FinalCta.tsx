import { useTranslations } from 'next-intl';
import { ArrowRight } from 'lucide-react';
import { Reveal } from '../shared/Reveal';
import { ADS_SIGNUP_URL, ADS_LOGIN_URL } from '../../constants';
import styles from './FinalCta.module.scss';

export function FinalCta() {
  const t = useTranslations('advertisersPage.finalCta');

  return (
    <section className={styles.section}>
      <Reveal as="div" variant="scale" className={styles.panel}>
        <div className={styles.glow} />
        <div className={styles.watermark} aria-hidden="true">
          {t('watermark')}
        </div>
        <div className={styles.content}>
          <h2 className={styles.title}>{t('title')}</h2>
          <div className={styles.actions}>
            <a href={ADS_SIGNUP_URL} className={styles.cta}>
              {t('cta')}
              <ArrowRight size={17} strokeWidth={2.4} />
            </a>
            <a href={ADS_LOGIN_URL} className={styles.loginLink}>
              {t('login')}
            </a>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
