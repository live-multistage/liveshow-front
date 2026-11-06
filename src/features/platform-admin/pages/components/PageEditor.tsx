'use client';

import { useEffect, useMemo, useReducer, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@live-show/design-system';
import type { DraftConflict, PageDetail, PageSection, PageSectionType, PublicPage } from '@live-show/api-contracts';
import { countInvalidFields, createEditorState, pageEditorReducer, selectInvalidSections } from '../hooks/page-editor-reducer';
import { useDraftAutosave } from '../hooks/use-draft-autosave';
import { useMediaQuery } from '../hooks/use-media-query';
import { usePagePreviewQuery } from '../queries/use-pages';
import { EditorTopbar, formatClock } from './EditorTopbar';
import { HistoryDrawer } from './HistoryDrawer';
import { PageSettingsDrawer } from './PageSettingsDrawer';
import { PagePreview, type PreviewDevice } from './PagePreview';
import { PublishDialog } from './PublishDialog';
import { SectionInspector } from './SectionInspector';
import { SectionLibrary } from './SectionLibrary';
import { SectionTree } from './SectionTree';
import styles from './PageEditor.module.scss';

// The prototype collapses the inspector at 1100px of editor width. Here the editor sits beside the always-expanded
// dashboard sidebar (256px) plus page padding, so the viewport breakpoint is 1100 + 256 + ~4 = 1360px.
// Keep in sync with the `.label` breakpoint in PageEditor.module.scss, which hides topbar labels on the same constraint.
export const COMPACT_INSPECTOR_QUERY = '(max-width: 1360px)';
const NO_RESOLVED: PublicPage['resolved'] = { rails: {}, featured: {} };
const UNDO_TOAST_MS = 6000;
const PUBLISHED_TOAST_MS = 6000;

type Panel = 'publish' | 'history' | 'settings' | null;

interface Props {
  page: PageDetail;
  onReload(): void;
  /** The last reload attempt failed: the editor stays locked on the stale draft. */
  reloadFailed?: boolean;
}

// Mount with `key` = page id (+ reload token): reducer state and autosave revision must not outlive the page.
export function PageEditor({ page, onReload, reloadFailed }: Props) {
  const t = useTranslations('platformAdmin.pageEditor');
  const locale = useLocale();
  const compact = useMediaQuery(COMPACT_INSPECTOR_QUERY);
  const [state, dispatch] = useReducer(pageEditorReducer, page.draft, createEditorState);
  // Latest revision the server holds for this draft; publish uses it as its optimistic-lock base.
  const [revision, setRevision] = useState(page.draftRevision);
  const [panel, setPanel] = useState<Panel>(null);
  const [device, setDevice] = useState<PreviewDevice>('desktop');
  // Zero-based insertion index while the section library is open.
  const [libraryAt, setLibraryAt] = useState<number | null>(null);
  const preview = usePagePreviewQuery(page.id, revision);
  const [publishedVersion, setPublishedVersion] = useState<number | null>(null);
  const [publishConflict, setPublishConflict] = useState<DraftConflict | null>(null);
  const autosave = useDraftAutosave({
    pageId: page.id,
    document: state.document,
    // Not the `page` prop: a background refetch carries another admin's revision and would defeat the 409 lock.
    baseRevision: revision,
    dirty: state.dirty,
    onSaved: ({ document, draftRevision }) => {
      setRevision(draftRevision);
      dispatch({ type: 'markSaved', document });
    },
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

  useEffect(() => {
    if (publishedVersion === null) return;
    const timer = setTimeout(() => setPublishedVersion(null), PUBLISHED_TOAST_MS);
    return () => clearTimeout(timer);
  }, [publishedVersion]);

  const status = autosave.status;
  const conflict = status.kind === 'conflict' ? status.conflict : publishConflict;
  const settled = !state.dirty && status.kind !== 'saving' && status.kind !== 'pending';
  const invalidCount = useMemo(() => countInvalidFields(state.document), [state.document]);
  const unpublished = page.hasUnpublishedChanges || touched;

  let publishBlock: string | null = null;
  if (conflict || state.locked) publishBlock = t('publish.tipConflict');
  else if (page.status === 'ARCHIVED') publishBlock = t('publish.tipArchived');
  else if (invalidCount > 0) publishBlock = t(invalidCount === 1 ? 'publish.tipInvalidOne' : 'publish.tipInvalidMany', { count: invalidCount });
  else if (state.document.sections.length === 0) publishBlock = t('publish.tipEmpty');
  else if (!unpublished && page.publishedVersion !== null) publishBlock = t('publish.tipNothing', { version: page.publishedVersion });
  else if (!unpublished) publishBlock = t('publish.tipNothingFirst');

  const onPublishConflict = (found: DraftConflict) => {
    setPanel(null);
    setPublishConflict(found);
    dispatch({ type: 'lock' });
  };
  const showInspector = compact ? state.selectedId !== null : true;
  const selectedIndex = state.document.sections.findIndex((section) => section.id === state.selectedId);
  const selected = state.document.sections[selectedIndex];
  const inspector = selected
    ? <SectionInspector key={selected.id} section={selected} index={selectedIndex} issues={issues[selected.id] ?? []} locked={state.locked} dispatch={dispatch} />
    : <InspectorSlot page={page} />;
  const addSection = (sectionType: PageSectionType) => {
    dispatch({ type: 'add', sectionType, index: libraryAt ?? undefined, id: crypto.randomUUID() });
    setLibraryAt(null);
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className={styles.editor}>
        <EditorTopbar
          page={page}
          saveStatus={conflict ? { kind: 'conflict', conflict } : status}
          unpublished={unpublished}
          onRetry={autosave.saveNow}
          device={device}
          onDevice={setDevice}
          onPublish={() => setPanel('publish')}
          onHistory={() => setPanel('history')}
          onSettings={() => setPanel('settings')}
          publishBlock={publishBlock}
        />
        {conflict && (
          <div className={`${styles.banner} ${styles.warn}`} role="alert">
            <AlertTriangle aria-hidden="true" />
            <span className={styles.bannerText}>
              {t(conflict.updatedBy ? 'banner.conflict' : 'banner.conflictAnonymous', {
                name: conflict.updatedBy?.name,
                time: formatClock(conflict.updatedAt, locale),
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
              onAdd={() => setLibraryAt(state.document.sections.length)}
            />
          </div>
          <div className={`${styles.column} ${styles.center}`}>
            <PagePreview
              document={state.document}
              resolved={preview.data?.resolved ?? NO_RESOLVED}
              selectedId={state.selectedId}
              device={device}
              locked={state.locked}
              onSelect={(id) => { setLibraryAt(null); dispatch({ type: 'select', id }); }}
              onInsert={setLibraryAt}
            />
            {libraryAt !== null && (
              <SectionLibrary position={libraryAt} count={state.document.sections.length} onPick={addSection} onClose={() => setLibraryAt(null)} />
            )}
          </div>
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
        {panel === 'publish' && (
          <PublishDialog
            page={page}
            revision={revision}
            settled={settled}
            onClose={() => setPanel(null)}
            onPublished={(version) => { setPanel(null); setTouched(false); setPublishedVersion(version); }}
            onConflict={onPublishConflict}
          />
        )}
        {panel === 'history' && (
          <HistoryDrawer
            page={page}
            settled={settled}
            onClose={() => setPanel(null)}
            onRestoreStart={() => dispatch({ type: 'lock' })}
            onRestoreFail={() => dispatch({ type: 'unlock' })}
            onRestored={() => { setPanel(null); onReload(); }}
          />
        )}
        {panel === 'settings' && <PageSettingsDrawer page={page} onClose={() => setPanel(null)} />}
        {publishedVersion !== null && (
          <div className={styles.toast} role="status">
            <span>{t('publish.published', { version: publishedVersion })}</span>
            <a href={`/p/${page.slug}`} target="_blank" rel="noreferrer">{t('publish.viewPage')}</a>
          </div>
        )}
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

// Shown while no section is selected.
function InspectorSlot({ page }: { page: PageDetail }) {
  const t = useTranslations('platformAdmin.pageEditor');
  return (
    <div className={styles.inspector} data-testid="inspector-slot">
      <div className={styles.inspectorHeader}>{t('inspector.pageTitle')}</div>
      <div className={styles.inspectorBody}>
        <b>{page.title}</b>
        <span className={styles.path}>/p/{page.slug}</span>
        <p className={styles.hint}>{t('inspector.emptyHint')}</p>
      </div>
    </div>
  );
}
