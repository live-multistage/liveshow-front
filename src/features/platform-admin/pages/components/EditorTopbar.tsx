'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { AlertTriangle, ArrowLeft, Check, ExternalLink, History, Monitor, Settings, Smartphone } from 'lucide-react';
import { Button } from '@live-show/design-system';
import type { PageDetail } from '@live-show/api-contracts';
import type { AutosaveStatus } from '../hooks/use-draft-autosave';
import type { PreviewDevice } from './PagePreview';
import styles from './PageEditor.module.scss';

export const PAGES_LIST_HREF = '/dashboard/platform/pages';

export function formatClock(iso: string | Date, locale: string): string {
  return new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
}

interface Props {
  page: PageDetail;
  saveStatus: AutosaveStatus;
  unpublished: boolean;
  device?: PreviewDevice;
  onDevice?(device: PreviewDevice): void;
  onRetry?(): void;
  onPublish?(): void;
  onHistory?(): void;
  historyDisabled?: boolean;
  onSettings?(): void;
  /** Why publishing is unavailable right now; null when it is allowed. */
  publishBlock?: string | null;
}

function statusKey(page: PageDetail, unpublished: boolean): 'archived' | 'draft' | 'unpublished' | 'published' {
  if (page.status === 'ARCHIVED') return 'archived';
  if (page.status === 'DRAFT') return 'draft';
  return unpublished ? 'unpublished' : 'published';
}

function SaveIndicator({ page, status, onRetry }: { page: PageDetail; status: AutosaveStatus; onRetry?(): void }) {
  const t = useTranslations('platformAdmin.pageEditor');
  const locale = useLocale();
  switch (status.kind) {
    case 'pending':
    case 'saving':
      return <span className={styles.saved}><span className={styles.spinner} aria-hidden="true" />{t('save.saving')}</span>;
    case 'saved':
      return <span className={styles.saved}><Check aria-hidden="true" />{t('save.saved', { time: formatClock(status.at, locale) })}</span>;
    case 'invalid':
      return <span className={`${styles.saved} ${styles.bad}`}><AlertTriangle aria-hidden="true" />{t('save.invalid')}</span>;
    case 'error':
      return (
        <>
          <span className={`${styles.saved} ${styles.bad}`}><AlertTriangle aria-hidden="true" />{t('save.error')}</span>
          {onRetry && <Button type="button" variant="outline" size="sm" onClick={onRetry}>{t('save.retry')}</Button>}
        </>
      );
    case 'conflict':
      return <span className={`${styles.saved} ${styles.bad}`}><AlertTriangle aria-hidden="true" />{t('save.conflict')}</span>;
    case 'blocked':
      return <span className={`${styles.saved} ${styles.bad}`} title={status.message}><AlertTriangle aria-hidden="true" />{t('save.blocked')}</span>;
    case 'idle':
      return <span className={styles.saved}><Check aria-hidden="true" />{t('save.saved', { time: formatClock(page.draftUpdatedAt, locale) })}</span>;
  }
}

export function EditorTopbar({ page, saveStatus, unpublished, device = 'desktop', onDevice, onRetry, onPublish, onHistory, historyDisabled = false, onSettings, publishBlock = null }: Props) {
  const t = useTranslations('platformAdmin.pageEditor');
  const key = statusKey(page, unpublished && page.publishedVersion !== null);

  return (
    <div className={styles.topbar}>
      <Link href={PAGES_LIST_HREF} className={styles.back}>
        <ArrowLeft aria-hidden="true" />
        {t('backToList')}
      </Link>
      <span className={styles.vsep} />
      <div className={styles.title}>
        <b>{page.title}</b>
        <span className={styles.path}>/p/{page.slug}</span>
      </div>
      <span className={`${styles.pill} ${styles[`pill_${key}`]}`} title={key === 'unpublished' ? t('status.unpublishedHint') : undefined}>
        {t(`status.${key}`, { version: page.publishedVersion ?? '' })}
      </span>
      <SaveIndicator page={page} status={saveStatus} onRetry={onRetry} />
      <div className={styles.topbarActions}>
        <div className={styles.segment} role="group" aria-label={t('topbar.deviceGroup')}>
          <Button type="button" variant={device === 'desktop' ? 'secondary' : 'ghost'} size="sm" aria-pressed={device === 'desktop'} aria-label={t('topbar.desktop')} onClick={() => onDevice?.('desktop')}><Monitor aria-hidden="true" /><span className={styles.label}>{t('topbar.desktop')}</span></Button>
          <Button type="button" variant={device === 'mobile' ? 'secondary' : 'ghost'} size="sm" aria-pressed={device === 'mobile'} aria-label={t('topbar.mobile')} onClick={() => onDevice?.('mobile')}><Smartphone aria-hidden="true" /><span className={styles.label}>{t('topbar.mobile')}</span></Button>
        </div>
        <span className={styles.vsep} />
        <Button type="button" variant="outline" size="sm" aria-label={t('topbar.history')} disabled={historyDisabled} onClick={onHistory}><History aria-hidden="true" /><span className={styles.label}>{t('topbar.history')}</span></Button>
        <Button type="button" variant="outline" size="sm" aria-label={t('topbar.settings')} onClick={onSettings}><Settings aria-hidden="true" /><span className={styles.label}>{t('topbar.settings')}</span></Button>
        <Button type="button" variant="outline" size="sm" aria-label={t('topbar.preview')} disabled><ExternalLink aria-hidden="true" /><span className={styles.label}>{t('topbar.preview')}</span></Button>
        <span title={publishBlock ?? undefined}>
          <Button type="button" size="sm" disabled={publishBlock !== null} onClick={onPublish}>{t('topbar.publish')}</Button>
        </span>
      </div>
    </div>
  );
}
