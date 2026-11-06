'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { AlertTriangle, ArrowLeft, Check, ExternalLink, History, Monitor, Settings, Smartphone } from 'lucide-react';
import { Button } from '@live-show/design-system';
import type { PageDetail } from '@live-show/api-contracts';
import type { AutosaveStatus } from '../hooks/use-draft-autosave';
import styles from './PageEditor.module.scss';

export const PAGES_LIST_HREF = '/dashboard/platform/pages';

export function formatClock(iso: string | Date, locale: string): string {
  return new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
}

interface Props {
  page: PageDetail;
  saveStatus: AutosaveStatus;
  unpublished: boolean;
}

function statusKey(page: PageDetail, unpublished: boolean): 'archived' | 'draft' | 'unpublished' | 'published' {
  if (page.status === 'ARCHIVED') return 'archived';
  if (page.status === 'DRAFT') return 'draft';
  return unpublished ? 'unpublished' : 'published';
}

function SaveIndicator({ page, status }: { page: PageDetail; status: AutosaveStatus }) {
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
      return <span className={`${styles.saved} ${styles.bad}`}><AlertTriangle aria-hidden="true" />{t('save.error')}</span>;
    case 'conflict':
      return <span className={`${styles.saved} ${styles.bad}`}><AlertTriangle aria-hidden="true" />{t('save.conflict')}</span>;
    case 'blocked':
      return <span className={`${styles.saved} ${styles.bad}`} title={status.message}><AlertTriangle aria-hidden="true" />{t('save.blocked')}</span>;
    case 'idle':
      return <span className={styles.saved}><Check aria-hidden="true" />{t('save.saved', { time: formatClock(page.draftUpdatedAt, locale) })}</span>;
  }
}

// Device switch, history, settings, preview and publish belong to the preview/publish tasks:
// they render here as disabled placeholders with the final labels.
export function EditorTopbar({ page, saveStatus, unpublished }: Props) {
  const t = useTranslations('platformAdmin.pageEditor');
  const key = statusKey(page, unpublished);

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
      <SaveIndicator page={page} status={saveStatus} />
      <div className={styles.topbarActions}>
        <div className={styles.segment} role="group" aria-label={t('topbar.deviceGroup')}>
          <Button type="button" variant="ghost" size="sm" aria-pressed="true" disabled><Monitor aria-hidden="true" /><span className={styles.label}>{t('topbar.desktop')}</span></Button>
          <Button type="button" variant="ghost" size="sm" aria-pressed="false" disabled><Smartphone aria-hidden="true" /><span className={styles.label}>{t('topbar.mobile')}</span></Button>
        </div>
        <span className={styles.vsep} />
        <Button type="button" variant="outline" size="sm" disabled><History aria-hidden="true" /><span className={styles.label}>{t('topbar.history')}</span></Button>
        <Button type="button" variant="outline" size="sm" disabled><Settings aria-hidden="true" /><span className={styles.label}>{t('topbar.settings')}</span></Button>
        <Button type="button" variant="outline" size="sm" disabled><ExternalLink aria-hidden="true" /><span className={styles.label}>{t('topbar.preview')}</span></Button>
        <Button type="button" size="sm" disabled>{t('topbar.publish')}</Button>
      </div>
    </div>
  );
}
