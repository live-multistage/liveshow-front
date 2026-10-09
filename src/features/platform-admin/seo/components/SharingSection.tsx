'use client';

import { useId } from 'react';
import { useTranslations } from 'next-intl';
import { Input } from '@live-show/design-system';
import { isHttpsUrl } from '../utils/seo-form';
import common from './SeoCommon.module.scss';
import styles from './SharingSection.module.scss';

interface Props {
  value: string;
  error?: string;
  eyebrow?: string;
  title?: string;
  label?: string;
  // Empty string hides the help line (the default help describes per-page fallback).
  help?: string;
  onChange: (value: string) => void;
}

export function SharingSection({ value, error, eyebrow, title, label, help, onChange }: Props) {
  const t = useTranslations('platformAdmin.seo.editor.share');
  const tReset = useTranslations('platformAdmin.seo.editor.search');
  const id = useId();
  const valid = value !== '' && isHttpsUrl(value);
  const message = error ?? (value !== '' && !valid ? t('invalid') : undefined);

  return (
    <section className={common.card}>
      <div>
        <div className={common.eyebrow}>{eyebrow ?? t('eyebrow')}</div>
        <div className={common.cardTitle}>{title ?? t('title')}</div>
      </div>
      <div className={common.field}>
        <div className={common.labelRow}>
          <label htmlFor={id} className={common.label}>{label ?? t('ogLabel')}</label>
          {value && (
            <button type="button" className={common.resetBtn} aria-label={`${tReset('reset')} (${t('ogLabel')})`} onClick={() => onChange('')}>↺</button>
          )}
        </div>
        <Input id={id} value={value} placeholder="https://" aria-invalid={message ? true : undefined} onChange={(e) => onChange(e.target.value)} />
        {(help ?? t('help')) !== '' && <span className={common.hint}>{help ?? t('help')}</span>}
        {message && <p role="alert" className={common.error}>{message}</p>}
      </div>
      {valid && (
        <div className={styles.thumb}>
          <img src={value} alt={t('thumb')} className={styles.image} />
          <span className={styles.size}>1200 × 630</span>
        </div>
      )}
    </section>
  );
}
