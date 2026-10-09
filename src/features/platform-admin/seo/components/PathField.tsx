'use client';

import { useId } from 'react';
import { useTranslations } from 'next-intl';
import { normalizeSeoPath, type SeoPageKey } from '@live-show/api-contracts';
import { Input } from '@live-show/design-system';
import { PAGE_ROUTES, pageNameKey } from '../utils/seo-form';
import common from './SeoCommon.module.scss';
import styles from './PathField.module.scss';

interface Props {
  value: string;
  pageKey: SeoPageKey | null;
  conflict: boolean;
  serverError?: string;
  onChange: (value: string) => void;
  onOpenExisting: () => void;
}

// Exact-path input with live detection of the page type the path belongs to.
export function PathField({ value, pageKey, conflict, serverError, onChange, onOpenExisting }: Props) {
  const t = useTranslations('platformAdmin.seo.editor.path');
  const tNames = useTranslations('platformAdmin.seo.pageNames');
  const id = useId();
  const typed = value.trim() !== '';
  const normalized = typed ? normalizeSeoPath(value) : '';

  return (
    <section className={common.card}>
      <div className={common.field}>
        <label htmlFor={id} className={common.label}>{t('label')}</label>
        <div className={styles.input}>
          <span className={styles.prefix}>showon.io</span>
          <Input id={id} className={common.mono} value={value} placeholder={t('placeholder')} spellCheck={false} onChange={(e) => onChange(e.target.value)} />
        </div>
        {typed && pageKey && (
          <div className={styles.ok}><span aria-hidden>✓</span> {t('detected', { type: tNames(pageNameKey(pageKey)), route: PAGE_ROUTES[pageKey] })}</div>
        )}
        {typed && !pageKey && <div className={common.error}>{t('invalid')}</div>}
        {typed && normalized !== value && (
          <div className={common.hint}>{t('normalized')} <code className={common.mono}>{normalized}</code></div>
        )}
        {!typed && <div className={common.hint}>{t('hint')}</div>}
        {conflict && (
          <div className={common.error} role="alert">
            {t('conflict')}{' '}
            <button type="button" className={styles.link} onClick={onOpenExisting}>{t('openExisting')}</button>
          </div>
        )}
        {serverError && <p role="alert" className={common.error}>{serverError}</p>}
        {pageKey && <div className={common.hint}>{t('inherit', { type: tNames(pageNameKey(pageKey)) })}</div>}
      </div>
    </section>
  );
}
