'use client';

import { useEffect, useRef } from 'react';
import { usePlatformRevenueQuery } from '@/features/platform-admin/queries/get-finance';
import type { OverviewRange } from '@/features/platform-admin/queries/get-platform-overview';
import type { CurrencyRevenue } from '@/features/platform-admin/types/platform-admin.types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@live-show/design-system';
import { moneyCompact, moneyExact, ratePct } from '@/features/platform-admin/utils/format';
import styles from './SuperAdminDashboard.module.scss';

// Platform revenue card (design: "Receita da plataforma") — commission over
// GMV. One block per currency (no FX conversion; figures are never summed
// across currencies), each with its own headline, delta, series and KPIs.
export function RevenueCard({ range }: { range: OverviewRange }) {
  const { data, isLoading } = usePlatformRevenueQuery(range);
  const currencies = data?.byCurrency ?? [];
  // With one currency the headline belongs on the title line. With several it
  // cannot: a single number next to a title that covers them all would read as
  // the total, and these are never summed across currencies.
  const single = currencies.length === 1 ? currencies[0] : null;

  return (
    <div className={styles.finCard}>
      <div className={styles.finHeader}>
        <div>
          <div className={styles.finEyebrow}>FINANCEIRO · LEDGER</div>
          <div className={styles.finTitle}>Receita da plataforma</div>
          <div className={styles.finSub}>Comissões (SALE) sobre o GMV · {data?.rangeDays ?? '—'} dias</div>
        </div>
        {single && <RevenueHeadline c={single} />}
      </div>

      {isLoading && <div className={styles.barEmpty}>—</div>}
      {!isLoading && currencies.length === 0 && (
        <div className={styles.barEmpty}>Sem vendas no período.</div>
      )}

      {currencies.map((c) => (
        <CurrencyBlock key={c.currency} c={c} showHeadline={!single} />
      ))}
    </div>
  );
}

// "2026-09-26" → "26/09". Sliced, not `new Date`: the series carries calendar
// days, and parsing them into a Date shifts the label a day in negative UTC
// offsets — which is every Brazilian timezone.
function dayLabel(date: string): string {
  return `${date.slice(8, 10)}/${date.slice(5, 7)}`;
}

// A 90-day range drawn to fit is 90 hairlines — a shape, not a chart. Bars keep
// a readable width and the series scrolls instead.
const MAX_VISIBLE_BARS = 7;

function RevenueHeadline({ c }: { c: CurrencyRevenue }) {
  const up = c.revenueDeltaPct >= 0;

  return (
    <div className={styles.finHeadRight}>
      <span className={styles.finCurrencyTag}>{c.currency}</span>
      <span className={styles.finBig}>{moneyCompact(c.revenue, c.currency)}</span>
      <span className={up ? styles.finDeltaUp : styles.finDeltaDown}>
        {up ? '+' : ''}{c.revenueDeltaPct}% vs. período anterior
      </span>
    </div>
  );
}

function CurrencyBlock({ c, showHeadline }: { c: CurrencyRevenue; showHeadline: boolean }) {
  const max = Math.max(1, ...c.series.map((s) => s.revenue));
  const cols = Math.min(c.series.length, MAX_VISIBLE_BARS);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Open on the newest days: a 90-day chart that starts three months back hides
  // the part anyone opened it for.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [c.series.length, c.currency]);

  return (
    <div className={styles.finCurrencyBlock}>
      <div className={styles.finHeadRow}>
        <div className={styles.chartLegend}>
          <span className={styles.chartSwatch} aria-hidden="true" />
          <span className={styles.chartLegendText}>Comissão por dia ({c.currency})</span>
        </div>

        {/* Only when the title line could not take it (several currencies). */}
        {showHeadline && <RevenueHeadline c={c} />}

        {/* Was a footer block under the chart; inline here the card matches the
            height of its row neighbour instead of towering over it. */}
        <dl className={styles.finStatStrip}>
          <div className={styles.finStat}>
            <dt className={styles.finStatLabel}>GMV</dt>
            <dd className={styles.finStatValue}>{moneyCompact(c.gmv, c.currency)}</dd>
          </div>
          <div className={styles.finStat}>
            <dt className={styles.finStatLabel}>TAXA</dt>
            <dd className={`${styles.finStatValue} ${styles.finStatAccent}`}>{ratePct(c.avgRate)}</dd>
          </div>
          <div className={styles.finStat}>
            <dt className={styles.finStatLabel}>TICKET</dt>
            <dd className={styles.finStatValue}>{moneyCompact(c.avgTicket, c.currency)}</dd>
          </div>
        </dl>
      </div>

      <div className={styles.chartArea}>
        <div className={styles.yAxis} aria-hidden="true">
          <span>{moneyCompact(max, c.currency)}</span>
          <span>{moneyCompact(max / 2, c.currency)}</span>
          <span>0</span>
        </div>

        {/* Bars and ticks scroll as one element — scrolling them separately
            would slide the labels out from under their columns. */}
        <div
          ref={scrollRef}
          className={styles.chartScroll}
          style={{ ['--bar-cols' as string]: cols }}
          tabIndex={0}
          role="group"
          aria-label={`Comissão diária em ${c.currency}, ${c.series.length} dias, máximo de ${moneyCompact(max, c.currency)}`}
        >
          {/* One provider for the whole series, not one per bar. The native
              `title` is gone: two tooltips for one bar is worse than none. */}
          <TooltipProvider delayDuration={80}>
            <div className={styles.barChart}>
              {c.series.map((s) => (
                <Tooltip key={s.date}>
                  <TooltipTrigger asChild>
                    <div className={styles.barCol}>
                      <div className={styles.bar} style={{ height: `${(s.revenue / max) * 100}%` }} />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className={styles.barTooltip}>
                    <span className={styles.barTooltipDay}>{dayLabel(s.date)}</span>
                    <span className={styles.barTooltipValue}>
                      Comissão {moneyExact(s.revenue, c.currency)}
                    </span>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </TooltipProvider>

          <div className={styles.xAxis} aria-hidden="true">
            {c.series.map((s) => (
              <span key={s.date} className={styles.xTick}>{dayLabel(s.date)}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
