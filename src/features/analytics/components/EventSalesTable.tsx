'use client';

import { useGetEventSalesQuery } from '../hooks/use-event-sales';
import type { EventSalesRow } from '../types/sales.types';
import styles from './SalesDashboard.module.scss';

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const GRADIENTS = [
  'linear-gradient(135deg, rgba(255,46,158,.5), rgba(255,122,77,.4))',
  'linear-gradient(135deg, rgba(155,123,255,.5), rgba(70,214,216,.4))',
  'linear-gradient(135deg, rgba(70,214,216,.45), rgba(155,123,255,.4))',
  'linear-gradient(135deg, rgba(127,224,160,.45), rgba(70,214,216,.4))',
  'linear-gradient(135deg, rgba(255,122,77,.45), rgba(255,46,158,.4))',
];

function gradientFor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
}

function metaLine(row: EventSalesRow): string {
  const date = new Date(row.startsAt);
  const dateLabel = Number.isNaN(date.getTime())
    ? null
    : date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  const place = row.city ?? row.venue;
  return [dateLabel, place].filter(Boolean).join(' · ');
}

function thumbStyle(row: EventSalesRow): React.CSSProperties {
  return row.thumbnailUrl
    ? { backgroundImage: `url(${row.thumbnailUrl})` }
    : { backgroundImage: gradientFor(row.eventId) };
}

export function EventSalesTable() {
  const { data, isLoading } = useGetEventSalesQuery();
  const rows = data?.events ?? [];

  const maxRevenue = Math.max(...rows.map((r) => r.totalRevenue), 1);
  const totalSales = rows.reduce((a, r) => a + r.totalOrders, 0);
  const totalRevenue = rows.reduce((a, r) => a + r.totalRevenue, 0);

  return (
    <div className={styles.tableCard}>
      <div className={styles.tableHead}>
        <span className={styles.tableTitle}>VENDAS POR EVENTO</span>
        <span className={styles.tableCount}>{rows.length} eventos</span>
      </div>

      {isLoading ? (
        <div className={styles.loadingWrap}>
          <span className={styles.spinner} />
        </div>
      ) : rows.length === 0 ? (
        <div className={styles.emptyRow}>Nenhuma venda registrada ainda.</div>
      ) : (
        <>
          <div className={styles.colHead}>
            <div>EVENTO</div>
            <div className={styles.colRight}>VENDAS</div>
            <div className={styles.colRight}>RECEITA</div>
          </div>

          {rows.map((row) => {
            const zero = row.totalOrders === 0;
            const pct = row.totalRevenue > 0 ? Math.max((row.totalRevenue / maxRevenue) * 100, 6) : 0;
            const meta = metaLine(row);

            return (
              <div key={row.eventId} className={styles.row}>
                <div className={styles.rowEvent}>
                  <div className={styles.thumb} style={thumbStyle(row)} />
                  <div style={{ minWidth: 0 }}>
                    <div className={styles.rowName}>{row.eventTitle}</div>
                    {meta && <div className={styles.rowMeta}>{meta}</div>}
                  </div>
                </div>
                <div className={`${styles.rowSales} ${zero ? styles.rowSalesZero : ''}`}>
                  {row.totalOrders}
                </div>
                <div className={styles.rowRevenue}>
                  <div className={`${styles.rowRevenueValue} ${zero ? styles.rowRevenueZero : ''}`}>
                    {formatCurrency(row.totalRevenue)}
                  </div>
                  <div className={styles.bar}>
                    <div className={styles.barFill} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </div>
            );
          })}

          <div className={styles.tableFoot}>
            <span className={styles.footLabel}>TOTAL</span>
            <div className={styles.footValues}>
              <span className={styles.footSales}>{totalSales} vendas</span>
              <span className={styles.footRevenue}>{formatCurrency(totalRevenue)}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
