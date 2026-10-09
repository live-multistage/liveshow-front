'use client';

import { useTranslations } from 'next-intl';
import { SEO_LIMITS, SEO_OPTIMAL } from '@live-show/api-contracts';
import type { SeoForm } from '../utils/seo-form';
import { InheritedTextField } from './InheritedTextField';
import { OgImageField } from './OgImageField';
import common from './SeoCommon.module.scss';

interface Props {
  form: SeoForm;
  // Meta title/description with variables already filled, used as the inherited placeholders.
  metaTitle: string;
  metaDescription: string;
  previewUrl: string;
  errors: Record<string, string>;
  onChange: (patch: Partial<SeoForm>) => void;
  onImageChange: (value: string, previewUrl: string) => void;
}

export function OpenGraphSection({ form, metaTitle, metaDescription, previewUrl, errors, onChange, onImageChange }: Props) {
  const t = useTranslations('platformAdmin.seo.editor');
  return (
    <section className={common.card}>
      <div>
        <div className={common.eyebrow}>{t('og.eyebrow')}</div>
        <div className={common.cardTitle}>{t('og.title')}</div>
      </div>
      <InheritedTextField
        label={t('og.titleLabel')}
        value={form.ogTitle}
        inherited={metaTitle}
        inheritedLabel={t('counter.inheritedMeta')}
        max={SEO_LIMITS.title}
        range={SEO_OPTIMAL.title}
        error={errors.ogTitle}
        onChange={(ogTitle) => onChange({ ogTitle })}
      />
      <InheritedTextField
        multiline
        label={t('og.descLabel')}
        value={form.ogDescription}
        inherited={metaDescription}
        inheritedLabel={t('counter.inheritedMeta')}
        max={SEO_LIMITS.description}
        range={SEO_OPTIMAL.description}
        error={errors.ogDescription}
        onChange={(ogDescription) => onChange({ ogDescription })}
      />
      <OgImageField value={form.ogImage} previewUrl={previewUrl} error={errors.ogImageUrl} onChange={onImageChange} />
    </section>
  );
}
