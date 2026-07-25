'use client';

import { usePlatformRevenueQuery } from '@/features/platform-admin/queries/get-finance';
import type { OverviewRange } from '@/features/platform-admin/queries/get-platform-overview';
import type { CurrencyRevenue } from '@/features/platform-admin/types/platform-admin.types';
import { moneyCompact, ratePct } from '@/features/platform-admin/utils/format';
import styles from './SuperAdminDashboard.module.scss';

// Platform revenue card (design: "Receita da plataforma") — commission over
// GMV. One block per currency (no FX conversion; figures are never summed
// across currencies), each with its own headline, delta, series and KPIs.
export function RevenueCard({ range }: { range: OverviewRange }) {
  const { data, isLoading } = usePlatformRevenueQuery(range);
  const currencies = data?.byCurrency ?? [];

  return (
    <div className={styles.finCard}>
      <div className={styles.finHeader}>
        <div>
          <div className={styles.finEyebrow}>FINANCEIRO · LEDGER</div>
          <div className={styles.finTitle}>Receita da plataforma</div>
          <div className={styles.finSub}>Comissões (SALE) sobre o GMV · {data?.rangeDays ?? '—'} dias</div>
        </div>
      </div>

      {isLoading && <div className={styles.barEmpty}>—</div>}
      {!isLoading && currencies.length === 0 && (
        <div className={styles.barEmpty}>Sem vendas no período.</div>
      )}

      {currencies.map((c) => <CurrencyBlock key={c.currency} c={c} />)}
    </div>
  );
}

function CurrencyBlock({ c }: { c: CurrencyRevenue }) {
  const max = Math.max(1, ...c.series.map((s) => s.revenue));
  const up = c.revenueDeltaPct >= 0;

  return (
    <div className={styles.finCurrencyBlock}>
      <div className={styles.finHeadRight}>
        <div className={styles.finCurrencyTag}>{c.currency}</div>
        <div className={styles.finBig}>{moneyCompact(c.revenue, c.currency)}</div>
        <div className={up ? styles.finDeltaUp : styles.finDeltaDown}>
          {up ? '+' : ''}{c.revenueDeltaPct}% vs. período anterior
        </div>
      </div>

      <div className={styles.barChart}>
        {c.series.map((s) => (
          <div key={s.date} className={styles.barCol} title={`${s.date}: ${moneyCompact(s.revenue, c.currency)}`}>
            <div className={styles.bar} style={{ height: `${(s.revenue / max) * 100}%` }} />
          </div>
        ))}
      </div>

      <div className={styles.finFooter}>
        <div>
          <div className={styles.finStatLabel}>GMV</div>
          <div className={styles.finStatValue}>{moneyCompact(c.gmv, c.currency)}</div>
        </div>
        <div>
          <div className={styles.finStatLabel}>TAXA MÉDIA</div>
          <div className={`${styles.finStatValue} ${styles.finStatAccent}`}>{ratePct(c.avgRate)}</div>
        </div>
        <div>
          <div className={styles.finStatLabel}>TICKET MÉDIO</div>
          <div className={styles.finStatValue}>{moneyCompact(c.avgTicket, c.currency)}</div>
        </div>
      </div>
    </div>
  );
}
