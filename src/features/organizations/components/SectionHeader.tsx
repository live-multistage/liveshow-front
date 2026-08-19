import styles from '../pages/OrganizationDashboardPage.module.scss';

interface SectionHeaderProps {
  label: string;
  icon: string;
  action?: React.ReactNode;
}

export function SectionHeader({ label, icon, action }: SectionHeaderProps) {
  const p = { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none' as const, stroke: '#ff5fb4', strokeWidth: 2 };
  const svg = icon === 'info'
    ? <svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 8v4l3 2" /></svg>
    : icon === 'calendar'
    ? <svg {...p}><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 9h18M8 2v4M16 2v4" /></svg>
    : icon === 'team'
    ? <svg {...p}><circle cx="9" cy="8" r="3" /><path d="M3 21a6 6 0 0 1 12 0M16 11a3 3 0 1 0 0-6M21 21a5 5 0 0 0-4-4.9" /></svg>
    : icon === 'sales'
    ? <svg {...p}><path d="M3 17l5-5 4 4 8-9" /><path d="M14 7h6v6" /></svg>
    : <svg {...p}><path d="M3 12h4l3-8 4 16 3-8h4" /></svg>;

  return (
    <div className={styles.sectionHeaderRow}>
      <div className={styles.sectionHeaderTitle}>{svg}{label}</div>
      {action}
    </div>
  );
}
