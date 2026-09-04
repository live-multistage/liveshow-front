import type { CSSProperties, ReactNode } from 'react';
import { Reveal } from './Reveal';
import styles from './SectionHeader.module.scss';

interface SectionHeaderProps {
  label: string;
  title: ReactNode;
  text?: string;
  align?: 'left' | 'center';
  maxTitleCh?: number;
  id?: string;
}

export function SectionHeader({ label, title, text, align = 'left', maxTitleCh, id }: SectionHeaderProps) {
  const titleStyle = maxTitleCh ? ({ maxWidth: `${maxTitleCh}ch` } as CSSProperties) : undefined;
  const cls = [styles.header, align === 'center' ? styles.center : ''].join(' ').trim();

  return (
    <Reveal as="div" className={cls}>
      <div id={id} className={styles.label}>
        {label}
      </div>
      <h2 className={styles.title} style={titleStyle}>
        {title}
      </h2>
      {text ? <p className={styles.text}>{text}</p> : null}
    </Reveal>
  );
}
