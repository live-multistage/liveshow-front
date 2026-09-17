import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import styles from '../privacidade/page.module.scss';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('legal.terms');
  const title = t('title');
  const description = t('p1');

  return {
    title,
    description,
    alternates: { canonical: '/termos' },
    openGraph: { type: 'website', url: '/termos', title, description },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function TermsOfUsePage() {
  const t = await getTranslations('legal.terms');

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <h1 className={styles.title}>{t('title')}</h1>
        <p className={styles.updated}>{t('updatedAt')}</p>

        <section className={styles.section}>
          <p>{t('p1')}</p>
        </section>

        <section className={styles.section}>
          <p>{t('p2')}</p>
        </section>

        <section className={styles.section}>
          <p>{t('p3')}</p>
        </section>

        <section className={styles.section}>
          <p>{t('p4')}</p>
        </section>

        <section className={styles.section}>
          <p>{t('p5')}</p>
        </section>

        <section className={styles.section}>
          <p>
            {t('p6')}{' '}
            <Link href="/privacidade" className={styles.link}>
              {t('privacyLink')}
            </Link>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
