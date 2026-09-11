'use client';

import { useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
  type ScriptableContext,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import type { EventSalesSeries, SalesGranularity, SalesSummary } from '../types/sales.types';
import { EventSalesTable } from './EventSalesTable';
import styles from './SalesDashboard.module.scss';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

const ORDERS_COLOR = '#9b7bff';
const REVENUE_COLOR = '#ff2e9e';
// Per-event lines cycle through these; beyond the palette, hues repeat.
const EVENT_COLORS = ['#ff2e9e', '#9b7bff', '#46d6d8', '#7fe0a0', '#ff7a4d', '#ffd166', '#5aa9ff', '#f28cff'];

const CHART_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#101013',
      borderColor: '#27272A',
      borderWidth: 1,
      titleColor: '#FFFFFF',
      bodyColor: '#A1A1AA',
      titleFont: { family: 'Space Mono, monospace', size: 11 },
      bodyFont: { family: 'Space Mono, monospace', size: 12 },
      padding: 10,
    },
  },
  scales: {
    x: {
      grid: { color: 'rgba(255,255,255,0.06)' },
      ticks: { color: '#6f6f77', font: { family: 'Space Mono, monospace', size: 11 } },
      border: { display: false },
    },
    y: {
      grid: { color: 'rgba(255,255,255,0.06)' },
      ticks: { color: '#6f6f77', font: { family: 'Space Mono, monospace', size: 11 }, precision: 0 },
      border: { display: false },
      beginAtZero: true,
    },
  },
} as const;

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

// Vertical area gradient (0.32 → 0) matching the design's linearGradient.
function areaGradient(color: string) {
  return (ctx: ScriptableContext<'line'>) => {
    const { chart } = ctx;
    const { ctx: c, chartArea } = chart;
    if (!chartArea) return 'transparent';
    const g = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
    g.addColorStop(0, `${color}52`); // ~0.32 alpha
    g.addColorStop(1, `${color}00`);
    return g;
  };
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
  const series = isOrders ? ORDERS_COLOR : REVENUE_COLOR;
  const canSplit = byEvent.length > 1;
  const splitByEvent = canSplit && chartSplit === 'event';

  const avgTicket = data && data.totalOrders > 0 ? data.totalRevenue / data.totalOrders : 0;

  const labels = data?.data.map((p) => formatLabel(p.date, granularity)) ?? [];
  const chartDataValues = data?.data.map((p) => (isOrders ? p.orders : p.revenue)) ?? [];

  const eventDatasets = byEvent.map((ev, i) => {
    const color = EVENT_COLORS[i % EVENT_COLORS.length];
    return {
      label: ev.eventTitle,
      data: ev.data.map((p) => (isOrders ? p.orders : p.revenue)),
      borderColor: color,
      backgroundColor: color,
      fill: false,
      tension: 0.4,
      pointRadius: 3,
      pointBackgroundColor: color,
      pointBorderColor: '#08080a',
      pointBorderWidth: 2,
      borderWidth: 2,
    };
  });

  const chartDataset = {
    labels,
    datasets: splitByEvent ? eventDatasets : [
      {
        label: isOrders ? 'Vendas' : `Receita (${currency})`,
        data: chartDataValues,
        borderColor: series,
        backgroundColor: areaGradient(series),
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: series,
        pointBorderColor: '#08080a',
        pointBorderWidth: 2,
      },
    ],
  };

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
            <Line data={chartDataset} options={CHART_OPTIONS} />
          )}
        </div>
        {splitByEvent && (
          <ul className={styles.legend}>
            {eventDatasets.map((d) => (
              <li key={d.label} className={styles.legendItem}>
                <span className={styles.legendSwatch} style={{ background: d.borderColor }} />
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
