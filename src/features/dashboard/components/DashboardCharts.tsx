'use client';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import type { EventResponse } from '@/features/events';
import { useGetMySalesQuery } from '@/features/analytics/hooks/use-my-sales';
import styles from './DashboardCharts.module.scss';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend,
);

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
      grid: { color: 'rgba(255,255,255,0.06)' },
      ticks: { color: '#6f6f77', font: { size: 9, family: "'Space Mono', monospace" } },
      border: { display: false },
    },
    y: {
      grid: { color: 'rgba(255,255,255,0.06)' },
      ticks: { color: '#6f6f77', font: { size: 9, family: "'Space Mono', monospace" }, precision: 0 },
      border: { display: false },
      beginAtZero: true,
    },
  },
} as const;

function getLast6Months() {
  const now = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return {
      label: d.toLocaleDateString('pt-BR', { month: 'short' }),
      year: d.getFullYear(),
      month: d.getMonth(),
    };
  });
}

function buildEventsData(events: EventResponse[]) {
  const months = getLast6Months();
  return months.map(({ year, month }) =>
    events.filter((e) => {
      const d = new Date(e.endsAt);
      return e.status === 'FINISHED' && d.getFullYear() === year && d.getMonth() === month;
    }).length,
  );
}

interface Props {
  events: EventResponse[];
  eventsOnly?: boolean;
}

export function DashboardCharts({ events, eventsOnly = false }: Props) {
  const months = getLast6Months().map((m) => m.label);
  const eventsData = buildEventsData(events);
  const { data: salesByCurrency } = useGetMySalesQuery('month');

  // Overview mini-chart. Order COUNTS are currency-agnostic → summed across
  // currencies. Revenue can't be summed without FX, so the revenue line shows
  // the primary (largest) currency only; the per-currency breakdown lives on
  // the dedicated /dashboard/sales panel.
  const summaries = salesByCurrency ?? [];
  const slotCount = summaries[0]?.summary.data.length ?? 0;
  const orderTotals = Array.from({ length: slotCount }, (_, i) =>
    summaries.reduce((sum, c) => sum + (c.summary.data[i]?.orders ?? 0), 0),
  );
  const salesValues = orderTotals.slice(-6);
  const revenueValues = (summaries[0]?.summary.data ?? []).slice(-6).map((p) => p.revenue);

  const eventsChartData = {
    labels: months,
    datasets: [
      {
        label: 'Eventos',
        data: eventsData,
        borderColor: '#ff5a4d',
        backgroundColor: 'rgba(255,90,77,0.12)',
        fill: true,
        tension: 0.4,
        pointRadius: 3.4,
        pointBackgroundColor: '#ff5a4d',
        pointBorderColor: '#08080a',
        pointBorderWidth: 2,
      },
    ],
  };

  const salesChartData = {
    labels: months,
    datasets: [
      {
        label: 'Vendas',
        data: salesValues,
        borderColor: '#9b7bff',
        backgroundColor: 'rgba(155,123,255,0.12)',
        fill: true,
        tension: 0.4,
        pointRadius: 3.4,
        pointBackgroundColor: '#9b7bff',
        pointBorderColor: '#08080a',
        pointBorderWidth: 2,
      },
    ],
  };

  const revenueChartData = {
    labels: months,
    datasets: [
      {
        label: 'Receita (R$)',
        data: revenueValues,
        borderColor: '#ff2e9e',
        backgroundColor: 'rgba(255,46,158,0.12)',
        fill: true,
        tension: 0.4,
        pointRadius: 3.4,
        pointBackgroundColor: '#ff2e9e',
        pointBorderColor: '#08080a',
        pointBorderWidth: 2,
      },
    ],
  };

  return (
    <div className={styles.grid}>
      <div className={styles.chartCard}>
        <div className={styles.chartHeader}>
          <span className={`${styles.dot} ${styles.dotRed}`} />
          <h3 className={styles.chartTitle}>Eventos Realizados</h3>
        </div>
        <div className={styles.chartWrap}>
          <Line data={eventsChartData} options={CHART_OPTIONS} />
        </div>
      </div>

      {!eventsOnly && (
        <>
          <div className={styles.chartCard}>
            <div className={styles.chartHeader}>
              <span className={`${styles.dot} ${styles.dotViolet}`} />
              <h3 className={styles.chartTitle}>Vendas</h3>
            </div>
            <div className={styles.chartWrap}>
              <Line data={salesChartData} options={CHART_OPTIONS} />
            </div>
          </div>

          <div className={styles.chartCard}>
            <div className={styles.chartHeader}>
              <span className={`${styles.dot} ${styles.dotPink}`} />
              <h3 className={styles.chartTitle}>Receita</h3>
            </div>
            <div className={styles.chartWrap}>
              <Line data={revenueChartData} options={CHART_OPTIONS} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
