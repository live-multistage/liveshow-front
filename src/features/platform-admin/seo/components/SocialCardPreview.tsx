'use client';

import { useTranslations } from 'next-intl';
import common from './SeoCommon.module.scss';
import styles from './SocialCardPreview.module.scss';

interface Props {
  title: string;
  description: string;
  imageUrl: string;
}

// Generic link card (WhatsApp / LinkedIn style). Light surface on purpose, like the Google preview.
export function SocialCardPreview({ title, description, imageUrl }: Props) {
  const t = useTranslations('platformAdmin.seo.editor.social');
  return (
    <section className={common.card} aria-label={t('label')}>
      <span className={common.eyebrow}>{t('label')}</span>
      <div className={styles.card}>
        <div className={styles.media}>
          {imageUrl ? <img src={imageUrl} alt="" className={styles.image} /> : <span className={styles.noImage}>{t('noImage')}</span>}
        </div>
        <div className={styles.text}>
          <div className={styles.domain}>showon.io</div>
          {title && <div className={styles.title}>{title}</div>}
          {description && <div className={styles.description}>{description}</div>}
        </div>
      </div>
    </section>
  );
}
