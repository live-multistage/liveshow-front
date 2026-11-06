'use client';

import { useEffect, useMemo, useReducer, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@live-show/design-system';
import type { PageDetail, PageSection } from '@live-show/api-contracts';
import { createEditorState, pageEditorReducer, selectInvalidSections } from '../hooks/page-editor-reducer';
import { useDraftAutosave } from '../hooks/use-draft-autosave';
import { useMediaQuery } from '../hooks/use-media-query';
import { EditorTopbar, formatClock } from './EditorTopbar';
import { SectionTree } from './SectionTree';
import styles from './PageEditor.module.scss';

// The prototype collapses the inspector at 1100px of editor width. Here the editor sits beside the always-expanded
// dashboard sidebar (256px) plus page padding, so the viewport breakpoint is 1100 + 256 + ~4 = 1360px.
// Keep in sync with the `.label` breakpoint in PageEditor.module.scss, which hides topbar labels on the same constraint.
export const COMPACT_INSPECTOR_QUERY = '(max-width: 1360px)';
const UNDO_TOAST_MS = 6000;

interface Props {
  page: PageDetail;
  onReload(): void;
  /** The last reload attempt failed: the editor stays locked on the stale draft. */
  reloadFailed?: boolean;
  onOpenLibrary?(): void;
}

// Mount with `key` = page id (+ reload token): reducer state and autosave revision must not outlive the page.
export function PageEditor({ page, onReload, reloadFailed, onOpenLibrary }: Props) {
  const t = useTranslations('platformAdmin.pageEditor');
  const locale = useLocale();
  const compact = useMediaQuery(COMPACT_INSPECTOR_QUERY);
  const [state, dispatch] = useReducer(pageEditorReducer, page.draft, createEditorState);
  const autosave = useDraftAutosave({
    pageId: page.id,
    document: state.document,
    baseRevision: page.draftRevision,
    dirty: state.dirty,
    onSaved: ({ document }) => dispatch({ type: 'markSaved', document }),
    onConflict: () => dispatch({ type: 'lock' }),
  });
  const issues = useMemo(() => selectInvalidSections(state.document), [state.document]);

  const [touched, setTouched] = useState(false);
  useEffect(() => {
    if (state.dirty) setTouched(true);
  }, [state.dirty]);

  const [dismissed, setDismissed] = useState<PageSection | null>(null);
  const removed = state.lastRemoved?.section ?? null;
  useEffect(() => {
    if (!removed) return;
    const timer = setTimeout(() => setDismissed(removed), UNDO_TOAST_MS);
    return () => clearTimeout(timer);
  }, [removed]);

  const status = autosave.status;
  const showInspector = compact ? state.selectedId !== null : true;
  const inspector = <InspectorSlot page={page} selectedId={state.selectedId} />;

  return (
    <DndProvider backend={HTML5Backend}>
      <div className={styles.editor}>
        <EditorTopbar page={page} saveStatus={status} unpublished={page.hasUnpublishedChanges || touched} onRetry={autosave.saveNow} />
        {status.kind === 'conflict' && (
          <div className={`${styles.banner} ${styles.warn}`} role="alert">
            <AlertTriangle aria-hidden="true" />
            <span className={styles.bannerText}>
              {t(status.conflict.updatedBy ? 'banner.conflict' : 'banner.conflictAnonymous', {
                name: status.conflict.updatedBy?.name,
                time: formatClock(status.conflict.updatedAt, locale),
              })}
              {reloadFailed && ` ${t('banner.reloadError')}`}
            </span>
            <Button type="button" size="sm" onClick={onReload}>{t('banner.reload')}</Button>
          </div>
        )}
        {status.kind === 'error' && (
          <div className={`${styles.banner} ${styles.err}`} role="alert">
            <AlertTriangle aria-hidden="true" />
            <span className={styles.bannerText}>{t('banner.error')}</span>
            <Button type="button" variant="outline" size="sm" onClick={autosave.saveNow}>{t('banner.retry')}</Button>
          </div>
        )}
        <div className={`${styles.body} ${showInspector && !compact ? styles.withInspector : ''}`}>
          <div className={`${styles.column} ${styles.left}`}>
            <SectionTree
              sections={state.document.sections}
              selectedId={state.selectedId}
              issues={issues}
              locked={state.locked}
              dispatch={dispatch}
              onAdd={() => onOpenLibrary?.()}
            />
          </div>
          <div className={styles.column} data-testid="preview-slot" data-selected-id={state.selectedId ?? undefined} />
          {showInspector && !compact && <div className={`${styles.column} ${styles.right}`}>{inspector}</div>}
          {showInspector && compact && (
            <aside className={styles.drawer} data-testid="inspector-drawer">
              <Button type="button" variant="ghost" size="icon" className={styles.drawerClose} aria-label={t('inspector.close')}
                onClick={() => dispatch({ type: 'select', id: null })}>
                <X aria-hidden="true" />
              </Button>
              {inspector}
            </aside>
          )}
        </div>
        {removed && removed !== dismissed && (
          <div className={styles.toast} role="status">
            <span>{t('tree.removed')}</span>
            <Button type="button" variant="outline" size="sm" onClick={() => dispatch({ type: 'undoRemove' })}>{t('tree.undo')}</Button>
          </div>
        )}
      </div>
    </DndProvider>
  );
}

// Placeholder: the properties panel arrives with the preview/inspector task.
function InspectorSlot({ page, selectedId }: { page: PageDetail; selectedId: string | null }) {
  const t = useTranslations('platformAdmin.pageEditor');
  return (
    <div className={styles.inspector} data-testid="inspector-slot" data-selected-id={selectedId ?? undefined}>
      {selectedId === null && (
        <>
          <div className={styles.inspectorHeader}>{t('inspector.pageTitle')}</div>
          <div className={styles.inspectorBody}>
            <b>{page.title}</b>
            <span className={styles.path}>/p/{page.slug}</span>
            <p className={styles.hint}>{t('inspector.emptyHint')}</p>
          </div>
        </>
      )}
    </div>
  );
}
