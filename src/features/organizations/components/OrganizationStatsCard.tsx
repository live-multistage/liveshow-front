'use client';

import styles from './OrganizationStatsCard.module.scss';

interface Props {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
}

export function OrganizationStatsCard({ label, value, icon }: Props) {
  return (
    <div className={styles.card}>
      {icon && <div className={styles.icon}>{icon}</div>}
      <div className={styles.content}>
        <p className={styles.label}>{label}</p>
        <p className={styles.value}>{value}</p>
      </div>
    </div>
  );
}
