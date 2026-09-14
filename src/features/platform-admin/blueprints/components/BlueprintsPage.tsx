'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { AlertCircle, Sparkles } from 'lucide-react';
import { Button, Skeleton } from '@live-show/design-system';
import { PlatformPageShell } from '../../components/PlatformPageShell';
import tableStyles from '../../components/PlatformTable.module.scss';
import { useBlueprintsQuery } from '../queries/blueprints.queries';
import { BlueprintStatusPill } from './BlueprintStatusPill';
import { FlagOffBanner } from './FlagOffBanner';
import { NewBlueprintDialog } from './NewBlueprintDialog';
import styles from './BlueprintsPage.module.scss';

function fmtUpdated(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const hours = diffMs / 3_600_000;
  if (hours < 1) return `há ${Math.max(1, Math.round(diffMs / 60_000))} min`;
  if (hours < 24) return `há ${Math.round(hours)} h`;
  return date.toLocaleDateString('pt-BR');
}

interface Props {
  blueprintsEnabled?: boolean;
}

// Design group A: list of blueprints. `blueprintsEnabled` gates only the
// amber banner (spec D10) — creating/publishing stays available with the
// flag off.
export function BlueprintsPage({ blueprintsEnabled = true }: Props) {
  const t = useTranslations('platformAdmin.blueprints');
  const router = useRouter();
  const { data, isLoading, isError, refetch } = useBlueprintsQuery();
  const [dialogOpen, setDialogOpen] = useState(false);

  const newButton = <Button onClick={() => setDialogOpen(true)}>{t('new')}</Button>;

  if (isError) {
    return (
      <PlatformPageShell group={t('group')} title={t('title')} subtitle={t('subtitle')}>
        <FlagOffBanner visible={!blueprintsEnabled} />
        <div className={styles.stateBox}>
          <div className={styles.errorIcon}><AlertCircle size={28} /></div>
          <p className={styles.stateTitle}>{t('errorState')}</p>
          <Button variant="outline" onClick={() => refetch()}>{t('retry')}</Button>
        </div>
      </PlatformPageShell>
    );
  }

  return (
    <PlatformPageShell group={t('group')} title={t('title')} subtitle={t('subtitle')} actions={newButton}>
      <FlagOffBanner visible={!blueprintsEnabled} />

      {isLoading && (
        <div className={tableStyles.card}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={styles.skeletonRow}>
              <Skeleton className={styles.skeletonName} />
              <Skeleton className={styles.skeletonPill} />
              <Skeleton className={styles.skeletonSmall} />
              <Skeleton className={styles.skeletonSmall} />
            </div>
          ))}
        </div>
      )}

      {!isLoading && data && data.length === 0 && (
        <div className={styles.stateBox}>
          <div className={styles.emptyIcon}><Sparkles size={30} /></div>
          <p className={styles.stateTitle}>{t('empty')}</p>
          <p className={styles.stateHint}>{t('emptyHint')}</p>
          {newButton}
        </div>
      )}

      {!isLoading && data && data.length > 0 && (
        <div className={`${tableStyles.scroll} ${styles.tableWrap}`}>
          <table className={tableStyles.card}>
            <thead className={tableStyles.head}>
              <tr>
                {(['name', 'status', 'version', 'started', 'completed', 'cancelled', 'failed', 'updated'] as const).map((c) => (
                  <th key={c}>{t(`columns.${c}`)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((b) => (
                <tr
                  key={b.id}
                  className={`${tableStyles.row} ${styles.clickableRow}`}
                  onClick={() => router.push(`/dashboard/platform/blueprints/${b.id}`)}
                >
                  <td data-label={t('columns.name')}>
                    <Link className={tableStyles.primaryLink} href={`/dashboard/platform/blueprints/${b.id}`} onClick={(e) => e.stopPropagation()}>
                      {b.name}
                    </Link>
                    {b.description && <div className={styles.desc}>{b.description}</div>}
                  </td>
                  <td data-label={t('columns.status')}><BlueprintStatusPill status={b.status} /></td>
                  <td data-label={t('columns.version')} className={tableStyles.mono}>{b.latestVersion ? `v${b.latestVersion}` : '—'}</td>
                  <td data-label={t('columns.started')} className={tableStyles.mono}>{b.counts7d.started}</td>
                  <td data-label={t('columns.completed')} className={tableStyles.mono}>{b.counts7d.completed}</td>
                  <td data-label={t('columns.cancelled')} className={tableStyles.mono}>{b.counts7d.cancelled}</td>
                  <td data-label={t('columns.failed')} className={tableStyles.mono}>{b.counts7d.failed}</td>
                  <td data-label={t('columns.updated')} className={tableStyles.mono}>{fmtUpdated(b.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <NewBlueprintDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={(id) => router.push(`/dashboard/platform/blueprints/${id}`)}
      />
    </PlatformPageShell>
  );
}
