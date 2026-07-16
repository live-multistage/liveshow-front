'use client';

import { useOrgBalancesQuery } from '@/features/platform-admin/queries/get-finance';
import { brlCompact, ratePct } from '@/features/platform-admin/utils/format';
import styles from './SuperAdminDashboard.module.scss';

// Org ledger balances (design: "Saldos das organizações"). Read-only in F1 —
// the PAGAR action (payout) lands with the financial F3 spec, audited.
export function OrgBalancesCard() {
  const { data, isLoading } = useOrgBalancesQuery();

  return (
    <div className={styles.finCard}>
      <div className={styles.finHeader}>
        <div>
          <div className={styles.finEyebrow}>FINANCEIRO · PAYOUTS</div>
          <div className={styles.finTitle}>Saldos das organizações</div>
        </div>
      </div>

      <div className={styles.balHead}>
        <span>Organização</span>
        <span>Taxa</span>
        <span className={styles.balRight}>A receber</span>
      </div>

      {isLoading && <div className={styles.balEmpty}>Carregando…</div>}
      {!isLoading && !data?.length && <div className={styles.balEmpty}>Nenhum saldo registrado.</div>}

      <div>
        {data?.map((b) => (
          <div key={b.orgId} className={styles.balRow}>
            <span className={styles.balName}>{b.name}</span>
            <span className={styles.balRate}>
              {ratePct(b.rate)}
              {b.override && <span className={styles.balOvr}>OVR</span>}
            </span>
            <span className={styles.balValue}>{brlCompact(b.balance)}</span>
          </div>
        ))}
      </div>

      <div className={styles.balNote}>
        Payout e override de taxa por org entram na próxima fase (financeiro F3, auditado).
      </div>
    </div>
  );
}
