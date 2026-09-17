import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import styles from './page.module.scss';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('legal.privacy');
  const title = t('title');
  const description = t('intro');

  return {
    title,
    description,
    alternates: { canonical: '/privacidade' },
    openGraph: { type: 'website', url: '/privacidade', title, description },
    twitter: { card: 'summary_large_image', title, description },
  };
}

// Sections render in this order; each one's copy lives under the same key in
// legal.privacy so pt/en/es stay in sync (packages/i18n-messages).
const SECTIONS = [
  { key: 'controller', paragraphs: ['body'] },
  {
    key: 'dataWeCollect',
    paragraphs: [
      'account',
      'session',
      'payments',
      'fiscal',
      'streaming',
      'chat',
      'communications',
      'analytics',
      'cookies',
    ],
  },
  { key: 'legalBases', paragraphs: ['contract', 'legalObligation', 'consent', 'legitimateInterest'] },
  {
    key: 'sharing',
    paragraphs: ['intro', 'payments', 'fiscal', 'auth', 'push', 'infra', 'observability', 'noSale'],
  },
  { key: 'transfers', paragraphs: ['body'] },
  { key: 'retention', paragraphs: ['analytics', 'ads', 'sessions', 'account', 'orders'] },
  { key: 'deletion', paragraphs: ['body'] },
  { key: 'consent', paragraphs: ['body'] },
  { key: 'minors', paragraphs: ['body'] },
  { key: 'security', paragraphs: ['body'] },
  { key: 'changes', paragraphs: ['body'] },
] as const;

export default async function PrivacyPolicyPage() {
  const t = await getTranslations('legal.privacy');
  const dpoEmail = t('dpo.email');

  // Rights and DPO carry links, so they are written out instead of looping.
  const rightsIndex = SECTIONS.findIndex((section) => section.key === 'deletion');

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <h1 className={styles.title}>{t('title')}</h1>
        <p className={styles.updated}>{t('updatedAt')}</p>

        <section className={styles.section}>
          <p>{t('intro')}</p>
        </section>

        {SECTIONS.slice(0, rightsIndex).map((section) => (
          <section key={section.key} className={styles.section}>
            <h2>{t(`${section.key}.title`)}</h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph}>{t(`${section.key}.${paragraph}`)}</p>
            ))}
          </section>
        ))}

        <section className={styles.section}>
          <h2>{t('rights.title')}</h2>
          <p>
            {t('rights.body')}{' '}
            <Link href="/settings#privacidade" className={styles.link}>
              {t('rights.settingsLink')}
            </Link>
            .
          </p>
          <p>{t('rights.response')}</p>
        </section>

        {SECTIONS.slice(rightsIndex).map((section) => (
          <section key={section.key} className={styles.section}>
            <h2>{t(`${section.key}.title`)}</h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph}>{t(`${section.key}.${paragraph}`)}</p>
            ))}
          </section>
        ))}

        <section className={styles.section}>
          <h2>{t('dpo.title')}</h2>
          <p>
            {t('dpo.body')}{' '}
            <a href={`mailto:${dpoEmail}`} className={styles.link}>
              {dpoEmail}
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
