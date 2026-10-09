'use client';

import { useTranslations } from 'next-intl';
import { lengthBand } from '../utils/length-band';
import styles from './LengthCounter.module.scss';

interface Props {
  length: number;
  max: number;
  range: readonly [number, number];
  // Set when the field is empty and shows an inherited value: the badge gives way to this label.
  inheritedLabel?: string;
}

// `n/max` plus an Otimizado / Curto / Longo badge against the recommended range (never blocks saving).
export function LengthCounter({ length, max, range, inheritedLabel }: Props) {
  const t = useTranslations('platformAdmin.seo.editor.counter');
  const band = inheritedLabel ? null : lengthBand(length, range);
  return (
    <span className={styles.root} title={t('chars', { n: length, max })}>
      <span className={length > max ? `${styles.count} ${styles.over}` : styles.count}>{length}/{max}</span>
      {band && <span className={styles.badge} data-band={band}>{t(band)}</span>}
      {inheritedLabel && <span className={styles.inherited}>{inheritedLabel}</span>}
    </span>
  );
}
