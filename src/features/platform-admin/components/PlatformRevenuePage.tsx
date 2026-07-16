'use client';

import { useState } from 'react';
import { RevenueCard } from '@/features/dashboard/components/RevenueCard';
import { useRevenueBreakdownQuery } from '../queries/get-platform-directory';
import { brlCompact } from '../utils/format';
import { PlatformPageShell } from './PlatformPageShell';
import table from './PlatformTable.module.scss';

type Range = '7d' | '30d' | '90d';
const RANGES: { id: Range; label: string }[] = [
  { id: '7d', label: '7 dias' },
  { id: '30d', label: '30 dias' },
  { id: '90d', label: '90 dias' },
];

// D2 — Receita da plataforma. RevenueCard (série + KPIs) como hero + breakdown
// por organização (Σ comissão, GMV, participação).
export function PlatformRevenuePage() {
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
          aria-label="Período"
        >
          {RANGES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
        </select>
      }
    >
      <div style={{ marginBottom: 20 }}>
        <RevenueCard range={range} />
      </div>

      <div className={table.card}>
        <div className={table.scroll}>
          <div className={table.head} style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 0.8fr' }}>
            <span>Organização</span>
            <span className={table.right}>Comissão</span>
            <span className={table.right}>GMV</span>
            <span className={table.right}>Vendas</span>
            <span className={table.right}>Share</span>
          </div>

          {isLoading && <div className={table.empty}>Carregando…</div>}
          {!isLoading && (rows?.length ?? 0) === 0 && (
            <div className={table.empty}>Nenhuma venda no período.</div>
          )}

          {rows?.map((r) => (
            <div key={r.orgId} className={table.row} style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 0.8fr' }}>
              <span className={table.primary}>{r.name}</span>
              <span className={`${table.mono} ${table.right}`} style={{ color: '#ff5fb4' }}>{brlCompact(r.commission)}</span>
              <span className={`${table.mono} ${table.right}`}>{brlCompact(r.gmv)}</span>
              <span className={`${table.mono} ${table.right}`}>{r.sales}</span>
              <span className={`${table.mono} ${table.right}`}>{r.sharePct.toFixed(1).replace('.', ',')}%</span>
            </div>
          ))}
        </div>
      </div>
    </PlatformPageShell>
  );
}
