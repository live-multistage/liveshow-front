import type { ReactNode } from 'react';
import type { PageSectionAppearance } from '@live-show/api-contracts';
import styles from './SectionFrame.module.scss';

interface Props {
  id: string;
  appearance: PageSectionAppearance;
  variant?: 'hero' | 'strip' | 'final';
  children: ReactNode;
}

export function SectionFrame({ id, appearance, variant, children }: Props) {
  const cls = [
    styles.frame,
    styles[`bg_${appearance.background}`],
    styles[`pad_${appearance.spacing}`],
    styles[`show_${appearance.showOn}`],
    variant && styles[variant],
  ].filter(Boolean).join(' ');
  return <section id={id} className={cls}>{children}</section>;
}
