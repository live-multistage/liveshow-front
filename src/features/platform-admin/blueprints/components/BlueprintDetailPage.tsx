'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { AlertTriangle, MoreHorizontal } from 'lucide-react';
import {
  Button, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@live-show/design-system';
import type { BlueprintRunDto } from '@live-show/api-contracts';
import type { AppError } from '@/lib/http/errors';
import { PlatformPageShell } from '../../components/PlatformPageShell';
import tableStyles from '../../components/PlatformTable.module.scss';
import { useBlueprintQuery } from '../queries/blueprints.queries';
import { useDeactivateBlueprintMutation, useSaveBlueprintVersionMutation } from '../mutations/blueprints.mutations';
import { BlueprintStatusPill } from './BlueprintStatusPill';
import { FlagOffBanner } from './FlagOffBanner';
import { VersionsCard } from './VersionsCard';
import { AnalysisCard } from './AnalysisCard';
import { RunsTable } from './RunsTable';
import { ImportJsonDialog } from './ImportJsonDialog';
import { RunDrawer } from './RunDrawer';
import styles from './BlueprintDetailPage.module.scss';

interface Props {
  id: string;
  blueprintsEnabled?: boolean;
}

// Design group B: blueprint detail — header/KPIs, runs + versions/analysis
// columns, and the ⋯ menu (duplicate/export/import). "Abrir editor" targets
// the Task 2 route; until that route exists the link 404s inside this
// branch, which the plan accepts.
export function BlueprintDetailPage({ id, blueprintsEnabled = true }: Props) {
  const t = useTranslations('platformAdmin.blueprints');
  const { data, isLoading, isError } = useBlueprintQuery(id);
  const deactivate = useDeactivateBlueprintMutation();
  const duplicate = useSaveBlueprintVersionMutation();
  const [message, setMessage] = useState<string | null>(null);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [selectedRun, setSelectedRun] = useState<BlueprintRunDto | null>(null);

  if (isLoading) return <PlatformPageShell group={t('group')} title="" ><div className={styles.loading} /></PlatformPageShell>;

  if (isError || !data) {
    return (
      <PlatformPageShell group={t('group')} title={t('detail.notFound')}>
        <Link className={tableStyles.primaryLink} href="/dashboard/platform/blueprints">{t('back')}</Link>
      </PlatformPageShell>
    );
  }

  const latest = data.versions[0];
  const activeVersion = data.versions.find((v) => v.id === data.activeVersionId) ?? null;

  function onDeactivate() {
    deactivate.mutate(
      { id },
      {
        onSuccess: ({ cancelledRuns }) => {
          setConfirmDeactivate(false);
          toast.success(t('detail.deactivatedToast', { count: cancelledRuns }));
        },
        onError: (err: AppError) => { setConfirmDeactivate(false); setMessage(t(`errors.${err.code ?? 'GENERIC'}`)); },
      },
    );
  }

  async function onExport() {
    if (!latest) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(latest.graph, null, 2));
      toast.success(t('detail.copied'));
    } catch {
      toast.error(t('errors.GENERIC'));
    }
  }

  function onDuplicate() {
    if (!activeVersion) return;
    duplicate.mutate(
      { id, graph: activeVersion.graph },
      { onError: (err: AppError) => setMessage(t(`errors.${err.code ?? 'GENERIC'}`)) },
    );
  }

  return (
    <PlatformPageShell group={t('group')} title={data.name} subtitle={data.description || undefined}>
      <Link className={tableStyles.primaryLink} href="/dashboard/platform/blueprints">{t('back')}</Link>

      {data.status === 'INVALID' && (
        <div className={styles.invalidBanner}>
          <AlertTriangle size={18} />
          <p>{t('detail.invalidBanner')}</p>
        </div>
      )}
      <FlagOffBanner visible={!blueprintsEnabled} />

      <div className={styles.header}>
        <div className={styles.headline}>
          <BlueprintStatusPill status={data.status} />
          {data.latestVersion && <span className={styles.versionBadge}>{t('detail.activeVersionBadge', { version: activeVersion?.version ?? data.latestVersion })}</span>}
        </div>
        <div className={styles.actions}>
          <Link className={styles.editorLink} href={`/dashboard/platform/blueprints/${id}/editor`}>{t('detail.openEditor')} →</Link>
          {data.status === 'ACTIVE' && (
            <Button variant="outline" onClick={() => setConfirmDeactivate(true)}>{t('detail.deactivate')}</Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={styles.moreBtn} aria-label={t('detail.moreActions')}><MoreHorizontal size={16} /></button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem disabled={!activeVersion} onSelect={onDuplicate}>{t('detail.duplicate')}</DropdownMenuItem>
              <DropdownMenuItem disabled={!latest} onSelect={onExport}>{t('detail.export')}</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setImportOpen(true)}>{t('detail.importTitle')}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {message && <p role="alert" className={styles.message}>{message}</p>}

      <div className={`${tableStyles.kpis} ${styles.kpis}`}>
        {(['started', 'completed', 'cancelled', 'failed'] as const).map((k) => (
          <div key={k} className={tableStyles.kpi}>
            <div className={tableStyles.kpiLabel}>{t(`kpis.${k}`)}</div>
            <div className={tableStyles.kpiValue}>{data.counts7d[k]}</div>
          </div>
        ))}
      </div>

      <div className={styles.columns}>
        <RunsTable blueprintId={id} onSelectRun={setSelectedRun} />
        <div className={styles.rightStack}>
          <VersionsCard blueprint={data} onError={setMessage} />
          {latest && <AnalysisCard blueprintId={id} version={latest} />}
        </div>
      </div>

      <Dialog open={confirmDeactivate} onOpenChange={setConfirmDeactivate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('detail.deactivateConfirmTitle')}</DialogTitle>
          </DialogHeader>
          <p className={styles.confirmBody}>{t('detail.deactivateConfirmBody')}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeactivate(false)}>{t('newDialog.cancel')}</Button>
            <Button variant="destructive" disabled={deactivate.isPending} onClick={onDeactivate}>{t('detail.deactivate')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ImportJsonDialog blueprintId={id} open={importOpen} onOpenChange={setImportOpen} />

      {selectedRun && <RunDrawer blueprintId={id} run={selectedRun} onClose={() => setSelectedRun(null)} />}
    </PlatformPageShell>
  );
}
