'use client';

import { useTranslations } from 'next-intl';
import { SEO_LIMITS, SEO_OPTIMAL } from '@live-show/api-contracts';
import type { SeoForm } from '../utils/seo-form';
import { InheritedTextField } from './InheritedTextField';
import common from './SeoCommon.module.scss';

interface Props {
  form: SeoForm;
  // Effective Open Graph values (already falling back to meta), with variables filled.
  ogTitle: string;
  ogDescription: string;
  errors: Record<string, string>;
  onChange: (patch: Partial<SeoForm>) => void;
}

export function TwitterSection({ form, ogTitle, ogDescription, errors, onChange }: Props) {
  const t = useTranslations('platformAdmin.seo.editor');
  const titleLabel = form.ogTitle ? t('counter.inheritedOg') : t('counter.inheritedMeta');
  const descLabel = form.ogDescription ? t('counter.inheritedOg') : t('counter.inheritedMeta');
  return (
    <section className={common.card}>
      <div>
        <div className={common.eyebrow}>{t('twitter.eyebrow')}</div>
        <div className={common.cardTitle}>{t('twitter.title')}</div>
      </div>
      <p className={common.hint}>{t('twitter.hint')}</p>
      <InheritedTextField
        label={t('twitter.titleLabel')}
        value={form.twitterTitle}
        inherited={ogTitle}
        inheritedLabel={titleLabel}
        max={SEO_LIMITS.title}
        range={SEO_OPTIMAL.twitterTitle}
        error={errors.twitterTitle}
        onChange={(twitterTitle) => onChange({ twitterTitle })}
      />
      <InheritedTextField
        multiline
        label={t('twitter.descLabel')}
        value={form.twitterDescription}
        inherited={ogDescription}
        inheritedLabel={descLabel}
        max={SEO_LIMITS.description}
        range={SEO_OPTIMAL.twitterDescription}
        error={errors.twitterDescription}
        onChange={(twitterDescription) => onChange({ twitterDescription })}
      />
    </section>
  );
}
