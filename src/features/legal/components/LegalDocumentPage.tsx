import Link from 'next/link';
import { getFormatter, getLocale, getTranslations } from 'next-intl/server';
import type { LegalDocumentKind, LegalDocumentVersion } from '@live-show/api-contracts';
import { LegalMarkdown } from './LegalMarkdown';
import { pickLocaleContent } from '../utils/pick-locale-content';
import styles from '@/app/(public)/privacidade/page.module.scss';

const BASE_PATH: Record<LegalDocumentKind, string> = { privacy: '/privacidade', terms: '/termos' };

interface Props {
  kind: LegalDocumentKind;
  doc: LegalDocumentVersion | null;
  isCurrent: boolean;
}

export async function LegalDocumentPage({ kind, doc, isCurrent }: Props) {
  const t = await getTranslations('legal.ui');
  const format = await getFormatter();
  const locale = await getLocale();
  const title = t(kind === 'privacy' ? 'privacyTitle' : 'termsTitle');
  const base = BASE_PATH[kind];

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <h1 className={styles.title}>{title}</h1>
        {!doc ? (
          <p>{t('unavailable')}</p>
        ) : (
          <>
            <p className={styles.updated}>
              {t('updatedAt', { date: format.dateTime(new Date(doc.publishedAt), { dateStyle: 'long' }) })} ·{' '}
              {t('versionLabel', { version: doc.version })} ·{' '}
              <Link href={`${base}/versoes`} className={styles.link}>
                {t('history')}
              </Link>
            </p>
            {!isCurrent && (
              <p className={styles.updated}>
                {t('viewingOld', { version: doc.version })}{' '}
                <Link href={base} className={styles.link}>
                  {t('viewCurrent')}
                </Link>
              </p>
            )}
            <LegalMarkdown source={pickLocaleContent(doc.content, locale)} />
          </>
        )}
      </div>
    </div>
  );
}
