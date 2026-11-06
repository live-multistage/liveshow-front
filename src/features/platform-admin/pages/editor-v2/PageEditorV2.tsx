'use client';

import '@puckeditor/core/puck.css';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Puck, type Data } from '@puckeditor/core';
import { AlertTriangle, Layers, X } from 'lucide-react';
import { Button } from '@live-show/design-system';
import {
  pageDraftV2Schema, upgradePageDocument, validatePageAgainstProfile, validatePageTreeV2,
  type DraftConflict, type ElementType, type PageDetail, type PageDocumentV2,
} from '@live-show/api-contracts';
import { elementResolved } from '@/features/pages-public/elements';
import { useDraftAutosave } from '../hooks/use-draft-autosave';
import { usePagePreviewQuery } from '../queries/use-pages';
import { formatClock } from '../components/EditorTopbar';
import { HistoryDrawer } from '../components/HistoryDrawer';
import { PageSettingsDrawer } from '../components/PageSettingsDrawer';
import { PublishDialog } from '../components/PublishDialog';
import shell from '../components/PageEditor.module.scss';
import { EditorChrome } from './EditorChrome';
import { PANEL_OVERRIDES } from './panels';
import { createPuckConfig } from './puck-config';
import { fromPuckData, toPuckData } from './puck-data';
import { BREAKPOINT_WIDTH, BreakpointProvider, VIEWPORTS } from './use-breakpoint';
import styles from './PageEditorV2.module.scss';

const PUBLISHED_TOAST_MS = 6000;
const NO_RESOLVED = { rails: {}, featured: {} };
const LOCKED_PERMISSIONS = { drag: false, duplicate: false, delete: false, edit: false, insert: false };
const PUCK_UI = { viewports: { current: { width: BREAKPOINT_WIDTH.desktop, height: 'auto' as const }, controlsVisible: false, options: VIEWPORTS } };
const PUCK_IFRAME = { enabled: false };
const PUCK_DICTIONARY = { 'viewport-switch-default': 'Trocar tamanho', 'plugin-components': 'Adicionar', 'plugin-outline': 'Camadas', 'plugin-fields': 'Inspetor' };

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
  const convertedFromV1 = page.draft.schemaVersion === 1;
  const [initial] = useState<PageDocumentV2>(() => upgradePageDocument(page.draft));
  const [puckData] = useState<Data>(() => toPuckData(initial));
  const [document, setDocument] = useState(initial);
  const documentRef = useRef(initial);
  const [dirty, setDirty] = useState(false);
  const [locked, setLocked] = useState(false);
  // Latest revision the server holds for this draft: autosave and publish use it, never the query's.
  const [revision, setRevision] = useState(page.draftRevision);
  const [panel, setPanel] = useState<Panel>(null);
  const [touched, setTouched] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [publishedVersion, setPublishedVersion] = useState<number | null>(null);
  const [publishConflict, setPublishConflict] = useState<DraftConflict | null>(null);
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
  const metadata = useMemo(() => ({ resolved: preview.data ? elementResolved(document, preview.data.resolved) : NO_RESOLVED }), [preview.data, document]);

  const onChange = useCallback((data: Data) => {
    const next = fromPuckData(data, documentRef.current.context);
    if (JSON.stringify(next) === JSON.stringify(documentRef.current)) return;
    documentRef.current = next;
    setDocument(next);
    setDirty(true);
    setTouched(true);
  }, []);

  useEffect(() => {
    if (publishedVersion === null) return;
    const timer = setTimeout(() => setPublishedVersion(null), PUBLISHED_TOAST_MS);
    return () => clearTimeout(timer);
  }, [publishedVersion]);

  const status = autosave.status;
  const conflict = status.kind === 'conflict' ? status.conflict : publishConflict;
  const isLocked = locked || !!conflict;
  const settled = !dirty && status.kind !== 'saving' && status.kind !== 'pending';
  const unpublished = page.hasUnpublishedChanges || touched;
  const issueCount = useMemo(() => {
    const seen = new Set<string>();
    [...validatePageTreeV2(document), ...validatePageAgainstProfile(document, 'platform')].forEach((i) => seen.add(`${i.path}|${i.message}`));
    return seen.size;
  }, [document]);

  let publishBlock: string | null = null;
  if (isLocked) publishBlock = t('publish.tipConflict');
  else if (page.status === 'ARCHIVED') publishBlock = t('publish.tipArchived');
  else if (issueCount > 0) publishBlock = t(issueCount === 1 ? 'publish.tipInvalidOne' : 'publish.tipInvalidMany', { count: issueCount });
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
          metadata={metadata}
          permissions={isLocked ? LOCKED_PERMISSIONS : undefined}
          onChange={onChange}
        >
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
        </Puck>
      </BreakpointProvider>
      {panel === 'publish' && (
        <PublishDialog
          page={page}
          revision={revision}
          settled={settled}
          onClose={() => setPanel(null)}
          onPublished={(version) => { setPanel(null); setTouched(false); setPublishedVersion(version); }}
          onConflict={(found) => { setPanel(null); setPublishConflict(found); setLocked(true); }}
        />
      )}
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
