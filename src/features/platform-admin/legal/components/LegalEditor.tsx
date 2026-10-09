'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { AlertTriangle, Clock, Info, RotateCcw } from 'lucide-react';
import type { LegalDocumentKind, LegalDocumentVersion } from '@live-show/api-contracts';
import { Button, Input, Skeleton, Tabs, Textarea, Tooltip, TooltipContent, TooltipTrigger } from '@live-show/design-system';
import { LegalMarkdown } from '@/features/legal';
import publicPage from '@/app/(public)/privacidade/page.module.scss';
import type { AppError } from '@/lib/http/errors';
import {
  useLegalCurrentQuery,
  useLegalVersionsQuery,
  usePublishLegalVersionMutation,
} from '../queries/use-legal-admin';
import {
  EMPTY_TEXTS,
  LEGAL_LOCALES,
  PUBLIC_PATH,
  changedLocales,
  formatLegalDate,
  includedLocales,
  loadDraft,
  saveDraft,
  toContent,
  toTexts,
  type LegalLocale,
  type LegalTexts,
} from '../utils/legal-doc';
import { DiscardChangesDialog, PublishConfirmDialog } from './LegalConfirmDialogs';
import styles from './LegalEditor.module.scss';

const SUMMARY_MAX = 500;

interface Props {
  kind: LegalDocumentKind;
  onClose: () => void;
  onOpenHistory: () => void;
  onPublished: (version: LegalDocumentVersion) => void;
}

// Waits for the current version, then mounts the form once so its local state
// (texts, summary, draft) starts from a stable baseline.
export function LegalEditor(props: Props) {
  const current = useLegalCurrentQuery(props.kind);
  const versions = useLegalVersionsQuery(props.kind);
  const isFirst = versions.data?.length === 0;

  if (current.isLoading && !isFirst) return <Skeleton className={styles.loading} />;
  return <LegalEditorForm key={current.data?.version ?? 0} {...props} current={current.data ?? null} />;
}

function LegalEditorForm({ kind, current, onClose, onOpenHistory, onPublished }: Props & { current: LegalDocumentVersion | null }) {
  const t = useTranslations('platformAdmin.legal');
  const locale = useLocale();
  const publish = usePublishLegalVersionMutation(kind);
  const currentQuery = useLegalCurrentQuery(kind);
  const versionsQuery = useLegalVersionsQuery(kind);

  const base = current ? toTexts(current.content) : EMPTY_TEXTS;
  const nextVersion = (current?.version ?? 0) + 1;
  const docName = t(`docs.${kind}`);

  const [draft] = useState(() => {
    const saved = loadDraft(kind);
    return saved && changedLocales(saved, base).length > 0 ? saved : null;
  });
  const [texts, setTexts] = useState<LegalTexts>(draft ?? base);
  const [draftRestored, setDraftRestored] = useState(draft !== null);
  const [summary, setSummary] = useState('');
  const [lang, setLang] = useState<LegalLocale>('pt');
  const [pane, setPane] = useState<'edit' | 'preview'>('edit');
  const [helpOpen, setHelpOpen] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [serverError, setServerError] = useState('');
  const [conflict, setConflict] = useState(false);

  const changed = changedLocales(texts, base);
  const dirty = changed.length > 0 || summary.trim() !== '';

  useEffect(() => {
    saveDraft(kind, changed.length > 0 ? texts : null);
  }, [kind, texts, changed.length]);

  const blocker = changed.length === 0 ? t('editor.noChanges', { n: current?.version ?? 0 })
    : texts.pt.trim() === '' ? t('editor.needPt')
    : summary.trim() === '' ? t('editor.needSummary')
    : '';
  const canPublish = blocker === '' && !publishing;

  const leave = () => (dirty ? setDiscardOpen(true) : onClose());

  const discardAll = () => {
    saveDraft(kind, null);
    onClose();
  };

  const discardDraft = () => {
    setTexts(base);
    setDraftRestored(false);
  };

  const reload = async () => {
    const [fresh] = await Promise.all([currentQuery.refetch(), versionsQuery.refetch()]);
    if (fresh.data) setTexts(toTexts(fresh.data.content));
    setSummary('');
    setConflict(false);
  };

  const confirmPublish = async () => {
    setConfirmOpen(false);
    setPublishing(true);
    setServerError('');
    try {
      const published = await publish.mutateAsync({ content: toContent(texts), changeSummary: summary.trim() });
      saveDraft(kind, null);
      onPublished(published);
    } catch (err) {
      const { status, message } = err as AppError;
      if (status === 409) setConflict(true);
      else setServerError(status === 400 && message ? message : t('editor.publishError'));
    } finally {
      setPublishing(false);
    }
  };

  const fallsBack = lang !== 'pt' && texts[lang].trim() === '';
  const previewSource = fallsBack ? texts.pt : texts[lang];
  const lineCount = texts[lang] === '' ? 0 : texts[lang].split('\n').length;

  const tabs = LEGAL_LOCALES.map((l) => ({
    value: l,
    label: l.toUpperCase(),
    dot: changed.includes(l),
    dotLabel: t('editor.changedDot'),
    badge: l === 'pt' ? t('editor.required') : undefined,
  }));

  return (
    <div className={styles.editor}>
      <header className={styles.head}>
        <nav className={styles.crumbs}>
          <button type="button" className={styles.crumbLink} onClick={leave}>{t('editor.breadcrumbRoot')}</button>
          <span>›</span>
          <span className={styles.crumbHere}>{docName}</span>
        </nav>
        <div className={styles.titleRow}>
          <div className={styles.titleGroup}>
            <h1 className={styles.title}>{docName}</h1>
            <span className={styles.chip}>
              {current ? t('editor.editingFrom', { n: current.version }) : t('editor.firstVersion')}
            </span>
          </div>
          {current && (
            <Button variant="outline" size="sm" onClick={onOpenHistory}><Clock size={13} /> {t('history')}</Button>
          )}
        </div>
        <div className={styles.tabsRow}>
          <Tabs
            label={t('editor.languagesLabel')}
            variant="mono"
            items={tabs}
            value={lang}
            onValueChange={(v) => setLang(v as LegalLocale)}
          />
          <div className={styles.tools}>
            <div className={styles.paneSwitch}>
              {(['edit', 'preview'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  aria-pressed={pane === p}
                  className={pane === p ? `${styles.paneBtn} ${styles.paneBtnOn}` : styles.paneBtn}
                  onClick={() => setPane(p)}
                >
                  {t(`editor.${p}`)}
                </button>
              ))}
            </div>
            <Button variant="outline" size="sm" aria-pressed={helpOpen} onClick={() => setHelpOpen((o) => !o)}>
              {t('editor.markdown')}
            </Button>
          </div>
        </div>
      </header>

      {helpOpen && (
        <div className={styles.help}>
          <code>## Título</code><code>**negrito**</code><code>- lista</code><code>[texto](/caminho)</code>
          <span className={styles.helpWarn}><Info size={12} /> {t('editor.noHtml')}</span>
        </div>
      )}
      {draftRestored && (
        <div className={styles.draft}>
          <RotateCcw size={14} />
          <span><strong>{t('editor.draftRestored')}</strong> {t('editor.draftRestoredText')}</span>
          <Button variant="outline" size="sm" onClick={discardDraft}>{t('editor.discardDraft')}</Button>
        </div>
      )}
      {conflict && (
        <div className={styles.conflict} role="alert">
          <AlertTriangle size={15} />
          <span>{t('editor.conflict', { n: nextVersion })}</span>
          <Button variant="outline" size="sm" onClick={reload}>{t('editor.reload')}</Button>
        </div>
      )}

      <div className={styles.panes} data-pane={pane}>
        <div className={styles.editPane}>
          <div className={styles.paneHead}>
            <span>{t('editor.markdownLabel', { lang: lang.toUpperCase() })}</span>
            <span>{lineCount}</span>
          </div>
          <Textarea
            mono
            spellCheck={false}
            className={styles.textarea}
            aria-label={t('editor.markdownLabel', { lang: lang.toUpperCase() })}
            placeholder={lang === 'pt' ? t('editor.placeholder') : t('editor.fallbackHelp')}
            value={texts[lang]}
            onChange={(e) => setTexts((prev) => ({ ...prev, [lang]: e.target.value }))}
          />
        </div>
        <div className={styles.previewPane}>
          <div className={styles.paneHead}>
            <span>{t('editor.previewLabel', { path: PUBLIC_PATH[kind] })}</span>
            {fallsBack && <span className={styles.fallback}>{t('editor.fallbackHelp')}</span>}
          </div>
          <div className={styles.previewScroll}>
            <article className={publicPage.content}>
              <h2 className={styles.previewTitle}>{docName}</h2>
              <p className={publicPage.updated}>
                {t('editor.previewUpdated', { date: formatLegalDate(new Date().toISOString(), locale), n: nextVersion })} ·{' '}
                <span className={publicPage.link}>{t('editor.previousVersions')}</span>
              </p>
              <LegalMarkdown source={previewSource} />
            </article>
          </div>
        </div>
      </div>

      {serverError && (
        <div className={styles.serverError} role="alert"><AlertTriangle size={14} /> {serverError}</div>
      )}
      <footer className={styles.footer}>
        <label className={styles.summaryField}>
          <span className={styles.summaryLabel}>
            {t('editor.summaryLabel')}
            <span className={styles.optional}>{t('editor.summaryRequired')}</span>
            <span className={styles.count}>{summary.length}/{SUMMARY_MAX}</span>
          </span>
          <Input
            value={summary}
            maxLength={SUMMARY_MAX}
            placeholder={t('editor.summaryPlaceholder')}
            onChange={(e) => setSummary(e.target.value)}
          />
        </label>
        <Button variant="outline" onClick={leave}>{t('editor.discard')}</Button>
        <Tooltip open={canPublish || publishing ? false : undefined}>
          <TooltipTrigger asChild>
            <span tabIndex={canPublish ? -1 : 0}>
              <Button disabled={!canPublish} onClick={() => setConfirmOpen(true)}>
                {publishing ? t('editor.publishing') : t('editor.publish', { n: nextVersion })}
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>{blocker}</TooltipContent>
        </Tooltip>
      </footer>

      <PublishConfirmDialog
        open={confirmOpen}
        docName={docName}
        nextVersion={nextVersion}
        summary={summary.trim()}
        locales={includedLocales(texts)}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={confirmPublish}
      />
      <DiscardChangesDialog open={discardOpen} onKeep={() => setDiscardOpen(false)} onDiscard={discardAll} />
    </div>
  );
}
