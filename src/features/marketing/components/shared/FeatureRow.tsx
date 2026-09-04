import type { ReactNode } from 'react';
import { Reveal } from './Reveal';
import styles from './FeatureRow.module.scss';

export type FeatureRowTone = 'pink' | 'violet';

interface FeatureRowProps {
  icon: ReactNode;
  title: string;
  text: string;
  tone?: FeatureRowTone;
  delay?: number;
}

export function FeatureRow({ icon, title, text, tone = 'pink', delay }: FeatureRowProps) {
  return (
    <Reveal as="div" className={styles.row} delay={delay}>
      <span className={[styles.chip, styles[tone]].join(' ')}>{icon}</span>
      <div>
        <div className={styles.title}>{title}</div>
        <p className={styles.text}>{text}</p>
      </div>
    </Reveal>
  );
}
