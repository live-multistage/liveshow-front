'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Download } from 'lucide-react';
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  PointElement, LineElement, Tooltip, Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { useGetEventSalesQuery } from '../hooks/use-event-sales';
import { useGetEventMetricsQuery } from '../hooks/use-event-metrics';
import type { EventSalesRow } from '../types/sales.types';
import type { ChartPoint } from '../types/analytics.types';
import styles from './AnalyticsDashboard.module.scss';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

// ─── Types ────────────────────────────────────────────────────────
type Range = '24h' | '7d' | 'all';

// ─── Constants ────────────────────────────────────────────────────
const TICKET_BAR_COLORS = [
  'linear-gradient(90deg,#ff2e9e,#ff8ec9)',
  'linear-gradient(90deg,#bba6ff,#9b7bff)',
  'linear-gradient(90deg,#46d6d8,#7fe0a0)',
  'linear-gradient(90deg,#ffd166,#ff9f45)',
];

// Origin data has no tracking source in user_events yet — static placeholder
const ORIGIN_DATA = [
  { label: 'Busca orgânica', pct: '—', color: '#ff2e9e', dasharray: '25 100', offset: 0 },
  { label: 'Link direto',    pct: '—', color: '#bba6ff', dasharray: '25 100', offset: -25 },
  { label: 'Recomendação',   pct: '—', color: '#46d6d8', dasharray: '25 100', offset: -50 },
  { label: 'Outros',         pct: '—', color: '#7d7d85', dasharray: '25 100', offset: -75 },
];

const CHART_OPTIONS = {
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

// ─── Helpers ──────────────────────────────────────────────────────
function fmtCurrency(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtCompact(v: number) {
  if (v >= 1000) return `${(v / 1000).toFixed(1).replace('.', ',')}k`;
  return v.toLocaleString('pt-BR');
}

function fmtRate(rate: number | null): string {
  if (rate === null) return '—';
  return `${(rate * 100).toFixed(1).replace('.', ',')}%`;
}

// ─── KPI Card ─────────────────────────────────────────────────────
interface KpiCardProps {
  label: string;
  value: string;
  sub: string;
  iconBg: string;
  iconColor: string;
  iconPath: React.ReactNode;
  accent?: boolean;
}

function KpiCard({ label, value, sub, iconBg, iconColor, iconPath, accent }: KpiCardProps) {
  return (
    <div className={styles.kpiCard}>
      {accent && <div className={styles.kpiGlow} />}
      <div className={styles.kpiTop}>
        <div className={styles.kpiIcon} style={{ background: iconBg }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2">
            {iconPath}
          </svg>
        </div>
      </div>
      <div className={styles.kpiLabel}>{label}</div>
      <div className={styles.kpiValue}>{value}</div>
      <div className={styles.kpiSub}>{sub}</div>
    </div>
  );
}

// ─── Funnel Section ───────────────────────────────────────────────
interface FunnelProps {
  viewCount: number;
  cartAddCount: number;
  purchaseCount: number;
  viewToCartRate: number | null;
  cartToPurchaseRate: number | null;
  isLoading: boolean;
}

function FunnelSection({ viewCount, cartAddCount, purchaseCount, viewToCartRate, cartToPurchaseRate, isLoading }: FunnelProps) {
  const totalRate = viewCount > 0 ? purchaseCount / viewCount : null;

  const steps = [
    {
      label: 'VISUALIZAÇÕES',
      value: isLoading ? '…' : fmtCompact(viewCount),
      rate: '100%',
      heightPct: 100,
      drop: viewToCartRate !== null ? `${((1 - viewToCartRate) * 100).toFixed(1).replace('.', ',')}%` : null as string | null,
    },
    {
      label: 'ADD AO CARRINHO',
      value: isLoading ? '…' : fmtCompact(cartAddCount),
      rate: fmtRate(viewToCartRate),
      heightPct: viewCount > 0 ? Math.min(90, Math.max(10, Math.round((cartAddCount / Math.max(viewCount, 1)) * 500))) : 60,
      drop: cartToPurchaseRate !== null ? `${((1 - cartToPurchaseRate) * 100).toFixed(1).replace('.', ',')}%` : null as string | null,
    },
    {
      label: 'COMPROU',
      value: isLoading ? '…' : fmtCompact(purchaseCount),
      rate: fmtRate(totalRate),
      heightPct: viewCount > 0 ? Math.min(80, Math.max(5, Math.round((purchaseCount / Math.max(viewCount, 1)) * 700))) : 28,
      drop: null as string | null,
    },
  ];

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div>
          <div className={styles.cardTitle}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ff5fb4" strokeWidth="2">
              <path d="M3 4h18l-7 9v7l-4-2v-5z" />
            </svg>
            FUNIL DE CONVERSÃO
          </div>
          <div className={styles.cardSub}>Da visualização inicial até a compra confirmada</div>
        </div>
        <div className={styles.cardStat}>
          <span className={styles.cardStatVal}>{fmtRate(totalRate)}</span> de conversão total
        </div>
      </div>

      <div className={styles.funnelGrid}>
        {steps.map((step, i) => (
          <>
            <div key={step.label} className={styles.funnelStep}>
              <div className={styles.funnelMeta}>
                <span className={styles.funnelMetaLabel}>{step.label}</span>
                <span className={styles.funnelMetaRate}>{step.rate}</span>
              </div>
              <div className={styles.funnelValue}>{step.value}</div>
              <div className={styles.funnelBar}>
                <div className={styles.funnelFill} style={{ height: `${step.heightPct}%` }} />
              </div>
            </div>
            {step.drop && (
              <div key={`arrow-${i}`} className={styles.funnelArrow}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5f5f67" strokeWidth="2">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
                <span className={styles.funnelDrop}>-{step.drop}</span>
              </div>
            )}
          </>
        ))}
      </div>
    </div>
  );
}

// ─── Engagement Chart ─────────────────────────────────────────────
interface EngagementChartProps {
  series: ChartPoint[];
  peakViewers: number;
  peakHour: string | null;
  isLoading: boolean;
}

function EngagementChart({ series, peakViewers, peakHour, isLoading }: EngagementChartProps) {
  const labels = series.length > 0 ? series.map((p) => p.hour) : ['—'];
  const viewers = series.length > 0 ? series.map((p) => p.viewers) : [0];
  const newAccesses = series.length > 0 ? series.map((p) => p.newAccesses) : [0];

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Simultâneos',
        data: viewers,
        borderColor: '#ff2e9e',
        backgroundColor: 'rgba(255,46,158,0.18)',
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointBackgroundColor: '#ff2e9e',
        borderWidth: 2.5,
      },
      {
        label: 'Novos acessos',
        data: newAccesses,
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

  const peakLabel = peakViewers > 0 && peakHour
    ? `▲ PICO: ${fmtCompact(peakViewers)} ÀS ${peakHour}`
    : null;

  return (
    <div className={`${styles.card} ${styles.cardNomarg}`}>
      <div className={styles.cardHeader}>
        <div>
          <div className={styles.cardTitle}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ff5fb4" strokeWidth="2">
              <path d="M3 12h4l3-8 4 16 3-8h4" />
            </svg>
            ENGAJAMENTO AO LONGO DO TEMPO
          </div>
          <div className={styles.cardSub}>Espectadores e novos acessos por janela de 30 minutos</div>
        </div>
        <div className={styles.chartHeaderRight}>
          <div className={styles.chartLegendItem}>
            <span className={styles.legendSolid} /> Simultâneos
          </div>
          <div className={styles.chartLegendItem}>
            <span className={styles.legendDashed} /> Novos acessos
          </div>
        </div>
      </div>

      <div className={styles.chartWrap}>
        {!isLoading && peakLabel && <div className={styles.chartPeak}>{peakLabel}</div>}
        {isLoading
          ? <div className={styles.loadingRow}>CARREGANDO…</div>
          : <Line data={chartData} options={CHART_OPTIONS} />
        }
      </div>
    </div>
  );
}

// ─── Origin Donut ─────────────────────────────────────────────────
function OriginSection({ totalOrders }: { totalOrders: number }) {
  return (
    <div className={`${styles.card} ${styles.cardNomarg}`}>
      <div className={styles.cardHeader}>
        <div>
          <div className={styles.cardTitle}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ff5fb4" strokeWidth="2">
              <circle cx="12" cy="12" r="9" /><path d="M12 3v9l6 4" />
            </svg>
            ORIGEM DAS VENDAS
          </div>
          <div className={styles.cardSub}>Como os compradores chegaram ao evento</div>
        </div>
      </div>

      <div className={styles.donutWrap}>
        <div className={styles.donutSvgWrap}>
          <svg viewBox="0 0 42 42" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
            <circle cx="21" cy="21" r="15.9155" fill="none" stroke="rgba(255,255,255,.04)" strokeWidth="6" />
            {ORIGIN_DATA.map((o) => (
              <circle
                key={o.label}
                cx="21" cy="21" r="15.9155"
                fill="none"
                stroke={o.color}
                strokeWidth="6"
                strokeDasharray={o.dasharray}
                strokeDashoffset={o.offset}
              />
            ))}
          </svg>
          <div className={styles.donutCenter}>
            <span className={styles.donutCenterLabel}>VENDAS</span>
            <span className={styles.donutCenterValue}>{totalOrders > 0 ? fmtCompact(totalOrders) : '—'}</span>
          </div>
        </div>
      </div>

      <div className={styles.originList}>
        {ORIGIN_DATA.map((o) => (
          <div key={o.label} className={styles.originItem}>
            <span className={styles.originDot} style={{ background: o.color }} />
            <span className={styles.originLabel}>{o.label}</span>
            <span className={styles.originPct}>{o.pct}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Ticket Table ─────────────────────────────────────────────────
function TicketTable({ events, isLoading }: { events: EventSalesRow[]; isLoading: boolean }) {
  const totalOrders  = events.reduce((s, e) => s + e.totalOrders, 0);
  const totalRevenue = events.reduce((s, e) => s + e.totalRevenue, 0);
  const maxOrders    = Math.max(...events.map((e) => e.totalOrders), 1);

  return (
    <div className={`${styles.card} ${styles.cardNomarg}`}>
      <div className={styles.cardHeader}>
        <div>
          <div className={styles.cardTitle}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ff5fb4" strokeWidth="2">
              <path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2 2 2 0 0 0 0 4 2 2 0 0 1-2 2H5a2 2 0 0 1-2-2 2 2 0 0 0 0-4Z" />
            </svg>
            INGRESSOS POR EVENTO
          </div>
          <div className={styles.cardSub}>Performance de vendas por evento</div>
        </div>
        <Link href="/dashboard/sales" className={styles.cardLink}>VER DETALHES →</Link>
      </div>

      <div className={styles.ticketHead}>
        <span>EVENTO</span>
        <span className={styles.thR}>—</span>
        <span>VENDIDOS</span>
        <span className={styles.thR}>RECEITA</span>
        <span className={styles.thR}>%</span>
      </div>

      {isLoading && <div className={styles.loadingRow}>CARREGANDO…</div>}

      {events.map((event, i) => {
        const pct = Math.round((event.totalOrders / maxOrders) * 100);
        return (
          <div key={event.eventId} className={styles.ticketRow}>
            <div>
              <div className={styles.ticketName}>{event.eventTitle}</div>
              <div className={styles.ticketCode}>{event.eventId.slice(0, 8).toUpperCase()}</div>
            </div>
            <div className={styles.ticketPrice}>—</div>
            <div>
              <div className={styles.ticketSoldLabel}>
                <span className={styles.ticketSoldCount}>{event.totalOrders.toLocaleString('pt-BR')}</span>
                <span className={styles.ticketSoldPct}>{pct}%</span>
              </div>
              <div className={styles.ticketProgress}>
                <div
                  className={styles.ticketProgressFill}
                  style={{ width: `${pct}%`, background: TICKET_BAR_COLORS[i % TICKET_BAR_COLORS.length] }}
                />
              </div>
            </div>
            <div className={styles.ticketRevenue}>{fmtCurrency(event.totalRevenue)}</div>
            <div className={styles.ticketConv}>—</div>
          </div>
        );
      })}

      {!isLoading && events.length === 0 && (
        <div className={styles.loadingRow}>Nenhuma venda registrada</div>
      )}

      {events.length > 0 && (
        <div className={styles.ticketTotals}>
          <span className={styles.ticketTotalLabel}>TOTAL</span>
          <span />
          <span className={styles.ticketTotalOrders}>{totalOrders.toLocaleString('pt-BR')} ingressos</span>
          <span className={styles.ticketTotalRevenue}>{fmtCurrency(totalRevenue)}</span>
          <span className={styles.ticketTotalConv}>—</span>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────
export function AnalyticsDashboard() {
  const [range, setRange] = useState<Range>('24h');
  const { data: eventSales, isLoading: salesLoading } = useGetEventSalesQuery();

  const events = eventSales?.events ?? [];
  const topEvent = events[0];

  const { data: metrics, isLoading: metricsLoading } = useGetEventMetricsQuery(topEvent?.eventId);

  const totalOrders  = events.reduce((s, e) => s + e.totalOrders, 0);
  const totalRevenue = events.reduce((s, e) => s + e.totalRevenue, 0);

  const funnel = metrics?.funnel ?? { viewCount: 0, uniqueViewCount: 0, cartAddCount: 0, purchaseCount: 0, viewToCartRate: null, cartToPurchaseRate: null };
  const chartSeries = metrics?.chart ?? [];
  const peakViewers = metrics?.peakViewers ?? 0;
  const peakHour = metrics?.peakHour ?? null;

  const conversionRate = funnel.viewCount > 0 ? funnel.purchaseCount / funnel.viewCount : null;

  return (
    <div className={styles.page}>
      {/* Breadcrumb */}
      <div className={styles.breadcrumb}>
        <Link href="/dashboard/events" className={styles.breadcrumbLink}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M11 18l-6-6 6-6" />
          </svg>
          EVENTOS
        </Link>
        <span className={styles.breadcrumbSep}>/</span>
        <span>{topEvent?.eventTitle?.toUpperCase() ?? '—'}</span>
        <span className={styles.breadcrumbSep}>/</span>
        <span className={styles.breadcrumbActive}>ANÁLISES</span>
      </div>

      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{topEvent?.eventTitle ?? 'Análises'}</h1>
          <div className={styles.titleMeta}>
            <span>Liveshow</span>
          </div>
        </div>
        <div className={styles.headerActions}>
          <div className={styles.rangePicker}>
            {(['24h', '7d', 'all'] as Range[]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`${styles.rangeBtn} ${range === r ? styles.rangeBtnActive : ''}`}
              >
                {r === '24h' ? 'ÚLTIMAS 24H' : r === '7d' ? '7 DIAS' : 'EVENTO COMPLETO'}
              </button>
            ))}
          </div>
          <button className={styles.exportBtn}>
            <Download size={13} />
            EXPORTAR
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className={styles.kpiGrid}>
        <KpiCard
          label="VISUALIZAÇÕES"
          value={metricsLoading ? '…' : fmtCompact(funnel.viewCount)}
          sub={metricsLoading ? '…' : `${fmtCompact(funnel.uniqueViewCount)} espectadores únicos`}
          iconBg="rgba(255,46,158,.14)"
          iconColor="#ff8ec9"
          iconPath={<><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></>}
        />
        <KpiCard
          label="INGRESSOS VENDIDOS"
          value={salesLoading ? '…' : totalOrders.toLocaleString('pt-BR')}
          sub={salesLoading ? '…' : `${fmtCurrency(totalRevenue)} em receita`}
          iconBg="rgba(155,123,255,.14)"
          iconColor="#bba6ff"
          iconPath={<path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2 2 2 0 0 0 0 4 2 2 0 0 1-2 2H5a2 2 0 0 1-2-2 2 2 0 0 0 0-4Z" />}
          accent
        />
        <KpiCard
          label="TAXA DE CONVERSÃO"
          value={metricsLoading ? '…' : fmtRate(conversionRate)}
          sub="visualização → compra"
          iconBg="rgba(70,214,216,.14)"
          iconColor="#46d6d8"
          iconPath={<path d="M3 4h18l-7 9v7l-4-2v-5z" />}
        />
        <KpiCard
          label="RECEITA TOTAL"
          value={salesLoading ? '…' : fmtCurrency(totalRevenue)}
          sub="todos os eventos"
          iconBg="rgba(255,209,102,.14)"
          iconColor="#ffd166"
          iconPath={<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>}
        />
      </div>

      {/* Funnel */}
      <FunnelSection
        viewCount={funnel.viewCount}
        cartAddCount={funnel.cartAddCount}
        purchaseCount={funnel.purchaseCount}
        viewToCartRate={funnel.viewToCartRate}
        cartToPurchaseRate={funnel.cartToPurchaseRate}
        isLoading={metricsLoading}
      />

      {/* Engagement + Origin */}
      <div className={styles.twoCol}>
        <EngagementChart
          series={chartSeries}
          peakViewers={peakViewers}
          peakHour={peakHour}
          isLoading={metricsLoading}
        />
        <OriginSection totalOrders={totalOrders} />
      </div>

      {/* Ticket Table */}
      <div className={styles.twoColBottom}>
        <TicketTable events={events} isLoading={salesLoading} />
      </div>
    </div>
  );
}
