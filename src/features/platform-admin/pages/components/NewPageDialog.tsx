'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { PAGE_LIMITS, pageSlugError, slugifyPageTitle, type PageSummary } from '@live-show/api-contracts';
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@live-show/design-system';
import { useCreatePageMutation } from '../mutations/use-page-mutations';
import styles from './NewPageDialog.module.scss';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pages: PageSummary[];
}

export function NewPageDialog({ open, onOpenChange, pages }: Props) {
  const t = useTranslations('platformAdmin.pages.dialog');
  const router = useRouter();
  const create = useCreatePageMutation();
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [duplicate, setDuplicate] = useState(false);
  const [sourceId, setSourceId] = useState('');

  const formatError = slug ? pageSlugError(slug) : null;
  const slugTaken = create.error?.status === 409;
  const slugMessage = formatError === 'format' ? t('slugFormat') : formatError === 'reserved' ? t('slugReserved') : slugTaken ? t('slugTaken') : null;
  const otherError = create.isError && !slugTaken ? t('genericError') : null;
  const canSubmit = title.trim() !== '' && slug !== '' && !formatError && !create.isPending && (!duplicate || sourceId !== '');

  const onTitleChange = (value: string) => {
    setTitle(value);
    if (!slugTouched) setSlug(slugifyPageTitle(value));
    create.reset();
  };
  const onSlugChange = (value: string) => {
    setSlugTouched(true);
    setSlug(value);
    create.reset();
  };
  const chooseDuplicate = () => {
    setDuplicate(true);
    setSourceId((current) => current || pages[0]?.id || '');
  };
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    create.mutate(
      { title: title.trim(), slug, ...(duplicate ? { duplicateFromPageId: sourceId } : {}) },
      { onSuccess: (created) => router.push(`/dashboard/platform/pages/${created.id}`) },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('desc')}</DialogDescription>
        </DialogHeader>
        <form className={styles.form} onSubmit={submit}>
          <div className={styles.field}>
            <label htmlFor="np-title" className={styles.label}>
              {t('titleLabel')} <span className={styles.count}>{title.length}/{PAGE_LIMITS.titleMax}</span>
            </label>
            <input id="np-title" className={styles.input} maxLength={PAGE_LIMITS.titleMax} value={title} onChange={(e) => onTitleChange(e.target.value)} />
          </div>

          <div className={styles.field}>
            <label htmlFor="np-slug" className={styles.label}>{t('slugLabel')}</label>
            <div className={`${styles.prefix} ${slugMessage ? styles.bad : ''}`}>
              <span aria-hidden="true">showon.io/p/</span>
              <input
                id="np-slug"
                className={styles.slugInput}
                maxLength={PAGE_LIMITS.slugMax}
                value={slug}
                onChange={(e) => onSlugChange(e.target.value)}
                aria-invalid={slugMessage !== null}
                aria-describedby="np-slug-help"
              />
            </div>
            <div id="np-slug-help" className={slugMessage ? styles.error : styles.hint}>{slugMessage ?? t('slugHint')}</div>
          </div>

          <div className={styles.field}>
            <span className={styles.label}>{t('startLabel')}</span>
            <div className={styles.radios} role="radiogroup" aria-label={t('startLabel')}>
              <button type="button" role="radio" aria-checked={!duplicate} className={`${styles.radio} ${!duplicate ? styles.on : ''}`} onClick={() => setDuplicate(false)}>
                <span className={styles.dot} />
                <span><b>{t('blank')}</b><br /><span className={styles.hint}>{t('blankHint')}</span></span>
              </button>
              <div role="radio" aria-checked={duplicate} aria-disabled={pages.length === 0} tabIndex={0} className={`${styles.radio} ${duplicate ? styles.on : ''}`} onClick={() => pages.length > 0 && chooseDuplicate()} onKeyDown={(e) => (e.key === ' ' || e.key === 'Enter') && pages.length > 0 && chooseDuplicate()}>
                <span className={styles.dot} />
                <span className={styles.grow}>
                  <b>{t('dup')}</b><br /><span className={styles.hint}>{t('dupHint')}</span>
                  {duplicate && (
                    <select className={styles.select} aria-label={t('dupSelect')} value={sourceId} onClick={(e) => e.stopPropagation()} onChange={(e) => setSourceId(e.target.value)}>
                      {pages.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                    </select>
                  )}
                </span>
              </div>
            </div>
          </div>

          {otherError && <p className={styles.error} role="alert">{otherError}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t('cancel')}</Button>
            <Button type="submit" disabled={!canSubmit}>{create.isPending ? t('creating') : t('create')}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
