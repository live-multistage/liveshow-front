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
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import type { SalesGranularity, SalesSummary } from '../types/sales.types';
import { EventSalesTable } from './EventSalesTable';
import styles from './SalesDashboard.module.scss';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

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
      padding: 10,
    },
  },
  scales: {
    x: {
      grid: { color: 'rgba(39,39,42,0.6)' },
      ticks: { color: '#71717A', font: { size: 11 } },
      border: { display: false },
    },
    y: {
      grid: { color: 'rgba(39,39,42,0.6)' },
      ticks: { color: '#71717A', font: { size: 11 }, precision: 0 },
      border: { display: false },
      beginAtZero: true,
    },
  },
} as const;

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
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

type ChartView = 'orders' | 'revenue';

interface SalesDashboardProps {
  data: SalesSummary | undefined;
  isLoading: boolean;
  granularity: SalesGranularity;
  onGranularityChange: (g: SalesGranularity) => void;
  showEventTable?: boolean;
}

export function SalesDashboard({ data, isLoading, granularity, onGranularityChange, showEventTable = true }: SalesDashboardProps) {
  const [chartView, setChartView] = useState<ChartView>('orders');

  const avgTicket =
    data && data.totalOrders > 0 ? data.totalRevenue / data.totalOrders : 0;

  const labels = data?.data.map((p) => formatLabel(p.date, granularity)) ?? [];
  const chartDataValues = data?.data.map((p) => chartView === 'orders' ? p.orders : p.revenue) ?? [];

  const chartDataset = {
    labels,
    datasets: [
      {
        label: chartView === 'orders' ? 'Vendas' : 'Receita (R$)',
        data: chartDataValues,
        borderColor: chartView === 'orders' ? '#9810fa' : '#ff2e9e',
        backgroundColor: chartView === 'orders'
          ? 'rgba(152,16,250,0.08)'
          : 'rgba(255,46,158,0.08)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: chartView === 'orders' ? '#9810fa' : '#ff2e9e',
        pointBorderColor: '#08080a',
        pointBorderWidth: 2,
      },
    ],
  };

  return (
    <div className={styles.page}>
      <div className={styles.metrics}>
        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Total de Vendas</span>
          <span className={styles.metricValue}>
            {isLoading ? '—' : (data?.totalOrders ?? 0).toLocaleString('pt-BR')}
          </span>
        </div>
        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Receita Total</span>
          <span className={`${styles.metricValue} ${styles.metricRevenue}`}>
            {isLoading ? '—' : formatCurrency(data?.totalRevenue ?? 0)}
          </span>
        </div>
        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Ticket Médio</span>
          <span className={`${styles.metricValue} ${styles.metricPrice}`}>
            {isLoading ? '—' : formatCurrency(avgTicket)}
          </span>
        </div>
      </div>

      <div className={styles.chartCard}>
        <div className={styles.chartControls}>
          <div className={styles.chartViewToggle}>
            <button
              className={`${styles.toggleBtn} ${chartView === 'orders' ? styles.toggleActive : ''}`}
              onClick={() => setChartView('orders')}
            >
              Quantidade
            </button>
            <button
              className={`${styles.toggleBtn} ${chartView === 'revenue' ? styles.toggleActive : ''}`}
              onClick={() => setChartView('revenue')}
            >
              Receita
            </button>
          </div>

          <div className={styles.granularityToggle}>
            <button
              className={`${styles.toggleBtn} ${granularity === 'day' ? styles.toggleActive : ''}`}
              onClick={() => onGranularityChange('day')}
            >
              Dia
            </button>
            <button
              className={`${styles.toggleBtn} ${granularity === 'month' ? styles.toggleActive : ''}`}
              onClick={() => onGranularityChange('month')}
            >
              Mês
            </button>
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
      </div>

      {showEventTable && <EventSalesTable />}
    </div>
  );
}
