'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import type { LegalDocumentKind, LegalDocumentVersion } from '@live-show/api-contracts';
import { PlatformPageShell } from '../../components/PlatformPageShell';
import { useLegalVersionsQuery } from '../queries/use-legal-admin';
import { LEGAL_KINDS, formatLegalDate } from '../utils/legal-doc';
import { LegalDocumentCard } from './LegalDocumentCard';
import { LegalEditor } from './LegalEditor';
import { LegalHistoryDrawer } from './LegalHistoryDrawer';
import styles from './LegalDocumentsPage.module.scss';

// SUPER_ADMIN: list of legal documents, markdown editor with publish
// confirmation, and a version history drawer.
export function LegalDocumentsPage() {
  const t = useTranslations('platformAdmin.legal');
  const [editing, setEditing] = useState<LegalDocumentKind | null>(null);
  const [historyFor, setHistoryFor] = useState<LegalDocumentKind | null>(null);

  const onPublished = (version: LegalDocumentVersion) => {
    toast.success(t('toast', { n: version.version, doc: t(`docs.${version.document}`) }));
    setEditing(null);
  };

  return (
    <>
      {editing ? (
        <LegalEditor
          kind={editing}
          onClose={() => setEditing(null)}
          onOpenHistory={() => setHistoryFor(editing)}
          onPublished={onPublished}
        />
      ) : (
        <PlatformPageShell group="CONFIG & GOVERNANÇA" title={t('title')} subtitle={t('subtitle')}>
          <div className={styles.grid}>
            <div className={styles.cards}>
              {LEGAL_KINDS.map((kind) => (
                <LegalDocumentCard
                  key={kind}
                  kind={kind}
                  onEdit={() => setEditing(kind)}
                  onHistory={() => setHistoryFor(kind)}
                />
              ))}
            </div>
            <LegalRail />
          </div>
        </PlatformPageShell>
      )}
      <LegalHistoryDrawer kind={historyFor} onClose={() => setHistoryFor(null)} />
    </>
  );
}

// Recent publications across both documents, derived from the version lists.
function LegalRail() {
  const t = useTranslations('platformAdmin.legal');
  const locale = useLocale();
  const terms = useLegalVersionsQuery('terms').data;
  const privacy = useLegalVersionsQuery('privacy').data;

  const recent = [
    ...(terms ?? []).map((v) => ({ ...v, kind: 'terms' as const })),
    ...(privacy ?? []).map((v) => ({ ...v, kind: 'privacy' as const })),
  ]
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
    .slice(0, 5);

  return (
    <aside className={styles.rail}>
      <section className={styles.panel}>
        <div className={styles.eyebrow}>{t('rail.recent')}</div>
        {recent.length === 0 && <div className={styles.empty}>{t('rail.empty')}</div>}
        {recent.map((v) => (
          <div key={`${v.kind}-${v.version}`} className={styles.row}>
            <span className={styles.rowDot} />
            <div>
              <div className={styles.rowTitle}>{t(`docs.${v.kind}`)} · v{v.version}</div>
              <div className={styles.rowSub}>{formatLegalDate(v.publishedAt, locale, true)}</div>
            </div>
          </div>
        ))}
      </section>
      <section className={styles.panel}>
        <div className={styles.eyebrow}>{t('rail.howEyebrow')}</div>
        <p className={styles.how}>{t('rail.howText')}</p>
      </section>
    </aside>
  );
}
