'use client';

import { useTranslations } from 'next-intl';
import common from './SeoCommon.module.scss';
import styles from './GooglePreview.module.scss';
import { DESCRIPTION_MAX, TITLE_MAX } from '../utils/seo-form';

interface Props {
  title: string;
  description: string;
  path: string;
  noindex: boolean;
  sampleName: string | null;
}

// Matches the layout title template (`%s · showon.io`), which every page but home gets.
const withSiteSuffix = (title: string, path: string) => (path === '/' ? title : `${title} · showon.io`);

const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);

// Google keeps the only light surface on purpose: it must not look like our own UI.
export function GooglePreview({ title, description, path, noindex, sampleName }: Props) {
  const t = useTranslations('platformAdmin.seo.editor.preview');
  return (
    <section className={common.card} aria-label={t('label')}>
      <div className={styles.head}>
        <span className={common.eyebrow}>{t('label')}</span>
        {sampleName && <span className={common.hint}>{t('sample', { name: sampleName })}</span>}
      </div>
      <div className={styles.serp}>
        <div className={styles.site}>
          <span className={styles.favicon}>so</span>
          <div>
            <div className={styles.siteName}>showon.io</div>
            <div className={styles.url}>https://showon.io{path === '/' ? '' : path}</div>
          </div>
        </div>
        <div className={styles.title}>{title ? clip(withSiteSuffix(title, path), TITLE_MAX + 10) : t('empty')}</div>
        {description && <div className={styles.description}>{clip(description, DESCRIPTION_MAX)}</div>}
        {noindex && <div className={styles.noindex}>{t('noindex')}</div>}
      </div>
    </section>
  );
}
