'use client';

import { useId, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Input, Textarea } from '@live-show/design-system';
import { DESCRIPTION_MAX, TITLE_MAX, fillVariables, type SeoForm } from '../utils/seo-form';
import { useSampleValue } from './use-sample';
import common from './SeoCommon.module.scss';

interface Props {
  form: SeoForm;
  vars: readonly string[];
  errors: Record<string, string>;
  onChange: (patch: Partial<SeoForm>) => void;
}

type TextField = 'title' | 'description';

// Title + description templates with variable chips that insert at the caret of the last focused field.
export function SearchSection({ form, vars, errors, onChange }: Props) {
  const t = useTranslations('platformAdmin.seo.editor.search');
  const sample = useSampleValue();
  const ids = { title: useId(), description: useId() };
  const refs = { title: useRef<HTMLInputElement>(null), description: useRef<HTMLTextAreaElement>(null) };
  const last = useRef<TextField>('title');

  const insert = (name: string) => {
    const field = last.current;
    const el = refs[field].current;
    const token = `{{${name}}}`;
    const value = form[field];
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? start;
    onChange({ [field]: value.slice(0, start) + token + value.slice(end) });
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + token.length, start + token.length);
    });
  };

  const filledTitleLength = fillVariables(form.title, sample).length;
  const resetLabel = (label: string) => `${t('reset')} (${label})`;

  return (
    <section className={common.card}>
      <div>
        <div className={common.eyebrow}>{t('eyebrow')}</div>
        <div className={common.cardTitle}>{t('title')}</div>
      </div>

      <div className={common.field}>
        <div className={common.labelRow}>
          <label htmlFor={ids.title} className={common.label}>{t('titleLabel')}</label>
          {form.title && (
            <button type="button" className={common.resetBtn} aria-label={resetLabel(t('titleLabel'))} onClick={() => onChange({ title: '' })}>↺</button>
          )}
          <span className={filledTitleLength > TITLE_MAX ? `${common.counter} ${common.counterOver}` : common.counter}>
            {form.title.length}
          </span>
        </div>
        <Input
          id={ids.title}
          ref={refs.title}
          value={form.title}
          placeholder={t('codeDefault')}
          aria-invalid={errors.titleTemplate ? true : undefined}
          onFocus={() => { last.current = 'title'; }}
          onChange={(e) => onChange({ title: e.target.value })}
        />
        {filledTitleLength > TITLE_MAX && <span className={common.warn}>{t('titleLong', { max: TITLE_MAX })}</span>}
        {errors.titleTemplate && <p role="alert" className={common.error}>{errors.titleTemplate}</p>}
      </div>

      <div className={common.field}>
        <div className={common.labelRow}>
          <label htmlFor={ids.description} className={common.label}>{t('descLabel')}</label>
          {form.description && (
            <button type="button" className={common.resetBtn} aria-label={resetLabel(t('descLabel'))} onClick={() => onChange({ description: '' })}>↺</button>
          )}
        </div>
        <Textarea
          id={ids.description}
          ref={refs.description}
          rows={3}
          max={DESCRIPTION_MAX}
          value={form.description}
          placeholder={t('codeDefault')}
          error={errors.descriptionTemplate}
          onFocus={() => { last.current = 'description'; }}
          onChange={(e) => onChange({ description: e.target.value })}
        />
      </div>

      <div className={common.field}>
        <div className={common.labelRow}>
          <span className={common.label}>{t('vars')}</span>
          <span className={common.hint}>{t('varsHint')}</span>
        </div>
        <div className={common.chips}>
          {vars.map((name) => (
            <button key={name} type="button" className={common.chipBtn} onMouseDown={(e) => e.preventDefault()} onClick={() => insert(name)}>
              {name}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
