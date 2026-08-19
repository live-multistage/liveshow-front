import styles from '../pages/OrganizationDashboardPage.module.scss';

function KpiIcon({ kind }: { kind: string }) {
  const p = { width: 12, height: 12, viewBox: '0 0 24 24', fill: 'none' as const, stroke: 'currentColor', strokeWidth: 2 };
  switch (kind) {
    case 'event':   return <svg {...p}><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 9h18M8 2v4M16 2v4" /></svg>;
    case 'team':    return <svg {...p}><circle cx="9" cy="8" r="3" /><path d="M3 21a6 6 0 0 1 12 0M16 11a3 3 0 1 0 0-6M21 21a5 5 0 0 0-4-4.9" /></svg>;
    case 'ticket':  return <svg {...p}><path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2 2 2 0 0 0 0 4 2 2 0 0 1-2 2H5a2 2 0 0 1-2-2 2 2 0 0 0 0-4Z" /></svg>;
    case 'sales':   return <svg {...p}><path d="M3 17l5-5 4 4 8-9" /><path d="M14 7h6v6" /></svg>;
    case 'view':    return <svg {...p}><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>;
    case 'reputation': return <svg {...p}><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z" /></svg>;
    default:        return null;
  }
}

interface KpiCardProps {
  label: string;
  value: string | number;
  unit: string;
  kind: string;
  accent?: boolean;
}

export function KpiCard({ label, value, unit, kind, accent }: KpiCardProps) {
  return (
    <div className={`${styles.kpiCard} ${accent ? styles.kpiCardAccent : ''}`}>
      {accent && <div className={styles.kpiGlow} />}
      <div className={styles.kpiLabel}><KpiIcon kind={kind} /> {label}</div>
      <div className={styles.kpiValue}>
        <span className={`${styles.kpiNum} ${accent ? styles.kpiNumPink : ''}`}>{value}</span>
        <span className={styles.kpiUnit}>{unit}</span>
      </div>
    </div>
  );
}
