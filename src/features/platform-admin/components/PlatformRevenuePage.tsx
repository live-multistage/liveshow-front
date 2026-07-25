'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { RevenueCard } from '@/features/dashboard/components/RevenueCard';
import { useRevenueBreakdownQuery } from '../queries/get-platform-directory';
import { moneyCompact } from '../utils/format';
import { PlatformPageShell } from './PlatformPageShell';
import table from './PlatformTable.module.scss';

import type { RevenueBreakdownRow } from '../types/platform-admin.types';

// Preserves the API's currency ordering (commission desc within each).
function groupByCurrency(rows: RevenueBreakdownRow[]): [string, RevenueBreakdownRow[]][] {
  const map = new Map<string, RevenueBreakdownRow[]>();
  for (const r of rows) {
    const arr = map.get(r.currency) ?? [];
    arr.push(r);
    map.set(r.currency, arr);
  }
  return [...map.entries()];
}

type Range = '7d' | '30d' | '90d';
const RANGES: { id: Range; label: string }[] = [
  { id: '7d', label: '7 dias' },
  { id: '30d', label: '30 dias' },
  { id: '90d', label: '90 dias' },
];

// D2 — Receita da plataforma. RevenueCard (série + KPIs) como hero + breakdown
// por organização (Σ comissão, GMV, participação).
export function PlatformRevenuePage() {
  const t = useTranslations('platformAdmin');
  const [range, setRange] = useState<Range>('30d');
  const { data: rows, isLoading } = useRevenueBreakdownQuery(range);

  return (
    <PlatformPageShell
      group="FINANCEIRO · LEDGER"
      title="Receita da plataforma"
      subtitle="Comissões (SALE) sobre o GMV. Detalhe por organização abaixo."
      actions={
        <select
          className={table.filter}
          value={range}
          onChange={(e) => setRange(e.target.value as Range)}
          aria-label={t('period')}
        >
          {RANGES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
        </select>
      }
    >
      <div style={{ marginBottom: 20 }}>
        <RevenueCard range={range} />
      </div>

      {isLoading && <div className={table.card}><div className={table.empty}>Carregando…</div></div>}
      {!isLoading && (rows?.length ?? 0) === 0 && (
        <div className={table.card}><div className={table.empty}>Nenhuma venda no período.</div></div>
      )}

      {/* No FX conversion — one breakdown table per currency, share within it. */}
      {groupByCurrency(rows ?? []).map(([currency, currencyRows]) => (
        <div key={currency} className={table.card} style={{ marginBottom: 16 }}>
          <div className={table.scroll}>
            <div className={table.head} style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 0.8fr' }}>
              <span>{t('organization')} · {currency}</span>
              <span className={table.right}>Comissão</span>
              <span className={table.right}>GMV</span>
              <span className={table.right}>Vendas</span>
              <span className={table.right}>Share</span>
            </div>

            {currencyRows.map((r) => (
              <div key={r.orgId} className={table.row} style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 0.8fr' }}>
                <span className={table.primary}>{r.name}</span>
                <span className={`${table.mono} ${table.right}`} style={{ color: '#ff5fb4' }}>{moneyCompact(r.commission, r.currency)}</span>
                <span className={`${table.mono} ${table.right}`}>{moneyCompact(r.gmv, r.currency)}</span>
                <span className={`${table.mono} ${table.right}`}>{r.sales}</span>
                <span className={`${table.mono} ${table.right}`}>{r.sharePct.toFixed(1).replace('.', ',')}%</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </PlatformPageShell>
  );
}
