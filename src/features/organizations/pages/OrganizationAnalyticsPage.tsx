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
import { OrganizationHeader } from '../components/OrganizationHeader';
import { SectionHeader } from '../components/SectionHeader';
import { KpiCard } from '../components/KpiCard';
import { useOrganization } from '../hooks/use-organizations';
import { useOrganizationAnalytics } from '../hooks/use-organization-analytics';
import { SalesDashboard } from '@/features/analytics/components/SalesDashboard';
import type { SalesGranularity } from '@/features/analytics/types/sales.types';
import type { ChartPoint } from '@/features/analytics/types/analytics.types';
import styles from './OrganizationAnalyticsPage.module.scss';

// Registering the same Chart.js components a second time (SalesDashboard
// already does this) is a documented no-op — chart.js dedupes by name.
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

const VIEWERS_CHART_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#101013',
      borderColor: 'rgba(255,255,255,.08)',
      borderWidth: 1,
      titleColor: '#fff',
      bodyColor: '#9a9aa2',
      padding: 10,
    },
  },
  scales: {
    x: {
      grid: { color: 'rgba(255,255,255,.04)' },
      ticks: { color: '#6f6f77', font: { size: 10 } as const },
      border: { display: false },
    },
    y: {
      grid: { color: 'rgba(255,255,255,.04)' },
      ticks: { color: '#6f6f77', font: { size: 10 } as const, precision: 0 },
      border: { display: false },
      beginAtZero: true,
    },
  },
} as const;

function ViewersChart({ series, isLoading }: { series: ChartPoint[]; isLoading: boolean }) {
  const hasData = series.length > 0;
  const chartData = {
    labels: hasData ? series.map((p) => p.hour) : ['—'],
    datasets: [
      {
        label: 'Espectadores',
        data: hasData ? series.map((p) => p.viewers) : [0],
        borderColor: '#ff2e9e',
        backgroundColor: 'rgba(255,46,158,0.15)',
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointBackgroundColor: '#ff2e9e',
        borderWidth: 2.5,
      },
      {
        label: 'Novos acessos',
        data: hasData ? series.map((p) => p.newAccesses) : [0],
        borderColor: '#bba6ff',
        backgroundColor: 'transparent',
        fill: false,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointBackgroundColor: '#bba6ff',
        borderWidth: 2,
        borderDash: [6, 5],
      },
    ],
  };

  return (
    <div className={styles.chartWrap}>
      {isLoading ? (
        <div className={styles.loadingWrap}>
          <span className={styles.spinner} />
        </div>
      ) : (
        <Line data={chartData} options={VIEWERS_CHART_OPTIONS} />
      )}
    </div>
  );
}

function formatRate(rate: number | null): string {
  if (rate === null) return '—';
  return `${(rate * 100).toFixed(1).replace('.', ',')}%`;
}

function formatWatchTime(seconds: number | null): string {
  if (!seconds) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
}

interface Props {
  organizationId: string;
}

export function OrganizationAnalyticsPage({ organizationId }: Props) {
  const [granularity, setGranularity] = useState<SalesGranularity>('month');

  const { data: org, isLoading: orgLoading, isError: orgError } = useOrganization(organizationId);
  const { data: analytics, isLoading: analyticsLoading } = useOrganizationAnalytics(organizationId, granularity);

  if (orgLoading) return <p className={styles.state}>Carregando...</p>;
  if (orgError || !org) return <p className={`${styles.state} ${styles.stateError}`}>Organização não encontrada.</p>;

  const funnel = analytics?.funnel;
  const creatorScores = analytics?.creatorScores;

  return (
    <div className={styles.page}>
      <OrganizationHeader organization={org} />

      <div className={styles.card}>
        <SectionHeader label="VENDAS" icon="sales" />
        <SalesDashboard
          data={analytics?.sales}
          isLoading={analyticsLoading}
          granularity={granularity}
          onGranularityChange={setGranularity}
          showEventTable={false}
        />
      </div>

      <div className={styles.card}>
        <SectionHeader label="ESPECTADORES AO LONGO DO TEMPO" icon="info" />
        <ViewersChart series={analytics?.viewsSeries ?? []} isLoading={analyticsLoading} />
      </div>

      <div className={styles.card}>
        <SectionHeader label="FUNIL DE CONVERSÃO" icon="info" />
        <div className={styles.kpiStrip}>
          <KpiCard
            label="VISUALIZAÇÕES"
            value={analyticsLoading ? '—' : (funnel?.viewCount ?? 0).toLocaleString('pt-BR')}
            unit="total"
            kind="view"
          />
          <KpiCard
            label="ADD AO CARRINHO"
            value={analyticsLoading ? '—' : (funnel?.cartAddCount ?? 0).toLocaleString('pt-BR')}
            unit={formatRate(funnel?.viewToCartRate ?? null)}
            kind="ticket"
          />
          <KpiCard
            label="COMPRAS"
            value={analyticsLoading ? '—' : (funnel?.purchaseCount ?? 0).toLocaleString('pt-BR')}
            unit={formatRate(funnel?.cartToPurchaseRate ?? null)}
            kind="sales"
            accent
          />
          <KpiCard
            label="TEMPO MÉDIO ASSISTIDO"
            value={analyticsLoading ? '—' : formatWatchTime(funnel?.avgWatchSeconds ?? null)}
            unit={formatRate(funnel?.completionRate ?? null) === '—' ? '' : `${formatRate(funnel?.completionRate ?? null)} concl.`}
            kind="view"
          />
        </div>
      </div>

      <div className={styles.card}>
        <SectionHeader label="REPUTAÇÃO DA ORGANIZAÇÃO" icon="info" />
        <div className={styles.kpiStrip}>
          <KpiCard
            label="REPUTAÇÃO"
            value={analyticsLoading ? '—' : Math.round(creatorScores?.reputationScore ?? 0)}
            unit="/ 100"
            kind="reputation"
            accent
          />
          <KpiCard
            label="MOMENTUM"
            value={analyticsLoading ? '—' : Math.round(creatorScores?.momentumScore ?? 0)}
            unit="/ 100"
            kind="reputation"
          />
          <KpiCard
            label="NOVOS SEGUIDORES"
            value={analyticsLoading ? '—' : (creatorScores?.newFollowers ?? 0)}
            unit="recente"
            kind="team"
          />
          <KpiCard
            label="RETENÇÃO MÉDIA"
            value={analyticsLoading ? '—' : formatRate(creatorScores?.avgRetentionRate ?? null)}
            unit=""
            kind="view"
          />
        </div>
      </div>
    </div>
  );
}
