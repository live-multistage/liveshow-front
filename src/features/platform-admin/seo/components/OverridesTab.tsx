'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { MoreVertical, Plus } from 'lucide-react';
import { toast } from 'sonner';
import type { SeoPathOverride } from '@live-show/api-contracts';
import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
  Skeleton,
} from '@live-show/design-system';
import { useDeleteSeoOverrideMutation, useSeoOverridesQuery } from '../queries/use-seo-admin';
import { pageNameKey } from '../utils/seo-form';
import { formatSeoDate } from '../utils/seo-format';
import { ConfirmDialog } from './ConfirmDialog';
import styles from './SeoLists.module.scss';

interface Props {
  onEdit: (override: SeoPathOverride | null) => void;
}

export function OverridesTab({ onEdit }: Props) {
  const t = useTranslations('platformAdmin.seo');
  const locale = useLocale();
  const { data, isLoading, isError, refetch } = useSeoOverridesQuery();
  const remove = useDeleteSeoOverrideMutation();
  const [query, setQuery] = useState('');
  const [deleting, setDeleting] = useState<SeoPathOverride | null>(null);

  const needle = query.trim().toLowerCase();
  const rows = (data ?? []).filter((o) => o.path.includes(needle));

  const confirmDelete = async () => {
    if (!deleting) return;
    const target = deleting;
    setDeleting(null);
    try {
      await remove.mutateAsync(target.id);
      toast.success(t('editor.toast.deleted'));
    } catch {
      toast.error(t('editor.toast.deleteError'));
    }
  };

  return (
    <section className={styles.panel}>
      <div className={styles.head}>
        <div>
          <div className={styles.eyebrow}>{t('urls.eyebrow')}</div>
          <div className={styles.heading}>{t('urls.heading')}</div>
        </div>
        <div className={styles.tools}>
          <Input
            className={styles.search}
            aria-label={t('urls.search')}
            placeholder={t('urls.search')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Button onClick={() => onEdit(null)}><Plus size={14} /> {t('urls.new')}</Button>
        </div>
      </div>

      {isLoading && Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className={styles.skeleton} />)}

      {isError && (
        <div className={styles.state} role="alert">
          <div className={styles.stateTitle}>{t('loadError')}</div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>{t('retry')}</Button>
        </div>
      )}

      {data && data.length === 0 && (
        <div className={styles.state}>
          <div className={styles.stateTitle}>{t('urls.emptyTitle')}</div>
          <div className={styles.stateText}>{t('urls.emptyText')}</div>
          <Button onClick={() => onEdit(null)}>{t('urls.new')}</Button>
        </div>
      )}

      {data && data.length > 0 && (
        <>
          <div className={styles.cols}>
            <span>{t('urls.cols.path')}</span>
            <span>{t('urls.cols.type')}</span>
            <span>{t('urls.cols.state')}</span>
            <span className={styles.hideNarrow}>{t('urls.cols.updated')}</span>
            <span />
          </div>
          {rows.map((o) => (
            <div key={o.id} className={`${styles.row} ${styles.rowStatic}`}>
              <button type="button" className={`${styles.name} ${styles.cell}`} onClick={() => onEdit(o)}>{o.path}</button>
              <span className={styles.hideNarrow}>{t(`pageNames.${pageNameKey(o.pageKey)}`)}</span>
              <div className={styles.badges}>
                {o.robotsIndex === false && <Badge variant="outline" className={styles.noindex}>{t('status.noindex')}</Badge>}
                {o.extraJsonLd.length > 0 && <Badge variant="secondary">{t('status.jsonld', { n: o.extraJsonLd.length })}</Badge>}
              </div>
              <span className={`${styles.cell} ${styles.hideNarrow}`}>{formatSeoDate(o.updatedAt, locale)}</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button" className={styles.menuTrigger} aria-label={t('urls.actions', { path: o.path })}>
                    <MoreVertical size={15} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => onEdit(o)}>{t('urls.edit')}</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setDeleting(o)}>{t('urls.delete')}</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
          {rows.length === 0 && <div className={styles.state}>{t('urls.noMatch')}</div>}
        </>
      )}

      <ConfirmDialog
        open={deleting !== null}
        title={t('editor.deleteDialog.title', { path: deleting?.path ?? '' })}
        body={t('editor.deleteDialog.body', { type: deleting ? t(`pageNames.${pageNameKey(deleting.pageKey)}`) : '' })}
        cancelLabel={t('editor.deleteDialog.cancel')}
        confirmLabel={t('editor.deleteDialog.confirm')}
        onCancel={() => setDeleting(null)}
        onConfirm={confirmDelete}
      />
    </section>
  );
}
