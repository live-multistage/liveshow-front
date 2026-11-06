'use client';

import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { AlertTriangle } from 'lucide-react';
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Label, Skeleton, Textarea } from '@live-show/design-system';
import { PAGE_LIMITS, walkElements, type DraftConflict, type ElementType, type PageDetail, type PageDocumentV2, type PageElement } from '@live-show/api-contracts';
import { usePublishPageMutation, type PublishError } from '../mutations/use-page-mutations';
import { usePageVersionsQuery, usePublishDiffQuery } from '../queries/use-pages';
import type { ServerIssues } from './inspector/element-issues';
import { usePuck } from './left/puck-store';
import { listPublishIssues, type PublishIssue } from './publish-issues';
import { toContractId } from './puck-data';
import styles from './PublishDialogV2.module.scss';

interface Props {
  page: PageDetail;
  document: PageDocumentV2;
  /** Refusals only the back knows (a featured event that is gone), by element id. */
  serverIssues: ServerIssues;
  /** Latest revision the autosave has persisted: the optimistic-lock base for the publish. */
  revision: number;
  /** No unsaved edits and no save in flight; the diff and the publish both describe the saved draft. */
  settled: boolean;
  onClose(): void;
  onPublished(version: number): void;
  onConflict(conflict: DraftConflict): void;
  /** The back refused the publish because this element's featured event is unavailable. */
  onFeaturedUnavailable(elementId: string): void;
}

const COUNTERS = ['added', 'edited', 'removed', 'hidden'] as const;

/** v2 publish dialog: the diff counters of the prototype, or the list of what must be fixed first. Lives inside `<Puck>` to select an element. */
export function PublishDialogV2({ page, document, serverIssues, revision, settled, onClose, onPublished, onConflict, onFeaturedUnavailable }: Props) {
  const t = useTranslations('platformAdmin.pageEditorV2.publish');
  const tTypes = useTranslations('platformAdmin.pageEditorV2.types');
  const locale = useLocale();
  const [summary, setSummary] = useState('');
  const [failed, setFailed] = useState(false);
  const issues = useMemo(() => listPublishIssues(document, serverIssues), [document, serverIssues]);
  const blocked = issues.length > 0;
  const { data, isFetching } = usePublishDiffQuery(page.id, { enabled: settled && !blocked });
  const versions = usePageVersionsQuery(page.id, { enabled: page.publishedVersion !== null });
  // A cached diff from a previous open is stale until the refetch lands.
  const diff = isFetching ? undefined : data;
  const publish = usePublishPageMutation(page.id);
  const content = usePuck((s) => s.appState.data.content) as unknown as PageElement[];
  const dispatch = usePuck((s) => s.dispatch);
  const getSelectorForId = usePuck((s) => s.getSelectorForId);

  const changeSummary = summary.trim();
  const canPublish = settled && !blocked && !!diff?.hasChanges && changeSummary.length > 0 && !publish.isPending;
  const nextVersion = diff?.nextVersionNumber ?? (page.publishedVersion ?? 0) + 1;
  const live = versions.data?.find((v) => v.isLive);
  const since = live ? new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(live.publishedAt)) : null;

  const goTo = (elementId: string) => {
    let puckId: string | null = null;
    walkElements(content, (el) => {
      const id = String((el.props as { id?: string }).id);
      if (!puckId && toContractId(id) === elementId) puckId = id;
    });
    const selector = puckId ? getSelectorForId(puckId) : undefined;
    if (selector) dispatch({ type: 'setUi', ui: { itemSelector: selector } });
    onClose();
  };

  const submit = async () => {
    setFailed(false);
    try {
      const saved = await publish.mutateAsync({ changeSummary, baseRevision: revision });
      onPublished(saved.number);
    } catch (error) {
      const { conflict, featuredUnavailable } = error as PublishError;
      if (conflict) return onConflict(conflict);
      if (featuredUnavailable) return onFeaturedUnavailable(featuredUnavailable.elementId);
      setFailed(true);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !publish.isPending && onClose()}>
      <DialogContent>
        <DialogHeader>
          <span className={styles.eyebrow}>{t('eyebrow')}</span>
          <DialogTitle>{blocked ? t(issues.length === 1 ? 'blockedOne' : 'blockedMany', { count: issues.length }) : t('title', { version: nextVersion })}</DialogTitle>
          <DialogDescription className={styles.sr}>{t('description', { slug: page.slug })}</DialogDescription>
        </DialogHeader>
        {blocked ? (
          <IssueList issues={issues} typeLabel={(type) => tTypes(type)} onGoTo={goTo} />
        ) : (
          <>
            <p className={styles.lead}>
              {page.publishedVersion === null ? t('comparedFirst') : t(since ? 'comparedSince' : 'compared', { version: page.publishedVersion, since: since ?? '' })}
            </p>
            {!settled || !diff ? (
              <>
                {!settled && <span className={styles.hint}>{t('saving')}</span>}
                <Skeleton className={styles.skeleton} />
              </>
            ) : diff.hasChanges ? (
              <div className={styles.counters} data-testid="publish-counters">
                {COUNTERS.map((kind) => (
                  <div key={kind}><b>{diff[kind]}</b><span>{t(`counter.${kind}`)}</span></div>
                ))}
              </div>
            ) : (
              <p className={styles.lead}>{page.publishedVersion === null ? t('nothingFirst') : t('nothing', { version: page.publishedVersion })}</p>
            )}
            {diff?.hasChanges && (
              <p className={styles.hint}>
                {!!diff.moved && <>{t(diff.moved === 1 ? 'movedOne' : 'movedMany', { count: diff.moved })} </>}
                {!!diff.responsiveEdits && <>{t(diff.responsiveEdits === 1 ? 'responsiveOne' : 'responsiveMany', { count: diff.responsiveEdits })} </>}
                {t('dataNote')}
              </p>
            )}
            <div className={styles.field}>
              <div className={styles.labelRow}>
                <Label htmlFor="publish-summary">{t('summary')} <span className={styles.required}>*</span></Label>
                <span className={styles.count}>{summary.length}/{PAGE_LIMITS.changeSummaryMax}</span>
              </div>
              <Textarea
                id="publish-summary"
                rows={2}
                maxLength={PAGE_LIMITS.changeSummaryMax}
                value={summary}
                disabled={publish.isPending}
                onChange={(event) => setSummary(event.target.value)}
              />
              <span className={styles.hint}>{t('liveIn', { host: typeof window === 'undefined' ? '' : window.location.host, slug: page.slug })}</span>
            </div>
            {failed && <p className={styles.error} role="alert">{t('error')}</p>}
          </>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" disabled={publish.isPending} onClick={onClose}>{t(blocked ? 'close' : 'cancel')}</Button>
          <Button type="button" disabled={!canPublish} onClick={() => void submit()}>
            {publish.isPending ? t('publishing') : t('confirm', { version: nextVersion })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function IssueList({ issues, typeLabel, onGoTo }: { issues: PublishIssue[]; typeLabel(type: ElementType): string; onGoTo(elementId: string): void }) {
  const t = useTranslations('platformAdmin.pageEditorV2.publish');
  return (
    <>
      <ul className={styles.issues}>
        {issues.map((issue) => (
          <li key={`${issue.elementId}|${issue.message}`}>
            <button type="button" disabled={!issue.elementId} onClick={() => issue.elementId && onGoTo(issue.elementId)}>
              <AlertTriangle aria-hidden="true" />
              <span>
                {issue.type && <><b>{typeLabel(issue.type)}</b>{issue.sectionName && issue.type !== 'section' ? ` ${t('in')} ${issue.sectionName}` : ''}: </>}
                {issue.message}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <span className={styles.hint}>{t('blockedHint')}</span>
    </>
  );
}
