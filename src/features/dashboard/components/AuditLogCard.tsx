'use client';

import { useAuditLogQuery } from '@/features/platform-admin/queries/get-audit';
import type { AuditLogEntry } from '@/features/platform-admin/types/platform-admin.types';
import styles from './SuperAdminDashboard.module.scss';

// Governance: append-only audit trail (design: "Trilha de auditoria").
// Read side of the sensitive-action log — role changes, org approvals,
// fee/payout actions, impersonation sessions.
const ACTION_LABELS: Record<string, string> = {
  ROLE_CHANGED: 'ROLE',
  ORG_APPROVED: 'APROVOU',
  ORG_REJECTED: 'REJEITOU',
  FEE_RATE_SET: 'TAXA GLOBAL',
  FEE_OVERRIDE_SET: 'TAXA ORG',
  PAYOUT: 'PAYOUT',
  IMPERSONATION_START: 'IMPERSONAR',
  IMPERSONATION_END: 'FIM IMPERSONAR',
};

const DANGER = new Set(['ORG_REJECTED', 'IMPERSONATION_START']);
const MONEY = new Set(['PAYOUT', 'FEE_RATE_SET', 'FEE_OVERRIDE_SET']);

export function AuditLogCard() {
  const { data, isLoading } = useAuditLogQuery(20);

  return (
    <div className={styles.finCard}>
      <div className={styles.finHeader}>
        <div>
          <div className={styles.finEyebrow}>GOVERNANÇA</div>
          <div className={styles.finTitle}>Trilha de auditoria</div>
        </div>
      </div>

      {isLoading && <div className={styles.balEmpty}>Carregando…</div>}
      {!isLoading && !data?.length && <div className={styles.balEmpty}>Nenhuma ação registrada.</div>}

      <div className={styles.auditList}>
        {data?.map((e) => (
          <AuditRow key={e.id} e={e} />
        ))}
      </div>
    </div>
  );
}

function AuditRow({ e }: { e: AuditLogEntry }) {
  const label = ACTION_LABELS[e.action] ?? e.action;
  const tone = DANGER.has(e.action)
    ? styles.auditActionDanger
    : MONEY.has(e.action)
      ? styles.auditActionMoney
      : '';

  return (
    <div className={styles.auditRow}>
      <span className={`${styles.auditAction} ${tone}`}>{label}</span>
      <span className={styles.auditBody}>
        <span className={styles.auditTarget}>{e.actorName ?? 'Sistema'}</span>
        {e.targetLabel && <> → {e.targetLabel}</>}
        {renderMeta(e.metadata) && <span className={styles.auditMeta}>{renderMeta(e.metadata)}</span>}
      </span>
      <span className={styles.auditTime}>{fmtTime(e.createdAt)}</span>
    </div>
  );
}

function renderMeta(meta: Record<string, unknown> | null): string {
  if (!meta) return '';
  const parts: string[] = [];
  if (typeof meta.role === 'string') parts.push(meta.role);
  if (meta.rate != null) parts.push(`${(Number(meta.rate) * 100).toFixed(1).replace('.', ',')}%`);
  if (meta.rate === null) parts.push('override removido');
  if (typeof meta.reason === 'string') parts.push(meta.reason);
  if (meta.amount != null) parts.push(`R$ ${Number(meta.amount).toFixed(2).replace('.', ',')}`);
  return parts.join(' · ');
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  const now = Date.now();
  const diff = Math.floor((now - d.getTime()) / 1000);
  if (diff < 60) return 'agora';
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}
