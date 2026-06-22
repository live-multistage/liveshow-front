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

// Mock: replace with real API data when endpoint is available
const MOCK_SALES = [12, 19, 8, 24, 17, 31];
const MOCK_REVENUE = [1200, 1900, 800, 2400, 1700, 3100];

interface Props {
  events: EventResponse[];
  eventsOnly?: boolean;
}

export function DashboardCharts({ events, eventsOnly = false }: Props) {
  const months = getLast6Months().map((m) => m.label);
  const eventsData = buildEventsData(events);

  const eventsChartData = {
    labels: months,
    datasets: [
      {
        label: 'Eventos',
        data: eventsData,
        borderColor: '#ff2e9e',
        backgroundColor: 'rgba(255,46,158,0.08)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: '#ff2e9e',
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
        data: MOCK_SALES,
        borderColor: '#9810fa',
        backgroundColor: 'rgba(152,16,250,0.08)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: '#9810fa',
        pointBorderColor: '#08080a',
        pointBorderWidth: 2,
      },
    ],
  };

  const revenueChartData = {
    labels: months,
    datasets: [
      {
        label: 'Revenue (R$)',
        data: MOCK_REVENUE,
        borderColor: '#FB64B6',
        backgroundColor: 'rgba(251,100,182,0.08)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: '#FB64B6',
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
              <span className={styles.mock}>dados de exemplo</span>
            </div>
            <div className={styles.chartWrap}>
              <Line data={salesChartData} options={CHART_OPTIONS} />
            </div>
          </div>

          <div className={styles.chartCard}>
            <div className={styles.chartHeader}>
              <span className={`${styles.dot} ${styles.dotPink}`} />
              <h3 className={styles.chartTitle}>Revenue</h3>
              <span className={styles.mock}>dados de exemplo</span>
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
