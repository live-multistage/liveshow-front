'use client';

import { useAuditLogQuery } from '@/features/platform-admin/queries/get-audit';
import type { AuditLogEntry } from '@/features/platform-admin/types/platform-admin.types';
import {
  auditActionLabel,
  auditMetaLine,
  auditRelativeTime,
  AUDIT_DANGER,
  AUDIT_MONEY,
} from '@/features/platform-admin/utils/audit-format';
import styles from './SuperAdminDashboard.module.scss';

// Governance: append-only audit trail (design: "Trilha de auditoria").
// Read side of the sensitive-action log — role changes, org approvals,
// fee/payout actions, impersonation sessions.
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
  const tone = AUDIT_DANGER.has(e.action)
    ? styles.auditActionDanger
    : AUDIT_MONEY.has(e.action)
      ? styles.auditActionMoney
      : '';
  const meta = auditMetaLine(e.metadata);

  return (
    <div className={styles.auditRow}>
      <span className={`${styles.auditAction} ${tone}`}>{auditActionLabel(e.action)}</span>
      <span className={styles.auditBody}>
        <span className={styles.auditTarget}>{e.actorName ?? 'Sistema'}</span>
        {e.targetLabel && <> → {e.targetLabel}</>}
        {meta && <span className={styles.auditMeta}>{meta}</span>}
      </span>
      <span className={styles.auditTime}>{auditRelativeTime(e.createdAt)}</span>
    </div>
  );
}
