import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Reveal } from '../shared/Reveal';
import { OrganizerCtaLink } from '../shared/OrganizerCtaLink';
import styles from './FinalCta.module.scss';

export function FinalCta() {
  const t = useTranslations('organizersPage');

  return (
    <section className={styles.section}>
      <Reveal as="div" variant="scale" className={styles.panel}>
        <div className={styles.glow} />
        <div className={styles.watermark}>AO VIVO</div>
        <div className={styles.content}>
          <h2 className={styles.title}>{t('finalCta.title')}</h2>
          <div className={styles.actions}>
            <OrganizerCtaLink size="xl" withArrow>
              {t('finalCta.cta')}
            </OrganizerCtaLink>
            <Link href="/help" className={styles.helpLink}>
              {t('finalCta.helpLink')} →
            </Link>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
