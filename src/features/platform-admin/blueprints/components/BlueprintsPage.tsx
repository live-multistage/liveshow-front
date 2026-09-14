'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useFormatter, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { AlertCircle, CircleHelp, Monitor, Sparkles } from 'lucide-react';
import {
  Button, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, Skeleton,
} from '@live-show/design-system';
import type { AppError } from '@/lib/http/errors';
import { blueprintErrorMessage } from '../errorMessage';
import { PlatformPageShell } from '../../components/PlatformPageShell';
import tableStyles from '../../components/PlatformTable.module.scss';
import { useBlueprintsQuery } from '../queries/blueprints.queries';
import { useCreateBlueprintMutation } from '../mutations/blueprints.mutations';
import { useWideScreen } from '../editor/useWideScreen';
import { BlueprintStatusPill } from './BlueprintStatusPill';
import { FlagOffBanner } from './FlagOffBanner';
import { NewBlueprintDialog } from './NewBlueprintDialog';
import styles from './BlueprintsPage.module.scss';

// Intl.RelativeTimeFormat (via next-intl) picks the unit and pluralizes for
// the active locale, so this needs no ICU strings of its own.
function fmtUpdated(iso: string, format: ReturnType<typeof useFormatter>): string {
  const date = new Date(iso);
  const now = Date.now();
  // next-intl needs `now` explicitly; otherwise it logs ENVIRONMENT_FALLBACK.
  if (now - date.getTime() < 86_400_000) return format.relativeTime(date, now);
  return format.dateTime(date, { dateStyle: 'short' });
}

interface Props {
  blueprintsEnabled?: boolean;
}

// Design group A: list of blueprints. `blueprintsEnabled` gates only the
// amber banner (spec D10) — creating/publishing stays available with the
// flag off.
export function BlueprintsPage({ blueprintsEnabled = true }: Props) {
  const t = useTranslations('platformAdmin.blueprints');
  const format = useFormatter();
  const router = useRouter();
  const wide = useWideScreen();
  const { data, isLoading, isError, refetch } = useBlueprintsQuery();
  const createTutorial = useCreateBlueprintMutation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [narrowNoticeOpen, setNarrowNoticeOpen] = useState(false);

  const newButton = <Button onClick={() => setDialogOpen(true)}>{t('new')}</Button>;

  // Design §C: "Tutorial" creates a throwaway draft and drops the admin into
  // the editor in guided mode; ≤1280px it can't run the tutorial at all (the
  // editor itself needs that width — useWideScreen), so it just explains why.
  function onTutorial() {
    if (!wide) { setNarrowNoticeOpen(true); return; }
    createTutorial.mutate(
      { name: t('tour.draftName'), description: t('tour.draftDescription') },
      {
        onSuccess: (summary) => router.push(`/dashboard/platform/blueprints/${summary.id}/editor?tour=first`),
        onError: (err: AppError) => toast.error(blueprintErrorMessage(t, err.code)),
      },
    );
  }

  const tutorialButton = (
    <>
      <span className={styles.tutorialDesktop}>
        <Button variant="outline" disabled={createTutorial.isPending} onClick={onTutorial}>{t('tour.entry')}</Button>
      </span>
      <span className={styles.tutorialMobile}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className={styles.tutorialMenuBtn} aria-label={t('tour.entry')}>
              <CircleHelp size={18} aria-hidden />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={onTutorial}>{t('tour.entry')}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </span>
    </>
  );

  const narrowNoticeDialog = (
    <Dialog open={narrowNoticeOpen} onOpenChange={setNarrowNoticeOpen}>
      <DialogContent className={styles.narrowNoticeContent}>
        <div className={styles.narrowNoticeIcon}><Monitor size={22} aria-hidden /></div>
        <DialogHeader>
          <DialogTitle>{t('tour.smallScreen.title')}</DialogTitle>
        </DialogHeader>
        <p className={styles.narrowNoticeBody}>{t('tour.smallScreen.body')}</p>
        <DialogFooter>
          <Button variant="outline" onClick={() => setNarrowNoticeOpen(false)}>{t('tour.smallScreen.confirm')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

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
    <PlatformPageShell group={t('group')} title={t('title')} subtitle={t('subtitle')} actions={<>{tutorialButton}{newButton}</>}>
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
          <button type="button" className={styles.emptyTutorialLink} disabled={createTutorial.isPending} onClick={onTutorial}>
            {t('tour.emptyLink')}
          </button>
        </div>
      )}

      {!isLoading && data && data.length > 0 && (
        <div className={`${tableStyles.card} ${tableStyles.scroll} ${styles.tableWrap}`}>
          <table className={tableStyles.table}>
            <thead>
              <tr className={tableStyles.headRow}>
                {(['name', 'status', 'version', 'started', 'completed', 'cancelledFailed', 'updated'] as const).map((c) => (
                  <th key={c}>{t(`columns.${c}`)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((b) => (
                <tr
                  key={b.id}
                  className={`${tableStyles.bodyRow} ${styles.clickableRow}`}
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
                  <td data-label={t('columns.cancelledFailed')} className={tableStyles.mono}>{b.counts7d.cancelled} / {b.counts7d.failed}</td>
                  <td data-label={t('columns.updated')} className={tableStyles.mono}>{fmtUpdated(b.updatedAt, format)}</td>
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
      {narrowNoticeDialog}
    </PlatformPageShell>
  );
}
