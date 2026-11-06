'use client';

import '@puckeditor/core/puck.css';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Puck, type Data } from '@puckeditor/core';
import { AlertTriangle, Layers, X } from 'lucide-react';
import { Button } from '@live-show/design-system';
import {
  pageDraftV2Schema, upgradePageDocument,
  type DraftConflict, type ElementType, type PageDetail, type PageDocumentV2, type PageElement,
} from '@live-show/api-contracts';
import { useDraftAutosave } from '../hooks/use-draft-autosave';
import { usePagePreviewQuery } from '../queries/use-pages';
import { formatClock } from '../components/EditorTopbar';
import { HistoryDrawer } from '../components/HistoryDrawer';
import { PageSettingsDrawer } from '../components/PageSettingsDrawer';
import shell from '../components/PageEditor.module.scss';
import { EditorChrome } from './EditorChrome';
import { PANEL_OVERRIDES } from './panels';
import { EditorDataProvider } from './editor-data';
import { ServerIssuesProvider, type ServerIssues } from './inspector/element-issues';
import { DuplicateCleaner } from './left/puck-store';
import { locate } from './left/tree-ops';
import { PublishDialogV2 } from './PublishDialogV2';
import { createPuckConfig } from './puck-config';
import { fromPuckData, toContractId, toPuckData } from './puck-data';
import type { EditorLabels } from '@/features/pages-public/elements/types';
import { BREAKPOINT_WIDTH, BreakpointProvider, VIEWPORTS } from './use-breakpoint';
import { useResolveData } from './use-resolve-data';
import styles from './PageEditorV2.module.scss';

const PUBLISHED_TOAST_MS = 6000;
const NO_RESOLVED = { rails: {}, featured: {}, live: {} };
const LOCKED_PERMISSIONS = { drag: false, duplicate: false, delete: false, edit: false, insert: false };
const PUCK_UI = { viewports: { current: { width: BREAKPOINT_WIDTH.desktop, height: 'auto' as const }, controlsVisible: false, options: VIEWPORTS } };
const PUCK_IFRAME = { enabled: false };
const PUCK_DICTIONARY = {
  'viewport-switch-default': 'Trocar tamanho', 'plugin-components': 'Adicionar', 'plugin-outline': 'Camadas', 'plugin-fields': 'Inspetor',
  'action-selectparent': 'Selecionar o elemento pai', 'action-drag': 'Arrastar', 'action-duplicate': 'Duplicar', 'action-delete': 'Excluir',
};

type Panel = 'publish' | 'history' | 'settings' | null;

interface Props {
  page: PageDetail;
  onReload(): void;
  /** The last reload attempt failed: the editor stays locked on the stale draft. */
  reloadFailed?: boolean;
}

// Mount with `key` = page id (+ reload token), as the v1 editor: document and revision must not outlive the page.
export function PageEditorV2({ page, onReload, reloadFailed }: Props) {
  const t = useTranslations('platformAdmin.pageEditor');
  const tv2 = useTranslations('platformAdmin.pageEditorV2');
  const locale = useLocale();
  // A blank v1 draft (new pages are created that way) has nothing to convert.
  const convertedFromV1 = page.draft.schemaVersion === 1 && page.draft.sections.length > 0;
  const [initial] = useState<PageDocumentV2>(() => upgradePageDocument(page.draft));
  const [puckData] = useState<Data>(() => toPuckData(initial));
  // The content as Puck holds it (its own ids), for the event data of elements that are not saved yet.
  const [puckContent, setPuckContent] = useState(puckData.content);
  const [document, setDocument] = useState(initial);
  const documentRef = useRef(initial);
  const [dirty, setDirty] = useState(false);
  const [locked, setLocked] = useState(false);
  const lockedRef = useRef(false);
  // Latest revision the server holds for this draft: autosave and publish use it, never the query's.
  const [revision, setRevision] = useState(page.draftRevision);
  const [panel, setPanel] = useState<Panel>(null);
  const [touched, setTouched] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [publishedVersion, setPublishedVersion] = useState<number | null>(null);
  const [publishConflict, setPublishConflict] = useState<DraftConflict | null>(null);
  // Featured events the back refused at publish, with the event they had: the mark goes away when the author picks another one.
  const [featuredFailures, setFeaturedFailures] = useState<{ elementId: string; eventId: string }[]>([]);
  const preview = usePagePreviewQuery(page.id, revision);

  const autosave = useDraftAutosave<PageDocumentV2>({
    pageId: page.id,
    document,
    validator: pageDraftV2Schema,
    baseRevision: revision,
    dirty,
    onSaved: ({ document: sent, draftRevision }) => {
      setRevision(draftRevision);
      // Edits made while saving keep the editor dirty.
      setDirty(documentRef.current !== sent);
    },
    onConflict: () => setLocked(true),
  });

  const config = useMemo(() => createPuckConfig((type: ElementType) => tv2(`types.${type}`)), [tv2]);
  const labels = useMemo<EditorLabels>(() => ({
    railPlaceholder: tv2('dataLabels.railPlaceholder'),
    railNoneLive: tv2('dataLabels.railNoneLive'),
    railNoneCategory: (category) => tv2('dataLabels.railNoneCategory', { category }),
    railNoneFilter: tv2('dataLabels.railNoneFilter'),
    railHidden: tv2('dataLabels.railHidden'),
    featuredPlaceholder: tv2('dataLabels.featuredPlaceholder'),
    featuredUnavailable: tv2('dataLabels.featuredUnavailable'),
    featuredUnavailableText: tv2('dataLabels.featuredUnavailableText'),
  }), [tv2]);
  const live = useResolveData(puckContent as unknown as PageElement[]);
  // What was fetched for the editor's current state wins over the preview of the saved draft.
  const editorData = useMemo(() => {
    const fromPreview = preview.data?.resolved ?? NO_RESOLVED;
    // An element whose event was just cleared must not keep showing the saved one.
    const stale = new Set(live.unsendable.flatMap((id) => [id, toContractId(id)]));
    const without = <B extends object>(bucket: B): B => Object.fromEntries(Object.entries(bucket).filter(([id]) => !stale.has(id))) as B;
    const saved = { rails: without(fromPreview.rails), featured: without(fromPreview.featured), live: without(fromPreview.live) };
    const resolved = { rails: { ...saved.rails, ...live.resolved.rails }, featured: { ...saved.featured, ...live.resolved.featured }, live: { ...saved.live, ...live.resolved.live } };
    return { resolved, loading: live.loading, labels };
  }, [preview.data, live, labels]);

  // Locked: Puck's own keyboard history (Cmd+Z) still moves its tree; the document and what "copy my changes" hands out must not follow.
  const onChange = useCallback((data: Data) => {
    if (lockedRef.current) return;
    setPuckContent(data.content);
    const next = fromPuckData(data, documentRef.current.context);
    if (JSON.stringify(next) === JSON.stringify(documentRef.current)) return;
    documentRef.current = next;
    setDocument(next);
    setDirty(true);
    setTouched(true);
  }, []);

  // Puck runs onAction inside its store update: the cleanup is a separate step, after it.
  const cleanDuplicate = useRef<(() => void) | null>(null);
  const onAction = useCallback((action: { type: string }) => {
    if (action.type === 'duplicate') queueMicrotask(() => cleanDuplicate.current?.());
  }, []);

  useEffect(() => {
    if (publishedVersion === null) return;
    const timer = setTimeout(() => setPublishedVersion(null), PUBLISHED_TOAST_MS);
    return () => clearTimeout(timer);
  }, [publishedVersion]);

  const status = autosave.status;
  const conflict = status.kind === 'conflict' ? status.conflict : publishConflict;
  const isLocked = locked || !!conflict;
  lockedRef.current = isLocked;
  const settled = !dirty && status.kind !== 'saving' && status.kind !== 'pending';
  const unpublished = page.hasUnpublishedChanges || touched;
  const serverIssues = useMemo<ServerIssues>(() => Object.fromEntries(
    featuredFailures
      .filter(({ elementId, eventId }) => (locate(document.content as PageElement[], elementId)?.element.props as { eventId?: string } | undefined)?.eventId === eventId)
      .map(({ elementId }) => [elementId, { eventId: tv2('publish.unavailable') }]),
  ), [featuredFailures, document, tv2]);

  let publishBlock: string | null = null;
  if (isLocked) publishBlock = t('publish.tipConflict');
  else if (page.status === 'ARCHIVED') publishBlock = t('publish.tipArchived');
  else if (document.content.length === 0) publishBlock = t('publish.tipEmpty');
  else if (!unpublished && page.publishedVersion !== null) publishBlock = t('publish.tipNothing', { version: page.publishedVersion });
  else if (!unpublished) publishBlock = t('publish.tipNothingFirst');

  const copyChanges = () => {
    void navigator.clipboard?.writeText(JSON.stringify(documentRef.current)).then(() => setCopied(true), () => undefined);
  };

  const banners = (
    <>
      {convertedFromV1 && !bannerDismissed && !conflict && (
        <div className={`${shell.banner} ${styles.info}`} role="status">
          <Layers aria-hidden="true" />
          <span className={shell.bannerText}><b>{tv2('banner.converted')}</b> {tv2('banner.convertedText')}</span>
          {page.publishedVersion !== null && (
            <Button type="button" variant="outline" size="sm" onClick={() => setPanel('publish')}>{tv2('banner.compare')}</Button>
          )}
          <Button type="button" variant="ghost" size="icon" aria-label={tv2('banner.dismiss')} onClick={() => setBannerDismissed(true)}><X aria-hidden="true" /></Button>
        </div>
      )}
      {conflict && (
        <div className={`${shell.banner} ${shell.warn}`} role="alert">
          <AlertTriangle aria-hidden="true" />
          <span className={shell.bannerText}>
            <b>{tv2(conflict.updatedBy ? 'banner.conflict' : 'banner.conflictAnonymous', { name: conflict.updatedBy?.name, time: formatClock(conflict.updatedAt, locale) })}</b>
            {' '}{tv2('banner.conflictText')}
            {reloadFailed && ` ${tv2('banner.reloadError')}`}
          </span>
          <div className={styles.bannerActions}>
            <Button type="button" variant="outline" size="sm" onClick={copyChanges}>{copied ? tv2('banner.copied') : tv2('banner.copy')}</Button>
            <Button type="button" size="sm" className={shell.reload} onClick={onReload}>{tv2('banner.load')}</Button>
          </div>
        </div>
      )}
      {status.kind === 'error' && (
        <div className={`${shell.banner} ${shell.err}`} role="alert">
          <AlertTriangle aria-hidden="true" />
          <span className={shell.bannerText}>{t('banner.error')}</span>
          <Button type="button" variant="outline" size="sm" onClick={autosave.saveNow}>{t('banner.retry')}</Button>
        </div>
      )}
    </>
  );

  return (
    <div className={shell.editor}>
      <BreakpointProvider>
        <Puck
          config={config}
          data={puckData}
          iframe={PUCK_IFRAME}
          viewports={VIEWPORTS}
          ui={PUCK_UI}
          overrides={PANEL_OVERRIDES}
          dictionary={PUCK_DICTIONARY}
          metadata={editorData}
          permissions={isLocked ? LOCKED_PERMISSIONS : undefined}
          onChange={onChange}
          onAction={onAction}
        >
          <DuplicateCleaner cleanRef={cleanDuplicate} />
          <ServerIssuesProvider value={serverIssues}>
            <EditorDataProvider value={editorData}>
              <EditorChrome
                page={page}
                saveStatus={conflict ? { kind: 'conflict', conflict } : status}
                unpublished={unpublished}
                publishBlock={publishBlock}
                historyDisabled={!!conflict}
                locked={isLocked}
                onRetry={autosave.saveNow}
                onPublish={() => setPanel('publish')}
                onHistory={() => setPanel('history')}
                onSettings={() => setPanel('settings')}
                banners={banners}
              />
              {panel === 'publish' && (
                <PublishDialogV2
                  page={page}
                  document={document}
                  serverIssues={serverIssues}
                  revision={revision}
                  settled={settled}
                  onClose={() => setPanel(null)}
                  onPublished={(version) => { setPanel(null); setTouched(false); setFeaturedFailures([]); setPublishedVersion(version); }}
                  onConflict={(found) => { setPanel(null); setPublishConflict(found); setLocked(true); }}
                  onFeaturedUnavailable={(elementId) => {
                    const eventId = (locate(documentRef.current.content as PageElement[], elementId)?.element.props as { eventId?: string } | undefined)?.eventId ?? '';
                    setFeaturedFailures((current) => [...current.filter((f) => f.elementId !== elementId), { elementId, eventId }]);
                  }}
                />
              )}
            </EditorDataProvider>
          </ServerIssuesProvider>
        </Puck>
      </BreakpointProvider>
      {panel === 'history' && (
        <HistoryDrawer
          page={page}
          settled={settled && !conflict}
          onClose={() => setPanel(null)}
          onRestoreStart={() => setLocked(true)}
          onRestoreFail={() => setLocked(false)}
          onRestored={() => { setPanel(null); onReload(); }}
        />
      )}
      {panel === 'settings' && <PageSettingsDrawer page={page} onClose={() => setPanel(null)} />}
      {publishedVersion !== null && (
        <div className={shell.toast} role="status">
          <span>{t('publish.published', { version: publishedVersion })}</span>
          <a href={`/p/${page.slug}`} target="_blank" rel="noreferrer">{t('publish.viewPage')}</a>
        </div>
      )}
    </div>
  );
}
