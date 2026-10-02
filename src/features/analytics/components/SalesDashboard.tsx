'use client';

import { useState } from 'react';
import type { EventSalesSeries, SalesGranularity, SalesSummary } from '../types/sales.types';
import { EventSalesTable } from './EventSalesTable';
import { LineChart, type LineSeries } from '@/shared/charts/LineChart';
import { seriesClass, type SeriesColor } from '@/shared/charts/chart-series';
import styles from './SalesDashboard.module.scss';

// Per-event lines cycle through the palette; past its end the hues repeat
// dashed, so two events never draw an identical line.
const EVENT_COLORS: SeriesColor[] = ['magenta', 'violet', 'amber', 'green', 'pink'];

// No FX conversion — always formatted in the row's own currency.
function formatCurrency(value: number, currency = 'BRL'): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency });
}

function formatLabel(date: string, granularity: SalesGranularity): string {
  if (granularity === 'day') {
    const [, month, day] = date.split('-');
    return `${day}/${month}`;
  }
  const [year, month] = date.split('-');
  const d = new Date(Number(year), Number(month) - 1, 1);
  return d.toLocaleDateString('pt-BR', { month: 'short' });
}

const ICONS = {
  cart: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 4h2l2.5 12h11l2-8H6.5" />
      <circle cx="9" cy="20" r="1.4" />
      <circle cx="18" cy="20" r="1.4" />
    </svg>
  ),
  money: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v10M9.5 9.2a2.5 2 0 0 1 2.5-1.2c1.4 0 2.5.8 2.5 1.8s-1.1 1.6-2.5 1.6-2.5.7-2.5 1.7 1.1 1.9 2.5 1.9a2.5 2 0 0 0 2.5-1.2" />
    </svg>
  ),
  ticket: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2 2 2 0 0 0 0 4 2 2 0 0 1-2 2v-2H5v2a2 2 0 0 1-2-2 2 2 0 0 0 0-4Z" />
    </svg>
  ),
} as const;

type ChartView = 'orders' | 'revenue';
type ChartSplit = 'total' | 'event';

interface SalesDashboardProps {
  data: SalesSummary | undefined;
  // Same slots as data.data; when present with 2+ events the chart can be
  // split into one line per event.
  byEvent?: EventSalesSeries[];
  isLoading: boolean;
  granularity: SalesGranularity;
  onGranularityChange: (g: SalesGranularity) => void;
  showEventTable?: boolean;
  // No FX conversion — figures render in this currency.
  currency?: string;
}

export function SalesDashboard({ data, byEvent = [], isLoading, granularity, onGranularityChange, showEventTable = true, currency = 'BRL' }: SalesDashboardProps) {
  const [chartView, setChartView] = useState<ChartView>('orders');
  const [chartSplit, setChartSplit] = useState<ChartSplit>('total');

  const isOrders = chartView === 'orders';
  // The same chart plots counts or money depending on the toggle, so the
  // value formatter follows the view instead of always claiming reais.
  const formatValue = isOrders
    ? (v: number) => v.toLocaleString('pt-BR')
    : (v: number) => formatCurrency(v, currency);
  const canSplit = byEvent.length > 1;
  const splitByEvent = canSplit && chartSplit === 'event';

  const avgTicket = data && data.totalOrders > 0 ? data.totalRevenue / data.totalOrders : 0;

  const labels = data?.data.map((p) => formatLabel(p.date, granularity)) ?? [];
  const chartDataValues = data?.data.map((p) => (isOrders ? p.orders : p.revenue)) ?? [];

  const eventSeries: LineSeries[] = byEvent.map((ev, i) => ({
    label: ev.eventTitle,
    data: ev.data.map((p) => (isOrders ? p.orders : p.revenue)),
    color: EVENT_COLORS[i % EVENT_COLORS.length],
    dashed: i >= EVENT_COLORS.length,
  }));

  const chartSeries: LineSeries[] = splitByEvent ? eventSeries : [
    {
      label: isOrders ? 'Vendas' : `Receita (${currency})`,
      data: chartDataValues,
      color: isOrders ? 'violet' : 'magenta',
      fill: true,
    },
  ];

  const chartSub = `${isOrders ? 'Ingressos vendidos' : `Faturamento em ${currency}`} · ${granularity === 'day' ? 'por dia' : 'por mês'}${splitByEvent ? ' · por evento' : ''}`;

  return (
    <div className={styles.page}>
      <div className={styles.metrics}>
        <div className={styles.metricCard}>
          <div className={styles.metricInner}>
            <div className={styles.metricTop}>
              <span className={styles.metricLabel}>TOTAL DE VENDAS</span>
              <span className={styles.metricIcon}>{ICONS.cart}</span>
            </div>
            <div className={styles.metricValue}>
              {isLoading ? '—' : (data?.totalOrders ?? 0).toLocaleString('pt-BR')}
            </div>
            <div className={styles.metricHint}>ingressos vendidos no período</div>
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricGlow} />
          <div className={styles.metricInner}>
            <div className={styles.metricTop}>
              <span className={styles.metricLabel}>RECEITA TOTAL</span>
              <span className={`${styles.metricIcon} ${styles.metricIconAccent}`}>{ICONS.money}</span>
            </div>
            <div className={`${styles.metricValue} ${styles.metricValueAccent}`}>
              {isLoading ? '—' : formatCurrency(data?.totalRevenue ?? 0, currency)}
            </div>
            <div className={styles.metricHint}>faturamento no período</div>
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricInner}>
            <div className={styles.metricTop}>
              <span className={styles.metricLabel}>TICKET MÉDIO</span>
              <span className={styles.metricIcon}>{ICONS.ticket}</span>
            </div>
            <div className={styles.metricValue}>
              {isLoading ? '—' : formatCurrency(avgTicket, currency)}
            </div>
            <div className={styles.metricHint}>valor médio por venda</div>
          </div>
        </div>
      </div>

      <div className={styles.chartCard}>
        <div className={styles.chartControls}>
          <div className={styles.chartHeading}>
            <span className={styles.chartTitle}>{isOrders ? 'VOLUME DE VENDAS' : 'RECEITA'}</span>
            <span className={styles.chartSub}>{chartSub}</span>
          </div>

          <div className={styles.toggles}>
            <div className={styles.segment}>
              <button
                className={`${styles.segBtn} ${isOrders ? styles.segBtnActive : ''}`}
                onClick={() => setChartView('orders')}
              >
                Quantidade
              </button>
              <button
                className={`${styles.segBtn} ${!isOrders ? styles.segBtnActive : ''}`}
                onClick={() => setChartView('revenue')}
              >
                Receita
              </button>
            </div>

            {canSplit && (
              <div className={`${styles.segment} ${styles.segMono}`}>
                <button
                  className={`${styles.segBtn} ${!splitByEvent ? styles.segBtnActive : ''}`}
                  onClick={() => setChartSplit('total')}
                >
                  Total
                </button>
                <button
                  className={`${styles.segBtn} ${splitByEvent ? styles.segBtnActive : ''}`}
                  onClick={() => setChartSplit('event')}
                >
                  Por evento
                </button>
              </div>
            )}

            <div className={`${styles.segment} ${styles.segMono}`}>
              <button
                className={`${styles.segBtn} ${granularity === 'day' ? styles.segBtnActive : ''}`}
                onClick={() => onGranularityChange('day')}
              >
                Dia
              </button>
              <button
                className={`${styles.segBtn} ${granularity === 'month' ? styles.segBtnActive : ''}`}
                onClick={() => onGranularityChange('month')}
              >
                Mês
              </button>
            </div>
          </div>
        </div>

        <div className={styles.chartWrap}>
          {isLoading ? (
            <div className={styles.loadingWrap}>
              <span className={styles.spinner} />
            </div>
          ) : (
            <LineChart series={chartSeries} labels={labels} formatValue={formatValue} tooltip />
          )}
        </div>
        {splitByEvent && (
          <ul className={styles.legend}>
            {eventSeries.map((d) => (
              <li key={d.label} className={styles.legendItem}>
                <span className={`${styles.legendSwatch} ${seriesClass(d.color)}`} />
                {d.label}
              </li>
            ))}
          </ul>
        )}
      </div>

      {showEventTable && <EventSalesTable />}
    </div>
  );
}
