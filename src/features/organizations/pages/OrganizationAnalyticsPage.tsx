'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { OrganizationHeader } from '../components/OrganizationHeader';
import { SectionHeader } from '../components/SectionHeader';
import { KpiCard } from '../components/KpiCard';
import { useOrganization } from '../hooks/use-organizations';
import { useOrganizationAnalytics } from '../hooks/use-organization-analytics';
import { SalesDashboard } from '@/features/analytics/components/SalesDashboard';
import type { SalesGranularity } from '@/features/analytics/types/sales.types';
import type { ChartPoint } from '@/features/analytics/types/analytics.types';
import { chartLabels } from '@/features/analytics/utils/chart-labels';
import { LineChart } from '@/shared/charts/LineChart';
import styles from './OrganizationAnalyticsPage.module.scss';

function ViewersChart({ series, isLoading }: { series: ChartPoint[]; isLoading: boolean }) {
  const t = useTranslations('organizations');
  return (
    <div className={styles.chartWrap}>
      {isLoading ? (
        <div className={styles.loadingWrap}>
          <span className={styles.spinner} />
        </div>
      ) : (
        <LineChart
          labels={chartLabels(series)}
          series={[
            { label: t('anViewers'), data: series.map((p) => p.viewers), color: 'magenta', fill: true },
            { label: t('anNewAccesses'), data: series.map((p) => p.newAccesses), color: 'violet', dashed: true },
          ]}
        />
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
  const t = useTranslations('organizations');
  const [granularity, setGranularity] = useState<SalesGranularity>('month');
  const [selectedCurrency, setSelectedCurrency] = useState<string | null>(null);

  const { data: org, isLoading: orgLoading, isError: orgError } = useOrganization(organizationId);
  const { data: analytics, isLoading: analyticsLoading, isError: analyticsError } = useOrganizationAnalytics(organizationId, granularity);

  if (orgLoading) return <p className={styles.state}>Carregando...</p>;
  if (orgError || !org) return <p className={`${styles.state} ${styles.stateError}`}>Organização não encontrada.</p>;

  const funnel = analytics?.funnel;
  const creatorScores = analytics?.creatorScores;
  const currencies = analytics?.salesByCurrency ?? [];
  // No FX conversion — a currency picker swaps the summary shown.
  const activeSales = currencies.find((c) => c.currency === selectedCurrency) ?? currencies[0];

  return (
    <div className={styles.page}>
      <OrganizationHeader organization={org} />

      {analyticsError && (
        <p className={styles.errorNotice}>
          Não foi possível carregar os dados de análise agora. Os números abaixo podem estar incompletos.
        </p>
      )}

      <div className={styles.card}>
        <SectionHeader label={t('anSales')} icon="sales" />
        {/* No FX conversion — a currency picker swaps the summary shown. */}
        {!analyticsLoading && currencies.length === 0 && (
          <SalesDashboard data={undefined} isLoading={analyticsLoading} granularity={granularity} onGranularityChange={setGranularity} showEventTable={false} />
        )}
        {activeSales && (
          <>
            {currencies.length > 1 && (
              <label className={styles.currencyPicker}>
                <span className={styles.currencyPickerLabel}>Moeda</span>
                <select
                  className={styles.currencySelect}
                  value={activeSales.currency}
                  onChange={(e) => setSelectedCurrency(e.target.value)}
                >
                  {currencies.map((c) => (
                    <option key={c.currency} value={c.currency}>{c.currency}</option>
                  ))}
                </select>
              </label>
            )}
            <SalesDashboard
              data={activeSales.summary}
              byEvent={activeSales.byEvent}
              isLoading={analyticsLoading}
              granularity={granularity}
              onGranularityChange={setGranularity}
              showEventTable={false}
              currency={activeSales.currency}
            />
          </>
        )}
      </div>

      <div className={styles.card}>
        <SectionHeader label={t('anViewersOverTime')} icon="info" />
        <ViewersChart series={analytics?.viewsSeries ?? []} isLoading={analyticsLoading} />
      </div>

      <div className={styles.card}>
        <SectionHeader label={t('anFunnel')} icon="info" />
        <div className={styles.kpiStrip}>
          <KpiCard
            label={t('anViews')}
            value={analyticsLoading ? '—' : (funnel?.viewCount ?? 0).toLocaleString('pt-BR')}
            unit="total"
            kind="view"
          />
          <KpiCard
            label={t('anCartAdds')}
            value={analyticsLoading ? '—' : (funnel?.cartAddCount ?? 0).toLocaleString('pt-BR')}
            unit={formatRate(funnel?.viewToCartRate ?? null)}
            kind="ticket"
          />
          <KpiCard
            label={t('anPurchases')}
            value={analyticsLoading ? '—' : (funnel?.purchaseCount ?? 0).toLocaleString('pt-BR')}
            unit={formatRate(funnel?.cartToPurchaseRate ?? null)}
            kind="sales"
            accent
          />
          <KpiCard
            label={t('anAvgWatch')}
            value={analyticsLoading ? '—' : formatWatchTime(funnel?.avgWatchSeconds ?? null)}
            unit={formatRate(funnel?.completionRate ?? null) === '—' ? '' : `${formatRate(funnel?.completionRate ?? null)} concl.`}
            kind="view"
          />
        </div>
      </div>

      <div className={styles.card}>
        <SectionHeader label={t('anReputation')} icon="info" />
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
