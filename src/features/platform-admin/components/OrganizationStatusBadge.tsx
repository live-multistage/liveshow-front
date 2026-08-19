import type { OrganizationStatus } from '../types/platform-admin.types';
import styles from './OrganizationStatusBadge.module.scss';

const STATUS_META: Record<OrganizationStatus, { label: string; color: string; bg: string; border: string; dot?: boolean }> = {
  PENDING:   { label: 'Pendente',  color: '#fbbf24', bg: 'rgba(245,158,11,.12)', border: 'rgba(245,158,11,.34)', dot: true },
  ACTIVE:    { label: 'Ativa',     color: '#7fe0a0', bg: 'rgba(127,224,160,.1)', border: 'rgba(127,224,160,.3)' },
  SUSPENDED: { label: 'Suspensa',  color: '#cfcfd6', bg: 'rgba(255,255,255,.05)', border: 'rgba(255,255,255,.14)' },
  ARCHIVED:  { label: 'Arquivada', color: '#7d7d85', bg: 'rgba(255,255,255,.03)', border: 'rgba(255,255,255,.08)' },
  REJECTED:  { label: 'Rejeitada', color: '#f87171', bg: 'rgba(239,68,68,.1)', border: 'rgba(239,68,68,.32)' },
};

export function OrganizationStatusBadge({ status }: { status: OrganizationStatus }) {
  const m = STATUS_META[status];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        fontFamily: "'Space Mono', monospace",
        fontSize: '10px',
        fontWeight: 700,
        letterSpacing: '.08em',
        padding: '5px 10px',
        borderRadius: '7px',
        whiteSpace: 'nowrap',
        color: m.color,
        background: m.bg,
        border: `1px solid ${m.border}`,
      }}
    >
      {m.dot && <span className={styles.dot} />}
      {m.label.toUpperCase()}
    </span>
  );
}
