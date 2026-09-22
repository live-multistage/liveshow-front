import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Handshake } from 'lucide-react';
import { Reveal } from '../shared/Reveal';
import styles from './OrganizerCrossSection.module.scss';

export function OrganizerCrossSection() {
  const t = useTranslations('advertisersPage.organizerCross');

  return (
    <section className={styles.section}>
      <Reveal as="div" className={styles.band}>
        <div className={styles.left}>
          <span className={styles.icon}>
            <Handshake size={19} strokeWidth={2} />
          </span>
          <div className={styles.text}>{t('text')}</div>
        </div>
        <Link href="/be-partner" className={styles.link}>
          {t('link')} <span aria-hidden="true">→</span>
        </Link>
      </Reveal>
    </section>
  );
}
