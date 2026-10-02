'use client';

import type { EventResponse } from '@/features/events';
import { useGetMySalesQuery } from '@/features/analytics/hooks/use-my-sales';
import { SparklineCard } from '@/shared/charts/SparklineCard';
import styles from './DashboardCharts.module.scss';

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

// "2026-08" -> "ago.". Built from the very key the backend bucketed the sale
// into, so the axis cannot drift from the data. Recomputing the month list
// locally meant the labels came from the browser's timezone while the buckets
// came from the server's — they agree most days and disagree at a month
// boundary, which is the worst kind of bug to notice.
function monthLabelFromKey(key: string): string {
  const [year, month] = key.split('-').map(Number);
  if (!year || !month) return key;
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('pt-BR', {
    month: 'short',
    timeZone: 'UTC',
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
  const salesSlots = (summaries[0]?.summary.data ?? []).slice(-6);
  const revenueValues = salesSlots.map((p) => p.revenue);
  // Labels from the same slots as the values. `months` stays for the Eventos
  // chart, which is computed client-side from event dates and so legitimately
  // uses the viewer's own calendar.
  const salesLabels = salesSlots.length > 0 ? salesSlots.map((p) => monthLabelFromKey(p.date)) : months;
  // The revenue line is the primary currency only (see above), so the axis says
  // which one instead of always claiming reais.
  const primaryCurrency = summaries[0]?.currency ?? 'BRL';
  const formatRevenue = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: primaryCurrency });

  return (
    <div className={styles.grid}>
      <SparklineCard
        title="Eventos Realizados"
        color="magenta"
        data={eventsData}
        labels={months}
      />

      {!eventsOnly && (
        <>
          <SparklineCard title="Vendas" color="violet" data={salesValues} labels={salesLabels} />

          <SparklineCard
            title="Receita"
            color="amber"
            data={revenueValues}
            labels={salesLabels}
            formatValue={formatRevenue}
          />
        </>
      )}
    </div>
  );
}
