'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Label, Skeleton, Textarea } from '@live-show/design-system';
import { PAGE_LIMITS, type DraftConflict, type PageDetail, type PublishDiffResponse } from '@live-show/api-contracts';
import { usePublishPageMutation, type PublishError } from '../mutations/use-page-mutations';
import { usePublishDiffQuery } from '../queries/use-pages';
import styles from './PageDrawers.module.scss';

interface Props {
  page: PageDetail;
  /** Latest revision the autosave has persisted: the optimistic-lock base for the publish. */
  revision: number;
  /** No unsaved edits and no save in flight; the diff and the publish both describe the saved draft. */
  settled: boolean;
  onClose(): void;
  onPublished(version: number): void;
  onConflict(conflict: DraftConflict): void;
}

const KINDS = ['added', 'removed', 'edited', 'hidden'] as const;

function ChangeCounts({ diff }: { diff: PublishDiffResponse }) {
  const t = useTranslations('platformAdmin.pageEditor.publish');
  const parts = KINDS.filter((kind) => diff[kind] > 0).map((kind) => t(`${kind}${diff[kind] === 1 ? 'One' : 'Many'}`, { count: diff[kind] }));
  return <>{parts.join(' · ')}</>;
}

export function PublishDialog({ page, revision, settled, onClose, onPublished, onConflict }: Props) {
  const t = useTranslations('platformAdmin.pageEditor.publish');
  const [summary, setSummary] = useState('');
  const [failed, setFailed] = useState(false);
  const { data: diff } = usePublishDiffQuery(page.id, { enabled: settled });
  const publish = usePublishPageMutation(page.id);

  const changeSummary = summary.trim();
  const canPublish = settled && !!diff?.hasChanges && changeSummary.length > 0 && !publish.isPending;
  const nextVersion = diff?.nextVersionNumber ?? (page.publishedVersion ?? 0) + 1;

  const submit = async () => {
    setFailed(false);
    try {
      const saved = await publish.mutateAsync({ changeSummary, baseRevision: revision });
      onPublished(saved.number);
    } catch (error) {
      const conflict = (error as PublishError).conflict;
      if (conflict) return onConflict(conflict);
      setFailed(true);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !publish.isPending && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('title', { version: nextVersion })}</DialogTitle>
          <DialogDescription>
            {page.publishedVersion === null
              ? t('descriptionFirst', { slug: page.slug })
              : t('description', { slug: page.slug, live: page.publishedVersion })}
          </DialogDescription>
        </DialogHeader>
        <div className={styles.changes}>
          <span className={styles.group}>{t('changes')}</span>
          {!settled || !diff ? (
            <>
              {!settled && <span className={styles.hint}>{t('saving')}</span>}
              <Skeleton className={styles.skelLine} />
            </>
          ) : diff.hasChanges ? (
            <ChangeCounts diff={diff} />
          ) : (
            <span>{page.publishedVersion === null ? t('nothingFirst') : t('nothing', { version: page.publishedVersion })}</span>
          )}
        </div>
        <div className={styles.field}>
          <Label htmlFor="publish-summary">{t('summary')}</Label>
          <Textarea
            id="publish-summary"
            rows={2}
            max={PAGE_LIMITS.changeSummaryMax}
            maxLength={PAGE_LIMITS.changeSummaryMax}
            value={summary}
            disabled={publish.isPending}
            onChange={(event) => setSummary(event.target.value)}
          />
          <span className={styles.hint}>{t('summaryHint')}</span>
        </div>
        {failed && <p className={styles.error} role="alert">{t('error')}</p>}
        <DialogFooter>
          <Button type="button" variant="outline" disabled={publish.isPending} onClick={onClose}>{t('cancel')}</Button>
          <Button type="button" disabled={!canPublish} onClick={() => void submit()}>
            {publish.isPending ? t('publishing') : t('confirm', { version: nextVersion })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
