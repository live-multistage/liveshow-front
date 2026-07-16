'use client';

import { usePlatformRevenueQuery } from '@/features/platform-admin/queries/get-finance';
import type { OverviewRange } from '@/features/platform-admin/queries/get-platform-overview';
import { brlCompact, ratePct } from '@/features/platform-admin/utils/format';
import styles from './SuperAdminDashboard.module.scss';

// Platform revenue card (design: "Receita da plataforma") — commission over
// GMV. Bar chart built from the daily series.
export function RevenueCard({ range }: { range: OverviewRange }) {
  const { data, isLoading } = usePlatformRevenueQuery(range);
  const max = data ? Math.max(1, ...data.series.map((s) => s.revenue)) : 1;
  const up = (data?.revenueDeltaPct ?? 0) >= 0;

  return (
    <div className={styles.finCard}>
      <div className={styles.finHeader}>
        <div>
          <div className={styles.finEyebrow}>FINANCEIRO · LEDGER</div>
          <div className={styles.finTitle}>Receita da plataforma</div>
          <div className={styles.finSub}>Comissões (SALE) sobre o GMV · {data?.rangeDays ?? '—'} dias</div>
        </div>
        <div className={styles.finHeadRight}>
          <div className={styles.finBig}>{isLoading ? '—' : brlCompact(data?.revenue ?? 0)}</div>
          {!!data && (
            <div className={up ? styles.finDeltaUp : styles.finDeltaDown}>
              {up ? '+' : ''}{data.revenueDeltaPct}% vs. período anterior
            </div>
          )}
        </div>
      </div>

      <div className={styles.barChart}>
        {(data?.series ?? []).map((s) => (
          <div key={s.date} className={styles.barCol} title={`${s.date}: ${brlCompact(s.revenue)}`}>
            <div className={styles.bar} style={{ height: `${(s.revenue / max) * 100}%` }} />
          </div>
        ))}
        {!isLoading && !data?.series.length && <div className={styles.barEmpty}>Sem vendas no período.</div>}
      </div>

      <div className={styles.finFooter}>
        <div>
          <div className={styles.finStatLabel}>GMV</div>
          <div className={styles.finStatValue}>{brlCompact(data?.gmv ?? 0)}</div>
        </div>
        <div>
          <div className={styles.finStatLabel}>TAXA MÉDIA</div>
          <div className={`${styles.finStatValue} ${styles.finStatAccent}`}>{ratePct(data?.avgRate ?? 0)}</div>
        </div>
        <div>
          <div className={styles.finStatLabel}>TICKET MÉDIO</div>
          <div className={styles.finStatValue}>{brlCompact(data?.avgTicket ?? 0)}</div>
        </div>
      </div>
    </div>
  );
}
