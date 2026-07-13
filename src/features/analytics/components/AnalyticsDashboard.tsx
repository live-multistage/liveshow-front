'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Download } from 'lucide-react';
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  PointElement, LineElement, Tooltip, Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { useGetEventSalesQuery } from '../hooks/use-event-sales';
import { useGetEventMetricsQuery } from '../hooks/use-event-metrics';
import { useGetEventQuery } from '@/features/events/queries/get-event';
import { useViewerAnalyticsQuery } from '../hooks/use-viewer-analytics';
import { useCameraBreakdownQuery } from '../hooks/use-camera-breakdown';
import { useNotificationBreakdownQuery } from '../hooks/use-notification-breakdown';
import type { EventSalesRow } from '../types/sales.types';
import type { ChartPoint } from '../types/analytics.types';
import type { ViewerAnalyticsResult } from '../types/viewer-analytics.types';
import type { CameraBreakdownRow } from '../types/camera-breakdown.types';
import type { NotificationBreakdownRow } from '../types/notification-breakdown.types';
import styles from './AnalyticsDashboard.module.scss';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

// ─── Types ────────────────────────────────────────────────────────
type Range = '24h' | '7d' | 'all';

// ─── Static data (no backend source yet) ─────────────────────────
const ORIGIN_DATA = [
  { label: 'Busca orgânica', pct: '34%', color: '#ff2e9e', dasharray: '34 100', offset: 0 },
  { label: 'Link direto',    pct: '28%', color: '#bba6ff', dasharray: '28 100', offset: -34 },
  { label: 'Recomendação',   pct: '22%', color: '#46d6d8', dasharray: '22 100', offset: -62 },
  { label: 'Notificação',    pct: '11%', color: '#ffd166', dasharray: '11 100', offset: -84 },
  { label: 'Outros',         pct: '5%',  color: '#7d7d85', dasharray: '5 100',  offset: -95 },
];

const TICKET_BAR_COLORS = [
  'linear-gradient(90deg,#ff2e9e,#ff8ec9)',
  'linear-gradient(90deg,#bba6ff,#9b7bff)',
  'linear-gradient(90deg,#46d6d8,#7fe0a0)',
  'linear-gradient(90deg,#ffd166,#ff9f45)',
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
  if (rate === null || rate === 0) return '—';
  return `${(rate * 100).toFixed(1).replace('.', ',')}%`;
}

function fmtAvgWatch(seconds: number | null): string {
  if (!seconds) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}min`;
  return `${m}min`;
}

function computeDelta(current: number, previous: number): { delta: string; deltaUp: boolean } | null {
  if (previous === 0) return current > 0 ? { delta: '+100%', deltaUp: true } : null;
  const pct = ((current - previous) / previous) * 100;
  const sign = pct >= 0 ? '+' : '−';
  return { delta: `${sign}${Math.abs(pct).toFixed(1).replace('.', ',')}%`, deltaUp: pct >= 0 };
}

// ─── KPI Card ─────────────────────────────────────────────────────
interface KpiCardProps {
  label: string;
  value: string;
  sub: string;
  iconBg: string;
  iconColor: string;
  iconPath: React.ReactNode;
  delta: string;
  deltaUp: boolean;
  accent?: boolean;
}

function KpiCard({ label, value, sub, iconBg, iconColor, iconPath, delta, deltaUp, accent }: KpiCardProps) {
  const deltaTextColor = deltaUp ? '#7fe0a0' : '#ef6b6b';
  const deltaBg = deltaUp ? 'rgba(127,224,160,.1)' : 'rgba(239,107,107,.1)';
  return (
    <div className={styles.kpiCard}>
      {accent && <div className={styles.kpiGlow} />}
      <div className={styles.kpiTop}>
        <div className={styles.kpiIcon} style={{ background: iconBg }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2">
            {iconPath}
          </svg>
        </div>
        {delta && (
          <span className={styles.kpiDelta} style={{ color: deltaTextColor, background: deltaBg }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6">
              {deltaUp
                ? <path d="M12 19V5M5 12l7-7 7 7" />
                : <path d="M12 5v14M5 12l7 7 7-7" />}
            </svg>
            {delta}
          </span>
        )}
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

  // Compute bar heights relative to viewCount (max=100)
  const cartPct = viewCount > 0 ? Math.max(8, Math.round((cartAddCount / viewCount) * 100)) : 0;
  const purchasePct = viewCount > 0 ? Math.max(4, Math.round((purchaseCount / viewCount) * 100)) : 0;

  // 4 steps matching design — INICIOU CHECKOUT not tracked yet
  const steps = [
    {
      label: 'VISUALIZAÇÕES',
      value: isLoading ? '…' : fmtCompact(viewCount),
      rate: '100%',
      heightPct: 100,
      hasDrop: true,
      drop: viewToCartRate !== null
        ? `${((1 - viewToCartRate) * 100).toFixed(1).replace('.', ',')}%`
        : null,
    },
    {
      label: 'ADD AO CARRINHO',
      value: isLoading ? '…' : fmtCompact(cartAddCount),
      rate: fmtRate(viewToCartRate),
      heightPct: cartPct,
      hasDrop: true,
      drop: cartToPurchaseRate !== null
        ? `${((1 - cartToPurchaseRate) * 100).toFixed(1).replace('.', ',')}%`
        : null,
    },
    {
      label: 'INICIOU CHECKOUT',
      value: '—',
      rate: null,
      heightPct: Math.max(purchasePct + 5, 10),
      hasDrop: true,
      drop: null,
    },
    {
      label: 'COMPROU',
      value: isLoading ? '…' : fmtCompact(purchaseCount),
      rate: fmtRate(totalRate),
      heightPct: purchasePct,
      hasDrop: false,
      drop: null,
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

      {/* 7-column grid: step arrow step arrow step arrow step */}
      <div className={styles.funnelGrid}>
        {steps.map((step, i) => (
          <div key={step.label} style={{ display: 'contents' }}>
            <div className={styles.funnelStep}>
              <div className={styles.funnelMeta}>
                <span className={styles.funnelMetaLabel}>{step.label}</span>
                {step.rate && <span className={styles.funnelMetaRate}>{step.rate}</span>}
              </div>
              <div className={styles.funnelValue}>{step.value}</div>
              <div className={styles.funnelBar}>
                <div className={styles.funnelFill} style={{ height: `${step.heightPct}%` }} />
              </div>
            </div>
            {step.hasDrop && (
              <div className={styles.funnelArrow}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5f5f67" strokeWidth="2">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
                {step.drop && <span className={styles.funnelDrop}>-{step.drop}</span>}
              </div>
            )}
          </div>
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
  const hasData = series.length > 0;
  const labels = hasData ? series.map((p) => p.hour) : ['—'];
  const viewers = hasData ? series.map((p) => p.viewers) : [0];
  const newAccesses = hasData ? series.map((p) => p.newAccesses) : [0];

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
          <div className={styles.cardSub}>Espectadores simultâneos e novos acessos por hora</div>
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

// ─── Viewers Section ──────────────────────────────────────────────
interface ViewersSectionProps {
  data: ViewerAnalyticsResult | undefined;
  isLoading: boolean;
}

function ViewersSection({ data, isLoading }: ViewersSectionProps) {
  const loading = isLoading || !data;

  const peakLabel = data?.peakAt
    ? new Date(data.peakAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : null;

  const hourlyLabels = data?.hourlyBreakdown.map((p) => {
    const d = new Date(p.hour);
    return `${d.getHours().toString().padStart(2, '0')}h`;
  }) ?? ['—'];

  const hourlyViewers = data?.hourlyBreakdown.map((p) => p.viewers) ?? [0];

  const chartData = {
    labels: hourlyLabels,
    datasets: [
      {
        label: 'Espectadores/hora',
        data: hourlyViewers,
        borderColor: '#46d6d8',
        backgroundColor: 'rgba(70,214,216,0.15)',
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointBackgroundColor: '#46d6d8',
        borderWidth: 2.5,
      },
    ],
  };

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div>
          <div className={styles.cardTitle}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#46d6d8" strokeWidth="2">
              <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            ESPECTADORES
          </div>
          <div className={styles.cardSub}>Presença ao vivo e histórico de views</div>
        </div>
      </div>

      <div className={styles.kpiGrid} style={{ marginBottom: '1.5rem' }}>
        <KpiCard
          label="PICO SIMULTÂNEO"
          value={loading ? '…' : fmtCompact(data.peakViewers)}
          sub={peakLabel ? `às ${peakLabel}` : '—'}
          iconBg="rgba(70,214,216,.14)"
          iconColor="#46d6d8"
          iconPath={<><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></>}
          delta=""
          deltaUp
        />
        <KpiCard
          label="TOTAL DE VIEWS"
          value={loading ? '…' : fmtCompact(data.totalViews)}
          sub="views históricos"
          iconBg="rgba(255,46,158,.14)"
          iconColor="#ff8ec9"
          iconPath={<><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></>}
          delta=""
          deltaUp
        />
        <KpiCard
          label="TEMPO MÉDIO"
          value={loading ? '…' : fmtAvgWatch(data.avgDurationSeconds)}
          sub="por sessão"
          iconBg="rgba(255,209,102,.14)"
          iconColor="#ffd166"
          iconPath={<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>}
          delta=""
          deltaUp
        />
        <KpiCard
          label="AO VIVO AGORA"
          value={loading ? '…' : fmtCompact(data.currentViewers)}
          sub="espectadores simultâneos"
          iconBg="rgba(127,224,160,.14)"
          iconColor="#7fe0a0"
          iconPath={<circle cx="12" cy="12" r="3" />}
          delta=""
          deltaUp
        />
      </div>

      <div className={styles.chartWrap}>
        {loading
          ? <div className={styles.loadingRow}>CARREGANDO…</div>
          : <Line data={chartData} options={CHART_OPTIONS} />
        }
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
        <span className={styles.thR}>PREÇO</span>
        <span>VENDIDOS</span>
        <span className={styles.thR}>RECEITA</span>
        <span className={styles.thR}>CONV.</span>
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

// ─── Camera Breakdown ──────────────────────────────────────────────
function fmtDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}min`;
  return `${m}min`;
}

function CameraBreakdownSection({ rows, isLoading }: { rows: CameraBreakdownRow[]; isLoading: boolean }) {
  return (
    <div className={`${styles.card} ${styles.cardNomarg}`}>
      <div className={styles.cardHeader}>
        <div>
          <div className={styles.cardTitle}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ff5fb4" strokeWidth="2">
              <rect x="3" y="5" width="14" height="14" rx="2" /><path d="M17 9l4-2v10l-4-2" />
            </svg>
            CÂMERAS
          </div>
          <div className={styles.cardSub}>Uso por câmera durante o evento</div>
        </div>
      </div>

      {isLoading && <div className={styles.loadingRow}>CARREGANDO…</div>}
      {!isLoading && rows.length === 0 && <div className={styles.loadingRow}>Nenhuma visualização registrada</div>}

      {rows.map((row) => (
        <div key={row.cameraId} className={styles.ticketRow}>
          <div>
            <div className={styles.ticketName}>{row.cameraName}</div>
          </div>
          <div className={styles.ticketRevenue}>{row.viewCount.toLocaleString('pt-BR')} views</div>
          <div className={styles.ticketRevenue}>{row.uniqueVisits.toLocaleString('pt-BR')} visitas únicas</div>
          <div className={styles.ticketRevenue}>{fmtDuration(row.totalDurationSeconds)}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Notifications Panel ──────────────────────────────────────────
const NOTIFICATION_TYPE_LABEL: Record<string, string> = {
  EVENT: 'Evento',
  TICKET: 'Ingresso',
  PAYMENT: 'Pagamento',
  SYSTEM: 'Sistema',
  RECOMMENDATION: 'Recomendação',
};

function NotificationsPanel({ rows, isLoading }: { rows: NotificationBreakdownRow[]; isLoading: boolean }) {
  return (
    <div className={`${styles.card} ${styles.cardNomarg}`}>
      <div className={styles.cardHeader}>
        <div>
          <div className={styles.cardTitle}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ff5fb4" strokeWidth="2">
              <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.7 21a2 2 0 0 1-3.4 0" />
            </svg>
            NOTIFICAÇÕES
          </div>
          <div className={styles.cardSub}>Entregas e cliques por tipo</div>
        </div>
      </div>

      {isLoading && <div className={styles.loadingRow}>CARREGANDO…</div>}
      {!isLoading && rows.length === 0 && <div className={styles.loadingRow}>Nenhuma notificação enviada</div>}

      <div className={styles.notifList}>
        {rows.map((row) => (
          <div key={row.notificationType} className={styles.notifCard}>
            <div className={styles.notifIcon} style={{ background: 'rgba(155,123,255,.14)', color: '#bba6ff' }}>
              🔔
            </div>
            <div>
              <div className={styles.notifTitle}>{NOTIFICATION_TYPE_LABEL[row.notificationType] ?? row.notificationType}</div>
              <div className={styles.notifMeta}>
                {row.deliveredCount.toLocaleString('pt-BR')} enviadas · {row.clickedCount.toLocaleString('pt-BR')} cliques
              </div>
            </div>
            <span className={`${styles.notifRate} ${(row.clickRate ?? 0) >= 0.3 ? styles.notifRateOk : styles.notifRateWarn}`}>
              {row.clickRate !== null ? `${(row.clickRate * 100).toFixed(0)}%` : '—'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────
interface AnalyticsDashboardProps {
  eventId: string;
  eventTitle?: string;
}

export function AnalyticsDashboard({ eventId, eventTitle }: AnalyticsDashboardProps) {
  const [range, setRange] = useState<Range>('24h');
  const rangeWindow = useMemo(() => {
    if (range === 'all') return undefined;
    const now = new Date();
    return {
      from: new Date(now.getTime() - (range === '24h' ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000)),
      to: now,
    };
  }, [range]);
  const { data: eventSales, isLoading: salesLoading } = useGetEventSalesQuery();

  const events = eventSales?.events ?? [];
  const thisEvent = events.find((e) => e.eventId === eventId);

  const totalOrders  = thisEvent?.totalOrders  ?? 0;
  const totalRevenue = thisEvent?.totalRevenue ?? 0;

  const { data: metrics, isLoading: metricsLoading } = useGetEventMetricsQuery(eventId, rangeWindow);

  const { data: eventData } = useGetEventQuery(eventId);
  const orgId = eventData?.organizationId;
  const { data: viewerAnalytics, isLoading: viewersLoading } = useViewerAnalyticsQuery(orgId, eventId);
  const { data: cameraBreakdown, isLoading: cameraBreakdownLoading } = useCameraBreakdownQuery(orgId, eventId);
  const { data: notificationBreakdown, isLoading: notificationsLoading } = useNotificationBreakdownQuery(eventId);

  const funnel = metrics?.funnel ?? {
    viewCount: 0, uniqueViewCount: 0, cartAddCount: 0, purchaseCount: 0,
    viewToCartRate: null, cartToPurchaseRate: null, avgWatchSeconds: null, completionRate: null,
    cameraSwitchCount: 0,
  };
  const chartSeries  = metrics?.chart ?? [];
  const peakViewers  = metrics?.peakViewers ?? 0;
  const peakHour     = metrics?.peakHour ?? null;

  const conversionRate = funnel.viewCount > 0 ? funnel.purchaseCount / funnel.viewCount : null;
  const completionPct  = funnel.completionRate !== null
    ? `${(funnel.completionRate * 100).toFixed(0)}% completion rate`
    : 'sem dados suficientes';

  const current = metrics?.currentWindow ?? null;
  const previous = metrics?.previousWindow ?? null;
  const viewsDelta = current && previous ? computeDelta(current.viewCount, previous.viewCount) : null;
  const conversionDelta = current && previous && current.viewCount > 0 && previous.viewCount > 0
    ? computeDelta(
        current.purchaseCount / current.viewCount,
        previous.purchaseCount / previous.viewCount,
      )
    : null;
  const avgWatchDelta = current && previous && current.avgWatchSeconds !== null && previous.avgWatchSeconds !== null
    ? computeDelta(current.avgWatchSeconds, previous.avgWatchSeconds)
    : null;

  const displayTitle = eventTitle ?? thisEvent?.eventTitle ?? '—';

  return (
    <div className={styles.page}>
      {/* Breadcrumb */}
      <div className={styles.breadcrumb}>
        <Link href="/dashboard/analytics" className={styles.breadcrumbLink}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M11 18l-6-6 6-6" />
          </svg>
          ANÁLISES
        </Link>
        <span className={styles.breadcrumbSep}>/</span>
        <span>{displayTitle.toUpperCase()}</span>
        <span className={styles.breadcrumbSep}>/</span>
        <span className={styles.breadcrumbActive}>MÉTRICAS</span>
      </div>

      {/* Header */}
      <div className={styles.header}>
        <div>
          <div className={styles.headerMeta}>
            <span className={styles.liveBadge}>
              <span className={styles.liveDot} />
              AO VIVO AGORA
            </span>
          </div>
          <h1 className={styles.title}>{displayTitle}</h1>
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
          delta={viewsDelta?.delta ?? ''}
          deltaUp={viewsDelta?.deltaUp ?? true}
        />
        <KpiCard
          label="INGRESSOS VENDIDOS"
          value={salesLoading ? '…' : totalOrders.toLocaleString('pt-BR')}
          sub={salesLoading ? '…' : `${fmtCurrency(totalRevenue)} em receita`}
          iconBg="rgba(155,123,255,.14)"
          iconColor="#bba6ff"
          iconPath={<path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2 2 2 0 0 0 0 4 2 2 0 0 1-2 2H5a2 2 0 0 1-2-2 2 2 0 0 0 0-4Z" />}
          delta="+18%"
          deltaUp
          accent
        />
        <KpiCard
          label="TAXA DE CONVERSÃO"
          value={metricsLoading ? '…' : fmtRate(conversionRate)}
          sub="visualização → compra"
          iconBg="rgba(70,214,216,.14)"
          iconColor="#46d6d8"
          iconPath={<path d="M3 4h18l-7 9v7l-4-2v-5z" />}
          delta={conversionDelta?.delta ?? ''}
          deltaUp={conversionDelta?.deltaUp ?? true}
        />
        <KpiCard
          label="TEMPO MÉDIO ASSISTIDO"
          value={metricsLoading ? '…' : fmtAvgWatch(funnel.avgWatchSeconds)}
          sub={metricsLoading ? '…' : completionPct}
          iconBg="rgba(255,209,102,.14)"
          iconColor="#ffd166"
          iconPath={<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>}
          delta={avgWatchDelta?.delta ?? ''}
          deltaUp={avgWatchDelta?.deltaUp ?? true}
        />
        <KpiCard
          label="TROCAS DE CÂMERA"
          value={metricsLoading ? '…' : fmtCompact(funnel.cameraSwitchCount)}
          sub="mudanças de ângulo/grade"
          iconBg="rgba(187,166,255,.14)"
          iconColor="#bba6ff"
          iconPath={<><rect x="3" y="5" width="14" height="14" rx="2" /><path d="M17 9l4-2v10l-4-2" /></>}
          delta=""
          deltaUp
        />
      </div>

      {/* Viewers */}
      <ViewersSection data={viewerAnalytics} isLoading={viewersLoading} />

      {/* Funnel */}
      <FunnelSection
        viewCount={funnel.viewCount}
        cartAddCount={funnel.cartAddCount}
        purchaseCount={funnel.purchaseCount}
        viewToCartRate={funnel.viewToCartRate}
        cartToPurchaseRate={funnel.cartToPurchaseRate}
        isLoading={metricsLoading}
      />

      {/* Cameras */}
      <CameraBreakdownSection rows={cameraBreakdown ?? []} isLoading={cameraBreakdownLoading} />

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

      {/* Ticket Table + Notifications */}
      <div className={styles.twoColBottom}>
        <TicketTable events={thisEvent ? [thisEvent] : []} isLoading={salesLoading} />
        <NotificationsPanel rows={notificationBreakdown ?? []} isLoading={notificationsLoading} />
      </div>
    </div>
  );
}
