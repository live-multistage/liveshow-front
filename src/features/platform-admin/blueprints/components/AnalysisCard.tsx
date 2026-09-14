'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { AlertTriangle } from 'lucide-react';
import type { BlueprintVersionDto } from '@live-show/api-contracts';
import styles from './AnalysisCard.module.scss';

// Design B1 right column: analysis of the newest version, each error linking
// to the node it points at in the (Task 2) editor.
export function AnalysisCard({ blueprintId, version }: { blueprintId: string; version: BlueprintVersionDto }) {
  const t = useTranslations('platformAdmin.blueprints');

  return (
    <div className={styles.card}>
      <h2 className={styles.title}>{t('detail.analysisErrors')}</h2>
      <p className={styles.sub}>v{version.version} · {version.publishedAt ? t('detail.published') : t('detail.draft')}</p>
      {version.analysis.ok ? (
        <p className={styles.ok}>{t('detail.analysisOk')}</p>
      ) : (
        <ul className={styles.list}>
          {version.analysis.errors.map((e, i) => (
            <li key={`${e.nodeId ?? 'graph'}-${i}`} className={styles.row}>
              <AlertTriangle size={15} className={styles.icon} />
              <div className={styles.body}>
                <div className={styles.headline}>
                  {e.nodeId && <span className={styles.node}>{e.nodeId}</span>}
                  {t(`errors.${e.code}`)}
                </div>
                <div className={styles.detail}>{e.message}</div>
                <Link className={styles.link} href={`/dashboard/platform/blueprints/${blueprintId}/editor?version=${version.id}${e.nodeId ? `&node=${e.nodeId}` : ''}`}>
                  {t('detail.viewInEditor')}
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
