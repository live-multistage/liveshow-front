'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Pagination } from '@live-show/design-system';
import { useAuditSearchQuery } from '@/features/platform-admin/queries/get-audit';
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

// Paged on the server through /audit/search, the same endpoint the full audit
// page uses — the trail grows without bound, so there is no client-side slice
// that stays honest. /platform/audit is still where filters live.
const PAGE_SIZE = 10;

export function AuditLogCard() {
  const t = useTranslations('dashboard');
  const [page, setPage] = useState(1);
  const { data, isLoading } = useAuditSearchQuery(
    { page, limit: PAGE_SIZE },
    // Only the newest page polls: refreshing page 3 would shuffle rows the
    // reader is in the middle of.
    { refetchInterval: page === 1 ? 30_000 : false },
  );

  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className={styles.finCard}>
      <div className={styles.finHeader}>
        <div>
          <div className={styles.finEyebrow}>GOVERNANÇA</div>
          <div className={styles.finTitle}>Trilha de auditoria</div>
        </div>
      </div>

      {isLoading && <div className={styles.balEmpty}>Carregando…</div>}
      {!isLoading && total === 0 && <div className={styles.balEmpty}>Nenhuma ação registrada.</div>}

      <div className={styles.auditList}>
        {data?.items.map((e) => (
          <AuditRow key={e.id} e={e} />
        ))}
      </div>

      {total > PAGE_SIZE && (
        <div className={styles.cardPager}>
          <span className={styles.cardPagerRange}>
            {t('pagination.range', {
              from: (page - 1) * PAGE_SIZE + 1,
              to: Math.min(page * PAGE_SIZE, total),
              total,
            })}
          </span>
          <Pagination
            page={page}
            pageCount={pageCount}
            onPageChange={setPage}
            labels={{
              prev: t('pagination.prev'),
              next: t('pagination.next'),
              nav: t('pagination.nav'),
              prevAria: t('pagination.prevAria'),
              nextAria: t('pagination.nextAria'),
            }}
          />
        </div>
      )}
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
