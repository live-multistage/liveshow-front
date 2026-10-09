'use client';

import { useId } from 'react';
import { useTranslations } from 'next-intl';
import { SEO_LOCALES, type JsonLdMode, type SeoLocale } from '@live-show/api-contracts';
import { Input } from '@live-show/design-system';
import { isHttpsUrl, type SeoForm } from '../utils/seo-form';
import { IndexingSection } from './IndexingSection';
import { SegmentedControl } from './SegmentedControl';
import common from './SeoCommon.module.scss';
import styles from './AdvancedSection.module.scss';

interface Props {
  form: SeoForm;
  isOverride: boolean;
  errors: Record<string, string>;
  onChange: (patch: Partial<SeoForm>) => void;
}

type ModeChoice = JsonLdMode | 'inherit';

// Canonical, page language, robots and the JSON-LD mode. A template has no "inherit" mode: null means COMPLEMENT there.
export function AdvancedSection({ form, isOverride, errors, onChange }: Props) {
  const t = useTranslations('platformAdmin.seo.editor');
  const canonicalId = useId();
  const canonicalError = errors.canonicalUrl ?? (form.canonicalUrl !== '' && !isHttpsUrl(form.canonicalUrl) ? t('advanced.canonicalInvalid') : undefined);

  const modes: { value: ModeChoice; label: string }[] = [
    ...(isOverride ? [{ value: 'inherit' as const, label: t('advanced.modeInherit') }] : []),
    { value: 'COMPLEMENT', label: t('advanced.modeComplement') },
    { value: 'REPLACE', label: t('advanced.modeReplace') },
  ];
  const mode: ModeChoice = form.jsonLdMode ?? (isOverride ? 'inherit' : 'COMPLEMENT');
  const locales: { value: SeoLocale | ''; label: string }[] = [
    { value: '', label: t('advanced.localeDefault') },
    ...SEO_LOCALES.map((value) => ({ value, label: value })),
  ];

  return (
    <section className={common.card}>
      <div>
        <div className={common.eyebrow}>{t('advanced.eyebrow')}</div>
        <div className={common.cardTitle}>{t('advanced.title')}</div>
      </div>

      <div className={common.field}>
        <label htmlFor={canonicalId} className={common.label}>{t('advanced.canonical')}</label>
        <Input
          id={canonicalId}
          value={form.canonicalUrl}
          placeholder="https://"
          aria-invalid={canonicalError ? true : undefined}
          onChange={(e) => onChange({ canonicalUrl: e.target.value })}
        />
        <span className={common.hint}>{t('advanced.canonicalHelp')}</span>
        {canonicalError && <p role="alert" className={common.error}>{canonicalError}</p>}
      </div>

      <div className={styles.row}>
        <div>
          <div className={common.label}>{t('advanced.locale')}</div>
          <div className={common.hint}>{t('advanced.localeHelp')}</div>
        </div>
        <SegmentedControl label={t('advanced.locale')} value={form.locale} options={locales} onChange={(locale) => onChange({ locale })} />
      </div>

      <IndexingSection index={form.index} follow={form.follow} onChange={onChange} />

      <div className={styles.row}>
        <div className={common.label}>{t('advanced.mode')}</div>
        <SegmentedControl
          label={t('advanced.mode')}
          value={mode}
          options={modes}
          onChange={(choice) => onChange({ jsonLdMode: choice === 'inherit' ? null : choice })}
        />
      </div>
      {form.jsonLdMode === 'REPLACE' && <div className={styles.warn} role="status">{t('advanced.replaceWarn')}</div>}
    </section>
  );
}
