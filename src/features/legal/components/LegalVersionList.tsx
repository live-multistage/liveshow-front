import Link from 'next/link';
import { getFormatter, getTranslations } from 'next-intl/server';
import type { LegalDocumentKind, LegalDocumentVersionSummary } from '@live-show/api-contracts';
import styles from '@/app/(public)/privacidade/page.module.scss';

interface Props {
  kind: LegalDocumentKind;
  versions: LegalDocumentVersionSummary[] | null;
}

export async function LegalVersionList({ kind, versions }: Props) {
  const t = await getTranslations('legal.ui');
  const format = await getFormatter();
  const base = kind === 'privacy' ? '/privacidade' : '/termos';
  const title = t(kind === 'privacy' ? 'privacyTitle' : 'termsTitle');

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <h1 className={styles.title}>{t('historyTitle', { title })}</h1>
        {!versions ? (
          <p>{t('unavailable')}</p>
        ) : (
          <ol className={styles.section}>
            {versions.map((v) => (
              <li key={v.version}>
                <Link href={`${base}/versoes/${v.version}`} className={styles.link}>
                  {t('versionLabel', { version: v.version })}
                </Link>{' '}
                — {format.dateTime(new Date(v.publishedAt), { dateStyle: 'long' })} — {v.changeSummary}
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
