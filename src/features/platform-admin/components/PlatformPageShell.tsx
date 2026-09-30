'use client';

import styles from './PlatformPageShell.module.scss';

interface Props {
  group: string;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  // Fills the dashboard viewport so one child can take the leftover height
  // (and scroll inside it) instead of growing the page.
  fill?: boolean;
  children: React.ReactNode;
}

// Shared header for every super-admin platform destination — keeps the eyebrow
// group / title / subtitle cadence consistent across the sidebar pages.
export function PlatformPageShell({ group, title, subtitle, actions, fill = false, children }: Props) {
  return (
    <div className={fill ? `${styles.wrapper} ${styles.fill}` : styles.wrapper}>
      <div className={styles.header}>
        <div className={styles.headings}>
          <div className={styles.eyebrow}>{group}</div>
          <h1 className={styles.title}>{title}</h1>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>
        {actions && <div className={styles.actions}>{actions}</div>}
      </div>
      {children}
    </div>
  );
}
