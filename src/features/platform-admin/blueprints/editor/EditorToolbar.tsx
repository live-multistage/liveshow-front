'use client';

import { useTranslations } from 'next-intl';
import { ArrowLeft, Check, Loader2 } from 'lucide-react';
import { Button, Tooltip, TooltipContent, TooltipTrigger, cn } from '@live-show/design-system';
import styles from './EditorPage.module.scss';

export type BadgeTone = 'draft' | 'published' | 'active';

interface Props {
  name: string;
  badge: string;
  tone: BadgeTone;
  errorCount: number;
  summary: string;
  readOnly: boolean;
  savingVia: 'validate' | 'save' | null;
  publishing: boolean;
  duplicating: boolean;
  /** Why Publicar is disabled (tooltip), or null when it can publish. */
  publishBlockedReason: string | null;
  onBack(): void;
  onSave(via: 'validate' | 'save'): void;
  onPublish(): void;
  onDuplicate(): void;
}

// Top bar (design C1/C2/C3): back, name + state badge + error count, mono
// summary; Validar / Salvar rascunho / Publicar, or "Duplicar como rascunho"
// when viewing a published version.
export function EditorToolbar(p: Props) {
  const t = useTranslations('platformAdmin.blueprints');
  const saving = p.savingVia !== null;

  return (
    <header className={styles.toolbar}>
      <button type="button" className={styles.back} onClick={p.onBack} aria-label={t('editor.back')}>
        <ArrowLeft size={18} aria-hidden />
      </button>
      <div className={styles.titleBlock}>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>{p.name}</h1>
          <span className={cn(styles.badge, styles[`badge_${p.tone}`])}>{p.badge}</span>
          {p.errorCount > 0 && <span className={styles.errorCount}>{t('detail.versionErrorCount', { count: p.errorCount })}</span>}
        </div>
        <div className={styles.summary}>{p.summary}</div>
      </div>
      <div className={styles.actions}>
        {p.readOnly ? (
          <Button onClick={p.onDuplicate} disabled={p.duplicating}>{t('editor.duplicateAsDraft')}</Button>
        ) : (
          <>
            <Button variant="outline" onClick={() => p.onSave('validate')} disabled={saving}>
              {p.savingVia === 'validate' ? <Loader2 size={14} className={styles.spin} aria-hidden /> : <Check size={14} aria-hidden />}
              {t('editor.validate')}
            </Button>
            <Button variant="outline" onClick={() => p.onSave('save')} disabled={saving}>{t('editor.saveDraft')}</Button>
            {p.publishBlockedReason ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className={styles.tooltipAnchor} tabIndex={0}>
                    <Button disabled aria-describedby="bp-publish-blocked">{t('editor.publish')}</Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent id="bp-publish-blocked">{p.publishBlockedReason}</TooltipContent>
              </Tooltip>
            ) : (
              <Button onClick={p.onPublish} disabled={p.publishing}>{t('editor.publish')}</Button>
            )}
          </>
        )}
      </div>
    </header>
  );
}
