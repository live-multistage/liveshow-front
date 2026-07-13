'use client';

import { useState } from 'react';
import { SalesDashboard } from '@/features/analytics/components/SalesDashboard';
import { useGetMySalesQuery } from '@/features/analytics/hooks/use-my-sales';
import { useGetEventSalesQuery } from '@/features/analytics/hooks/use-event-sales';
import type { EventSalesRow, SalesGranularity } from '@/features/analytics/types/sales.types';
import styles from './page.module.scss';

function toCsv(rows: EventSalesRow[]): string {
  const header = ['Evento', 'Data', 'Local', 'Vendas', 'Receita'];
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = rows.map((r) => {
    const date = new Date(r.startsAt);
    const dateLabel = Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('pt-BR');
    const place = r.city ?? r.venue ?? '';
    return [r.eventTitle, dateLabel, place, String(r.totalOrders), r.totalRevenue.toFixed(2)]
      .map(escape)
      .join(',');
  });
  return [header.map(escape).join(','), ...lines].join('\n');
}

function downloadCsv(rows: EventSalesRow[]) {
  const blob = new Blob([`﻿${toCsv(rows)}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `vendas-por-evento-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function DashboardSalesPage() {
  const [granularity, setGranularity] = useState<SalesGranularity>('month');
  const { data, isLoading } = useGetMySalesQuery(granularity);
  const { data: eventSales } = useGetEventSalesQuery();

  const eventRows = eventSales?.events ?? [];

  return (
    <>
      <div className={styles.header}>
        <div>
          <div className={styles.breadcrumb}>
            <span>STUDIO</span>
            <span className={styles.breadcrumbSep}>/</span>
            <span className={styles.breadcrumbCurrent}>VENDAS</span>
          </div>
          <h1 className={styles.title}>Vendas</h1>
          <div className={styles.subtitle}>
            Acompanhe faturamento, volume e desempenho por evento.
          </div>
        </div>

        <div className={styles.headerActions}>
          <span className={styles.updated}>
            <span className={styles.updatedDot} />
            ATUALIZADO AGORA
          </span>
          <button
            className={styles.exportBtn}
            onClick={() => downloadCsv(eventRows)}
            disabled={eventRows.length === 0}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 3v12M8 11l4 4 4-4M4 21h16" />
            </svg>
            Exportar
          </button>
        </div>
      </div>

      <SalesDashboard
        data={data}
        isLoading={isLoading}
        granularity={granularity}
        onGranularityChange={setGranularity}
      />
    </>
  );
}
