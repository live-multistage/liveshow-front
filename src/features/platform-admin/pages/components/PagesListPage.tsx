'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { AlertCircle, ExternalLink, LayoutTemplate, Plus, Search } from 'lucide-react';
import type { PageStatus, PageSummary } from '@live-show/api-contracts';
import { Button, Chip, Skeleton } from '@live-show/design-system';
import { PlatformPageShell } from '../../components/PlatformPageShell';
import { usePagesListQuery } from '../queries/use-pages';
import { NewPageDialog } from './NewPageDialog';
import styles from './PagesListPage.module.scss';

type StatusFilter = PageStatus | 'ALL';
const FILTERS: { key: StatusFilter; label: 'all' | 'published' | 'draft' | 'archived' }[] = [
  { key: 'ALL', label: 'all' },
  { key: 'PUBLISHED', label: 'published' },
  { key: 'DRAFT', label: 'draft' },
  { key: 'ARCHIVED', label: 'archived' },
];
const PILL_CLASS: Record<PageStatus, string> = { PUBLISHED: styles.published, DRAFT: styles.draft, ARCHIVED: styles.archived };

// SUPER_ADMIN: list of builder pages. Filtering is client-side — the full list is small and the
// "n de m" counter needs the unfiltered total anyway.
export function PagesListPage() {
  const t = useTranslations('platformAdmin.pages');
  const [status, setStatus] = useState<StatusFilter>('ALL');
  const [q, setQ] = useState('');
  const [creating, setCreating] = useState(false);
  const query = usePagesListQuery({});

  const pages = query.data ?? [];
  const needle = q.trim().toLowerCase();
  const visible = pages.filter(
    (p) => (status === 'ALL' || p.status === status) && (!needle || `${p.title} ${p.slug}`.toLowerCase().includes(needle)),
  );
  const isEmpty = query.isSuccess && pages.length === 0;

  return (
    <PlatformPageShell
      group="CONFIG & GOVERNANÇA"
      title={t('title')}
      subtitle={t('subtitle')}
      actions={isEmpty ? undefined : <NewButton onClick={() => setCreating(true)} label={t('new')} />}
    >
      {!isEmpty && (
        <div className={styles.toolbar}>
          <label className={styles.search}>
            <Search size={15} aria-hidden="true" />
            <input aria-label={t('searchLabel')} placeholder={t('searchPlaceholder')} value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
          <div className={styles.chips} role="group" aria-label={t('filterLabel')}>
            {FILTERS.map((f) => (
              <Chip key={f.key} variant={status === f.key ? 'active' : 'default'} aria-pressed={status === f.key} onClick={() => setStatus(f.key)}>
                {t(`filters.${f.label}`)}
              </Chip>
            ))}
          </div>
          {query.isSuccess && <span className={styles.count}>{t('count', { shown: visible.length, total: pages.length })}</span>}
        </div>
      )}

      {query.isPending && <LoadingRows />}
      {query.isError && (
        <div className={styles.stateBox}>
          <span className={`${styles.stateIcon} ${styles.errorIcon}`}><AlertCircle size={18} /></span>
          <div className={styles.stateTitle}>{t('loadError')}</div>
          <Button variant="outline" onClick={() => query.refetch()}>{t('retry')}</Button>
        </div>
      )}
      {isEmpty && (
        <div className={`${styles.stateBox} ${styles.dashed}`}>
          <span className={`${styles.stateIcon} ${styles.accentIcon}`}><LayoutTemplate size={18} /></span>
          <div className={styles.emptyTitle}>{t('empty.title')}</div>
          <p className={styles.emptyBody}>{t('empty.body')}</p>
          <NewButton onClick={() => setCreating(true)} label={t('empty.cta')} />
        </div>
      )}
      {query.isSuccess && pages.length > 0 && visible.length === 0 && (
        <div className={styles.stateBox}>
          <div className={styles.stateTitle}>{needle ? t('noResults', { q: q.trim() }) : t('noResultsStatus')}</div>
          <Button variant="outline" onClick={() => { setQ(''); setStatus('ALL'); }}>{t('clearSearch')}</Button>
        </div>
      )}
      {visible.length > 0 && <PagesTable pages={visible} />}

      {creating && <NewPageDialog open onOpenChange={setCreating} pages={pages} />}
    </PlatformPageShell>
  );
}

function NewButton({ onClick, label }: { onClick: () => void; label: string }) {
  return <Button onClick={onClick}><Plus size={14} strokeWidth={2.4} />{label}</Button>;
}

function LoadingRows() {
  return (
    <div className={styles.card} aria-busy="true">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className={styles.skeletonRow}>
          <Skeleton className={styles.skelTitle} />
          <Skeleton className={styles.skelMeta} />
        </div>
      ))}
    </div>
  );
}

function PagesTable({ pages }: { pages: PageSummary[] }) {
  const t = useTranslations('platformAdmin.pages');
  const locale = useLocale();
  const router = useRouter();
  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString(locale, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div className={styles.card}>
      <table className={styles.table} role="table">
        <thead>
          <tr role="row">
            <th role="columnheader">{t('cols.page')}</th>
            <th role="columnheader">{t('cols.status')}</th>
            <th role="columnheader">{t('cols.live')}</th>
            <th role="columnheader">{t('cols.sections')}</th>
            <th role="columnheader">{t('cols.edited')}</th>
            <th role="columnheader"><span className={styles.srOnly}>{t('cols.actions')}</span></th>
          </tr>
        </thead>
        <tbody>
          {pages.map((p) => (
            <tr key={p.id} role="row" className={styles.row} onClick={() => router.push(`/dashboard/platform/pages/${p.id}`)}>
              <td role="cell">
                <Link href={`/dashboard/platform/pages/${p.id}`} className={styles.title} onClick={(e) => e.stopPropagation()}>{p.title}</Link>
                <div className={styles.path}>/p/{p.slug}</div>
              </td>
              <td role="cell">
                <div className={styles.statusCell}>
                <span className={`${styles.pill} ${PILL_CLASS[p.status]}`}>
                  {p.status === 'PUBLISHED' && <span className={styles.pillDot} />}
                  {t(`status.${p.status}`)}
                </span>
                {p.hasUnpublishedChanges && p.publishedVersion !== null && <span className={`${styles.pill} ${styles.pending}`}>{t('pending')}</span>}
                </div>
              </td>
              <td role="cell" className={styles.mono}>{p.publishedVersion !== null && p.status !== 'ARCHIVED' ? `v${p.publishedVersion}` : '—'}</td>
              <td role="cell" className={styles.mono}>{p.sectionCount}</td>
              <td role="cell">
                <div>{formatDate(p.draftUpdatedAt)}</div>
                <div className={styles.hint}>{p.draftUpdatedBy?.name ?? '—'}</div>
              </td>
              <td role="cell" className={styles.actions}>
                {p.status === 'PUBLISHED' && (
                  <a href={`/p/${p.slug}`} target="_blank" rel="noopener noreferrer" className={styles.iconBtn} aria-label={t('openPublic', { title: p.title })} onClick={(e) => e.stopPropagation()}>
                    <ExternalLink size={15} />
                  </a>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
