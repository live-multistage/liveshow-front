'use client';

import { useTranslations } from 'next-intl';
import type { SeoForm, Tri } from '../utils/seo-form';
import { SegmentedControl } from './SegmentedControl';
import common from './SeoCommon.module.scss';
import styles from './IndexingSection.module.scss';

interface Props {
  index: Tri;
  follow: Tri;
  onChange: (patch: Partial<SeoForm>) => void;
}

// Robots controls; rendered inside the "Configurações avançadas" card.
export function IndexingSection({ index, follow, onChange }: Props) {
  const t = useTranslations('platformAdmin.seo.editor.indexing');
  const options: { value: Tri; label: string }[] = [
    { value: 'default', label: t('default') },
    { value: 'yes', label: t('yes') },
    { value: 'no', label: t('no') },
  ];

  return (
    <>
      <div className={styles.row}>
        <div>
          <div className={common.label}>{t('index')}</div>
          <div className={common.hint}>{t('indexHint')}</div>
        </div>
        <SegmentedControl label={t('index')} value={index} options={options} warnValue="no" onChange={(v) => onChange({ index: v })} />
      </div>
      <div className={styles.row}>
        <div>
          <div className={common.label}>{t('follow')}</div>
          <div className={common.hint}>{t('followHint')}</div>
        </div>
        <SegmentedControl label={t('follow')} value={follow} options={options} warnValue="no" onChange={(v) => onChange({ follow: v })} />
      </div>
      {index === 'no' && <div className={styles.warn} role="status">{t('warn')}</div>}
    </>
  );
}
