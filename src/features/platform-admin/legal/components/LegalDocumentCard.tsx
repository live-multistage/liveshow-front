'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Clock, Pencil } from 'lucide-react';
import type { LegalDocumentKind } from '@live-show/api-contracts';
import { Badge, Button, Skeleton } from '@live-show/design-system';
import { useLegalCurrentQuery, useLegalVersionsQuery } from '../queries/use-legal-admin';
import { LEGAL_LOCALES, PUBLIC_PATH, formatLegalDate, toTexts } from '../utils/legal-doc';
import styles from './LegalDocumentCard.module.scss';

interface Props {
  kind: LegalDocumentKind;
  onEdit: () => void;
  onHistory: () => void;
}

export function LegalDocumentCard({ kind, onEdit, onHistory }: Props) {
  const t = useTranslations('platformAdmin.legal');
  const locale = useLocale();
  const current = useLegalCurrentQuery(kind);
  const versions = useLegalVersionsQuery(kind);
  const name = t(`docs.${kind}`);
  const isEmpty = versions.data?.length === 0;
  const doc = current.data;

  if (current.isLoading && !isEmpty) return <CardSkeleton />;

  if (current.isError && !isEmpty) {
    return (
      <section className={styles.card} aria-label={name}>
        <div className={styles.error}>
          <p>{t('loadError')}</p>
          <Button variant="outline" size="sm" onClick={() => current.refetch()}>{t('retry')}</Button>
        </div>
      </section>
    );
  }

  const texts = doc ? toTexts(doc.content) : null;

  return (
    <section className={styles.card} aria-label={name}>
      <div className={styles.body}>
        <div className={styles.top}>
          <div>
            <div className={styles.path}>{PUBLIC_PATH[kind]}</div>
            <h2 className={styles.name}>{name}</h2>
          </div>
          {doc && <Badge variant="outline" className={styles.version}>{t('versionBadge', { n: doc.version })}</Badge>}
        </div>

        {doc && texts ? (
          <>
            <div className={styles.meta}>{t('publishedOn', { date: formatLegalDate(doc.publishedAt, locale) })}</div>
            <div className={styles.summary}>{doc.changeSummary}</div>
            <div className={styles.langs}>
              <span className={styles.langsLabel}>{t('languages')}</span>
              {LEGAL_LOCALES.map((l) => {
                const present = texts[l].trim() !== '';
                return (
                  <span
                    key={l}
                    className={present ? styles.lang : `${styles.lang} ${styles.langOff}`}
                    title={present ? undefined : t('langFallbackTitle')}
                  >
                    {l.toUpperCase()}
                  </span>
                );
              })}
              <span className={styles.langNote}>{t('langFallback')}</span>
            </div>
          </>
        ) : (
          <div className={styles.empty}>
            <strong>{t('empty.title')}</strong>
            <span>{t('empty.text')}</span>
          </div>
        )}
      </div>

      <div className={styles.footer}>
        {doc ? (
          <>
            <Button size="sm" onClick={onEdit}><Pencil size={13} /> {t('edit')}</Button>
            <Button size="sm" variant="outline" onClick={onHistory}><Clock size={13} /> {t('history')}</Button>
            <a className={styles.public} href={PUBLIC_PATH[kind]} target="_blank" rel="noopener noreferrer">
              {t('viewPublic')} ↗
            </a>
          </>
        ) : (
          <Button size="sm" onClick={onEdit}>{t('empty.cta')}</Button>
        )}
      </div>
    </section>
  );
}

function CardSkeleton() {
  return (
    <div className={styles.card} aria-busy="true">
      <div className={styles.body}>
        <Skeleton className={styles.skelLine} />
        <Skeleton className={styles.skelTitle} />
        <Skeleton className={styles.skelBlock} />
      </div>
    </div>
  );
}
