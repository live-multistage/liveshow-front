# Organization Analytics Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `dashboard/organizations/:id/analytics` screen — the "Análises" nav tab in `OrganizationHeader.tsx` already links here but the route 404s today.

**Architecture:** A new `OrganizationAnalyticsPage` component consumes a new org-scoped hook/service hitting the backend endpoint from the companion backend plan (`GET organizations/:orgId/analytics` — see `live-show-orchestrator`'s `docs/superpowers/plans/2026-07-12-organization-analytics-backend.md`, which must land first). Reuses `SalesDashboard`'s chart (refactored to accept data via props instead of fetching internally) and extracts `KpiCard`/`SectionHeader` out of `OrganizationDashboardPage.tsx` into shared files so both pages use the same building blocks.

**Tech Stack:** Next.js App Router, React Query, Chart.js (`react-chartjs-2`), SCSS modules.

## Global Constraints

- Backend endpoint contract (from the paired backend plan): `GET organizations/:orgId/analytics?granularity=day|month` returns `{ sales: SalesSummary, funnel: {...}, viewsSeries: ChartPoint[], creatorScores: {...} }` — field names and shapes below match that plan exactly.
- Do not reuse `EventSalesTable`/`useGetEventSalesQuery` on the org page — that hook calls `/sales/events`, which returns sales for *all* of a user's organizations, not just this one. Reusing it here would leak other orgs' sales data.
- `SalesDashboard`'s existing consumer (`src/app/dashboard/sales/page.tsx`) must keep working unchanged after its refactor in Task 1.

---

### Task 1: Make `SalesDashboard` accept data via props

**Context:** `SalesDashboard.tsx` currently calls `useGetMySalesQuery` internally and always renders `<EventSalesTable />`. The org analytics page needs the same chart UI fed by a different (org-scoped) query, and must not render `EventSalesTable` (cross-org data leak — see Global Constraints). Refactoring to accept props avoids duplicating ~100 lines of chart JSX.

**Files:**
- Modify: `src/features/analytics/components/SalesDashboard.tsx`
- Modify: `src/app/dashboard/sales/page.tsx`

**Interfaces:**
- Produces: `SalesDashboard(props: { data: SalesSummary | undefined; isLoading: boolean; granularity: SalesGranularity; onGranularityChange: (g: SalesGranularity) => void; showEventTable?: boolean })` — used by Task 4's `OrganizationAnalyticsPage`.

- [ ] **Step 1: Rewrite `SalesDashboard.tsx` to take props instead of calling the hook internally**

Replace the full contents of `src/features/analytics/components/SalesDashboard.tsx`:

```tsx
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
```

- [ ] **Step 2: Update the one existing consumer**

Replace the full contents of `src/app/dashboard/sales/page.tsx`:

```tsx
'use client';

import { useState } from 'react';
import type { Metadata } from 'next';
import { SalesDashboard } from '@/features/analytics/components/SalesDashboard';
import { useGetMySalesQuery } from '@/features/analytics/hooks/use-my-sales';
import type { SalesGranularity } from '@/features/analytics/types/sales.types';
import styles from '../layout.module.scss';

export default function DashboardSalesPage() {
  const [granularity, setGranularity] = useState<SalesGranularity>('month');
  const { data, isLoading } = useGetMySalesQuery(granularity);

  return (
    <>
      <h1 className={styles.pageTitle}>Vendas</h1>
      <SalesDashboard
        data={data}
        isLoading={isLoading}
        granularity={granularity}
        onGranularityChange={setGranularity}
      />
    </>
  );
}
```

Note: the `export const metadata` from the original file is removed because this page is now a client component (`'use client'` — required since granularity state now lives here instead of inside `SalesDashboard`), and Next.js doesn't allow `metadata` exports in client components. If page `<title>` was relied on, move it to the nearest server-rendered layout instead — check `src/app/dashboard/layout.tsx` for an existing per-route title mechanism before adding a workaround.

- [ ] **Step 3: Manually verify in the browser**

Start the dev server if not already running (check with the user first — do not start/restart it yourself), navigate to `/dashboard/sales`, and confirm: metrics cards populate, chart renders, day/month toggle works, orders/revenue toggle works, and the event sales table still appears below the chart exactly as before.

- [ ] **Step 4: Commit**

```bash
git add src/features/analytics/components/SalesDashboard.tsx src/app/dashboard/sales/page.tsx
git commit -m "refactor(analytics): SalesDashboard takes sales data via props

Lets the org analytics page reuse the same chart UI with a
differently-scoped query, without duplicating the chart JSX."
```

---

### Task 2: Extract `KpiCard` and `SectionHeader` from `OrganizationDashboardPage`

**Files:**
- Create: `src/features/organizations/components/KpiCard.tsx`
- Create: `src/features/organizations/components/SectionHeader.tsx`
- Modify: `src/features/organizations/pages/OrganizationDashboardPage.tsx`

**Interfaces:**
- Produces: `KpiCard(props: { label: string; value: string | number; unit: string; kind: string; accent?: boolean })`, `SectionHeader(props: { label: string; icon: string; action?: React.ReactNode })` — used by Task 4's `OrganizationAnalyticsPage`.

- [ ] **Step 1: Create `KpiCard.tsx`**

Create `src/features/organizations/components/KpiCard.tsx`:

```tsx
import styles from '../pages/OrganizationDashboardPage.module.scss';

function KpiIcon({ kind }: { kind: string }) {
  const p = { width: 12, height: 12, viewBox: '0 0 24 24', fill: 'none' as const, stroke: 'currentColor', strokeWidth: 2 };
  switch (kind) {
    case 'event':   return <svg {...p}><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 9h18M8 2v4M16 2v4" /></svg>;
    case 'team':    return <svg {...p}><circle cx="9" cy="8" r="3" /><path d="M3 21a6 6 0 0 1 12 0M16 11a3 3 0 1 0 0-6M21 21a5 5 0 0 0-4-4.9" /></svg>;
    case 'ticket':  return <svg {...p}><path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2 2 2 0 0 0 0 4 2 2 0 0 1-2 2H5a2 2 0 0 1-2-2 2 2 0 0 0 0-4Z" /></svg>;
    case 'sales':   return <svg {...p}><path d="M3 17l5-5 4 4 8-9" /><path d="M14 7h6v6" /></svg>;
    case 'view':    return <svg {...p}><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>;
    case 'reputation': return <svg {...p}><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z" /></svg>;
    default:        return null;
  }
}

interface KpiCardProps {
  label: string;
  value: string | number;
  unit: string;
  kind: string;
  accent?: boolean;
}

export function KpiCard({ label, value, unit, kind, accent }: KpiCardProps) {
  return (
    <div className={`${styles.kpiCard} ${accent ? styles.kpiCardAccent : ''}`}>
      {accent && <div className={styles.kpiGlow} />}
      <div className={styles.kpiLabel}><KpiIcon kind={kind} /> {label}</div>
      <div className={styles.kpiValue}>
        <span className={`${styles.kpiNum} ${accent ? styles.kpiNumPink : ''}`}>{value}</span>
        <span className={styles.kpiUnit}>{unit}</span>
      </div>
    </div>
  );
}
```

Note: two new `kind` values (`'view'`, `'reputation'`) are added to `KpiIcon` beyond the four `OrganizationDashboardPage` currently uses — Task 4 needs them for the funnel and CreatorScores cards. This is additive; existing `kind` values are untouched.

- [ ] **Step 2: Create `SectionHeader.tsx`**

Create `src/features/organizations/components/SectionHeader.tsx`:

```tsx
import styles from '../pages/OrganizationDashboardPage.module.scss';

interface SectionHeaderProps {
  label: string;
  icon: string;
  action?: React.ReactNode;
}

export function SectionHeader({ label, icon, action }: SectionHeaderProps) {
  const p = { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none' as const, stroke: '#ff5fb4', strokeWidth: 2 };
  const svg = icon === 'info'
    ? <svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 8v4l3 2" /></svg>
    : icon === 'calendar'
    ? <svg {...p}><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 9h18M8 2v4M16 2v4" /></svg>
    : icon === 'team'
    ? <svg {...p}><circle cx="9" cy="8" r="3" /><path d="M3 21a6 6 0 0 1 12 0M16 11a3 3 0 1 0 0-6M21 21a5 5 0 0 0-4-4.9" /></svg>
    : <svg {...p}><path d="M3 12h4l3-8 4 16 3-8h4" /></svg>;

  return (
    <div className={styles.sectionHeaderRow}>
      <div className={styles.sectionHeaderTitle}>{svg}{label}</div>
      {action}
    </div>
  );
}
```

- [ ] **Step 3: Update `OrganizationDashboardPage.tsx` to import instead of defining locally**

In `src/features/organizations/pages/OrganizationDashboardPage.tsx`:

1. Delete the `KpiIcon` function (lines 59-68), the `KpiCard` function (lines 72-87), and the `SectionHeader` function (lines 89-105) — all now live in the extracted files.
2. Add these two imports near the top of the file (after the existing `styles` import on line 11):

```tsx
import { KpiCard } from '../components/KpiCard';
import { SectionHeader } from '../components/SectionHeader';
```

- [ ] **Step 4: Manually verify no visual change**

Run `npx tsc --noEmit -p .` to confirm the file still compiles (the extraction must not change any prop names or usage sites). If a dev server is available, visually confirm `/dashboard/organizations/:id` renders identically to before (same KPI strip, same section headers) — do not start/restart the dev server yourself, ask the user to check if one isn't already running.

- [ ] **Step 5: Commit**

```bash
git add src/features/organizations/components/KpiCard.tsx src/features/organizations/components/SectionHeader.tsx src/features/organizations/pages/OrganizationDashboardPage.tsx
git commit -m "refactor(organizations): extract KpiCard/SectionHeader for reuse

Pure extraction, no visual change — OrganizationAnalyticsPage needs
these too."
```

---

### Task 3: Types, service, and hook for org analytics

**Files:**
- Create: `src/features/organizations/types/organization-analytics.types.ts`
- Modify: `src/features/organizations/services/organization.service.ts`
- Create: `src/features/organizations/hooks/use-organization-analytics.ts`
- Modify: `src/features/organizations/index.ts`

**Interfaces:**
- Consumes: `SalesSummary` (`@/features/analytics/types/sales.types`), `ChartPoint` (`@/features/analytics/types/analytics.types`), `SalesGranularity` (`@/features/analytics/types/sales.types`).
- Produces: `OrganizationAnalyticsResponse` type, `organizationService.getAnalytics(orgId, granularity)`, `useOrganizationAnalytics(orgId, granularity)` hook — used by Task 4.

- [ ] **Step 1: Create the response type**

Create `src/features/organizations/types/organization-analytics.types.ts`:

```ts
import type { SalesSummary } from '@/features/analytics/types/sales.types';
import type { ChartPoint } from '@/features/analytics/types/analytics.types';

export interface OrganizationAnalyticsFunnel {
  viewCount: number;
  uniqueViewCount: number;
  cartAddCount: number;
  purchaseCount: number;
  viewToCartRate: number | null;
  cartToPurchaseRate: number | null;
  avgWatchSeconds: number | null;
  completionRate: number | null;
}

export interface OrganizationAnalyticsCreatorScores {
  reputationScore: number;
  momentumScore: number;
  newFollowers: number;
  recentEventsCount: number;
  avgRetentionRate: number | null;
}

export interface OrganizationAnalyticsResponse {
  sales: SalesSummary;
  funnel: OrganizationAnalyticsFunnel;
  viewsSeries: ChartPoint[];
  creatorScores: OrganizationAnalyticsCreatorScores;
}
```

- [ ] **Step 2: Add the service method**

In `src/features/organizations/services/organization.service.ts`, add this import at the top:

```ts
import type { OrganizationAnalyticsResponse } from '../types/organization-analytics.types';
import type { SalesGranularity } from '@/features/analytics/types/sales.types';
```

Add this method inside the `organizationService` object (after `getStripeStatus`, before the closing `};` on line 85):

```ts
  getAnalytics: async (orgId: string, granularity: SalesGranularity): Promise<OrganizationAnalyticsResponse> => {
    const { data } = await httpClient.get<OrganizationAnalyticsResponse>(
      `/organizations/${orgId}/analytics`,
      { params: { granularity } },
    );
    return data;
  },
```

- [ ] **Step 3: Create the hook**

Create `src/features/organizations/hooks/use-organization-analytics.ts`:

```ts
'use client';

import { useQuery } from '@tanstack/react-query';
import { organizationService } from '../services/organization.service';
import type { SalesGranularity } from '@/features/analytics/types/sales.types';

export const organizationAnalyticsKey = (orgId: string, granularity: SalesGranularity) =>
  ['organizations', orgId, 'analytics', granularity] as const;

export function useOrganizationAnalytics(orgId: string, granularity: SalesGranularity) {
  return useQuery({
    queryKey: organizationAnalyticsKey(orgId, granularity),
    queryFn: () => organizationService.getAnalytics(orgId, granularity),
    enabled: !!orgId,
    staleTime: 60_000,
  });
}
```

- [ ] **Step 4: Export the new pieces from the feature's index**

In `src/features/organizations/index.ts`, add to the "Hooks" section (after the `useOrganizationSettings` export on line 39):

```ts
export { useOrganizationAnalytics, organizationAnalyticsKey } from './hooks/use-organization-analytics';
```

Add to the "Types" section (after the closing `} from './types/organization.types';` block on line 63):

```ts
export type {
  OrganizationAnalyticsResponse,
  OrganizationAnalyticsFunnel,
  OrganizationAnalyticsCreatorScores,
} from './types/organization-analytics.types';
```

- [ ] **Step 5: Verify it compiles**

Run: `npx tsc --noEmit -p .`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/features/organizations/types/organization-analytics.types.ts src/features/organizations/services/organization.service.ts src/features/organizations/hooks/use-organization-analytics.ts src/features/organizations/index.ts
git commit -m "feat(organizations): add org-scoped analytics service/hook/types"
```

---

### Task 4: `OrganizationAnalyticsPage` component

**Files:**
- Create: `src/features/organizations/pages/OrganizationAnalyticsPage.tsx`
- Create: `src/features/organizations/pages/OrganizationAnalyticsPage.module.scss`

**Interfaces:**
- Consumes: `useOrganizationAnalytics` (Task 3), `SalesDashboard` (Task 1, props form), `KpiCard`/`SectionHeader` (Task 2), `OrganizationHeader` (existing, `src/features/organizations/components/OrganizationHeader.tsx`), `useOrganization` (existing, `src/features/organizations/hooks/use-organizations.ts`).

- [ ] **Step 1: Create the page component**

Create `src/features/organizations/pages/OrganizationAnalyticsPage.tsx`:

```tsx
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
```

- [ ] **Step 2: Create the page's SCSS module**

Create `src/features/organizations/pages/OrganizationAnalyticsPage.module.scss`:

```scss
.page {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.state { font-size: 14px; color: #7d7d85; padding: 24px 0; }
.stateError { color: #ef6b6b; }

.card {
  background: #101013;
  border: 1px solid rgba(255, 255, 255, .08);
  border-radius: 18px;
  padding: 22px;
}

.kpiStrip {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.chartWrap {
  position: relative;
  height: 260px;
}

.loadingWrap {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.spinner {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 3px solid rgba(255, 255, 255, .1);
  border-top-color: #ff2e9e;
  animation: spin .8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
```

Note: `.kpiCard`/`.kpiLabel`/`.kpiValue`/etc. used by the imported `KpiCard` component resolve from `OrganizationDashboardPage.module.scss` (see Task 2's `KpiCard.tsx` — it imports that module directly), not from this file. This file only styles this page's own layout (`.page`, `.card`, `.kpiStrip`, `.chartWrap`, loading/error states).

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit -p .`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/features/organizations/pages/OrganizationAnalyticsPage.tsx src/features/organizations/pages/OrganizationAnalyticsPage.module.scss
git commit -m "feat(organizations): add OrganizationAnalyticsPage component"
```

---

### Task 5: Wire the route

**Files:**
- Create: `src/app/dashboard/organizations/[id]/analytics/page.tsx`
- Modify: `src/features/organizations/index.ts`

**Interfaces:**
- Consumes: `OrganizationAnalyticsPage` (Task 4).

- [ ] **Step 1: Export the page from the feature index**

In `src/features/organizations/index.ts`, add to the "Pages" section (after the `OrganizationDashboardPage` export on line 4):

```ts
export { OrganizationAnalyticsPage } from './pages/OrganizationAnalyticsPage';
```

- [ ] **Step 2: Create the route file**

Create `src/app/dashboard/organizations/[id]/analytics/page.tsx`:

```tsx
import type { Metadata } from 'next';
import { OrganizationAnalyticsPage } from '@/features/organizations';

interface Props {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = { title: 'Análises da Organização' };

export default async function OrganizationAnalyticsRoute({ params }: Props) {
  const { id } = await params;
  return <OrganizationAnalyticsPage organizationId={id} />;
}
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit -p .`
Expected: no errors.

- [ ] **Step 4: Manually verify in the browser**

With the backend plan's endpoint deployed (or a local backend running it), and a dev server available (ask the user first — do not start/restart it yourself): navigate to an organization's dashboard, click the "Análises" tab, confirm the page loads (no 404), the sales chart/KPIs/funnel/creator-scores cards render, and switching day/month granularity refetches correctly.

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/organizations/[id]/analytics/page.tsx src/features/organizations/index.ts
git commit -m "feat(organizations): wire dashboard/organizations/:id/analytics route"
```

---

## Final verification

- [ ] Run the typecheck: `npx tsc --noEmit -p .`
- [ ] Confirm `git log --oneline -5` shows all 5 task commits in order.
- [ ] Confirm the backend plan (`live-show-orchestrator`) has landed and is deployed before doing the manual browser verification in Task 5 — otherwise the page will show a loading/error state indefinitely.
