'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Skeleton } from '@live-show/design-system';
import type { PageDetail } from '@live-show/api-contracts';
import { useRestoreVersionMutation } from '../mutations/use-page-mutations';
import { usePageVersionsQuery } from '../queries/use-pages';
import { formatClock } from './EditorTopbar';
import { PageDrawer } from './PageDrawer';
import styles from './PageDrawers.module.scss';

interface Props {
  page: PageDetail;
  onClose(): void;
  /** The draft was replaced on the server: the editor must restart from the fresh page. */
  onRestored(): void;
}

export function HistoryDrawer({ page, onClose, onRestored }: Props) {
  const t = useTranslations('platformAdmin.pageEditor.history');
  const locale = useLocale();
  const { data: versions, isError } = usePageVersionsQuery(page.id, { enabled: true });
  const restore = useRestoreVersionMutation(page.id);
  const [asking, setAsking] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);

  const live = versions?.find((v) => v.isLive)?.number;
  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString(locale, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const confirmRestore = async () => {
    if (asking === null) return;
    setFailed(false);
    try {
      await restore.mutateAsync(asking);
      setAsking(null);
      onRestored();
    } catch {
      setFailed(true);
    }
  };

  return (
    <PageDrawer label={t('label')} heading={t('heading')} closeLabel={t('close')} onClose={onClose}>
      <div className={styles.draftCard}>
        <div className={styles.versionHead}>
          <span className={styles.pillDraft}>{t('draft')}</span>
          <span className={styles.versionDate}>{t('draftAt', { time: formatClock(page.draftUpdatedAt, locale) })}</span>
        </div>
        {live !== undefined && (
          <span className={styles.hint}>{page.hasUnpublishedChanges ? t('draftDiffers', { version: live }) : t('draftSame', { version: live })}</span>
        )}
      </div>
      {isError && <p className={styles.error} role="alert">{t('loadError')}</p>}
      {!versions && !isError && <Skeleton className={styles.skelLine} />}
      {versions?.length === 0 && <span className={styles.hint}>{t('empty')}</span>}
      {versions?.map((version) => (
        <div key={version.number} className={styles.version} data-testid="version-row">
          <div className={styles.versionHead}>
            <span className={styles.pillVersion}>{t('version', { number: version.number })}</span>
            {version.isLive && <span className={styles.pillLive}>{t('live')}</span>}
            <span className={styles.versionDate}>{formatDate(version.publishedAt)}</span>
          </div>
          <div className={styles.versionSummary}>{version.changeSummary}</div>
          <div className={styles.hint}>{version.publishedBy?.name ?? t('unknownAuthor')}</div>
          {!version.isLive && (
            <div>
              <Button type="button" variant="outline" size="sm" onClick={() => { setFailed(false); setAsking(version.number); }}>{t('restore')}</Button>
            </div>
          )}
        </div>
      ))}
      <Dialog open={asking !== null} onOpenChange={(open) => !open && !restore.isPending && setAsking(null)}>
        <DialogContent role="alertdialog">
          <DialogHeader>
            <DialogTitle>{t('restoreTitle', { number: asking ?? '' })}</DialogTitle>
            <DialogDescription>{t('restoreText')}</DialogDescription>
          </DialogHeader>
          {failed && <p className={styles.error} role="alert">{t('restoreError')}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={restore.isPending} onClick={() => setAsking(null)}>{t('cancel')}</Button>
            <Button type="button" disabled={restore.isPending} onClick={() => void confirmRestore()}>{t('restoreConfirm')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageDrawer>
  );
}
