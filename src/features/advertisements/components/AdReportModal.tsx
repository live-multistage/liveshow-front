'use client';

import { useEffect } from 'react';
import { X, Loader2, AlertCircle } from 'lucide-react';
import styles from './AdReportModal.module.scss';
import { useAdReportQuery } from '../queries/use-ad-report';

export interface ReportAdRef {
  id: string;
  title: string;
  formatLabel: string;
  period: string;
  previewBg: string;
}

interface Props {
  ad: ReportAdRef;
  onClose: () => void;
}

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return n.toLocaleString('pt-BR');
  return String(n);
}

function fmtCents(cents: number): string {
  return `R$ ${(cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

export function AdReportModal({ ad, onClose }: Props) {
  const { data: report, isLoading, isError } = useAdReportQuery(ad.id);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const ctrPct = report?.ctr != null ? `${(report.ctr * 100).toFixed(2)}%` : '—';
  const cpmAvg =
    report && report.impressions > 0
      ? fmtCents(Math.round((report.spendCents / report.impressions) * 1000))
      : '—';

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.modalMeta}>
            <span className={styles.modalId}>{ad.id.slice(0, 8).toUpperCase()}</span>
            <span className={styles.modalFormat}>{ad.formatLabel}</span>
          </div>
          <div className={styles.modalTitleRow}>
            <h2 className={styles.modalTitle}>{ad.title}</h2>
            <button className={styles.modalClose} onClick={onClose} aria-label="Fechar">
              <X size={18} />
            </button>
          </div>
          <p className={styles.modalPeriod}>{ad.period}</p>
        </div>

        <div className={styles.modalBody}>
          {isLoading && (
            <div className={styles.loadingState}>
              <Loader2 size={24} className={styles.loadingSpinner} />
              <span>Carregando relatório...</span>
            </div>
          )}

          {isError && (
            <div className={styles.errorState}>
              <AlertCircle size={20} />
              <span>Erro ao carregar relatório.</span>
            </div>
          )}

          {report && (
            <>
              <div className={styles.kpiStrip}>
                {[
                  { label: 'IMPRESSÕES', value: fmtNum(report.impressions) },
                  { label: 'CLIQUES',    value: fmtNum(report.clicks) },
                  { label: 'CTR',        value: ctrPct },
                  { label: 'GASTO',      value: fmtCents(report.spendCents) },
                  { label: 'CPM MÉDIO',  value: cpmAvg },
                ].map((k) => (
                  <div key={k.label} className={styles.kpiCard}>
                    <span className={styles.kpiLabel}>{k.label}</span>
                    <span className={styles.kpiValue}>{k.value}</span>
                  </div>
                ))}
              </div>

              {report.dailyBreakdown.length > 0 && (
                <div className={styles.chartSection}>
                  <div className={styles.chartHeader}>
                    <p className={styles.chartTitle}>DESEMPENHO AO LONGO DO TEMPO</p>
                    <div className={styles.chartLegend}>
                      <span className={styles.legendDot} style={{ background: '#ff2e9e' }} />
                      <span className={styles.legendLabel}>Impressões</span>
                      <span className={styles.legendDot} style={{ background: '#9b7bff' }} />
                      <span className={styles.legendLabel}>Cliques</span>
                    </div>
                  </div>
                  <MiniLineChart breakdown={report.dailyBreakdown} />
                </div>
              )}

              {report.dailyBreakdown.length > 0 && (
                <div className={styles.breakdownSection}>
                  <p className={styles.breakdownTitle}>BREAKDOWN DIÁRIO</p>
                  <div className={styles.breakdownTable}>
                    <div className={styles.breakdownHead}>
                      <span>DATA</span>
                      <span>IMPRESSÕES</span>
                      <span>CLIQUES</span>
                      <span>CTR</span>
                      <span>GASTO</span>
                    </div>
                    {report.dailyBreakdown.slice(0, 10).map((row) => {
                      const rowCtr = row.impressions > 0 ? ((row.clicks / row.impressions) * 100).toFixed(2) + '%' : '—';
                      return (
                        <div key={row.date} className={styles.breakdownRow}>
                          <span className={styles.breakdownChannel}>
                            {new Date(row.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                          </span>
                          <span className={styles.breakdownNum}>{fmtNum(row.impressions)}</span>
                          <span className={styles.breakdownNum}>{fmtNum(row.clicks)}</span>
                          <span className={styles.breakdownCtr}>{rowCtr}</span>
                          <span className={styles.breakdownNum}>{fmtCents(row.spendCents)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className={styles.previewSection}>
                <p className={styles.previewTitle}>PRÉVIA DO ANÚNCIO</p>
                <div className={styles.previewBox} style={{ background: ad.previewBg }}>
                  <span className={styles.previewText}>{ad.title}</span>
                  <span className={styles.previewCta}>SAIBA MAIS</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function MiniLineChart({ breakdown }: { breakdown: { date: string; impressions: number; clicks: number }[] }) {
  const w = 600;
  const h = 140;
  const pad = { top: 10, right: 20, bottom: 30, left: 40 };
  const cw = w - pad.left - pad.right;
  const ch = h - pad.top - pad.bottom;

  const maxImp = Math.max(...breakdown.map((b) => b.impressions), 1);
  const maxClk = Math.max(...breakdown.map((b) => b.clicks), 1);
  const n = breakdown.length;

  function px(i: number) { return pad.left + (i / Math.max(n - 1, 1)) * cw; }
  function pyImp(v: number) { return pad.top + ch - (v / maxImp) * ch; }
  function pyClk(v: number) { return pad.top + ch - (v / maxClk) * ch; }

  const impLine = breakdown.map((b, i) => `${i === 0 ? 'M' : 'L'}${px(i)},${pyImp(b.impressions)}`).join(' ');
  const clkLine = breakdown.map((b, i) => `${i === 0 ? 'M' : 'L'}${px(i)},${pyClk(b.clicks)}`).join(' ');
  const impFill = `${impLine} L${px(n - 1)},${pad.top + ch} L${pad.left},${pad.top + ch} Z`;

  const labelStep = Math.max(1, Math.floor(n / 6));
  const labelDays = breakdown.filter((_, i) => i % labelStep === 0 || i === n - 1);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={styles.chart} preserveAspectRatio="none">
      <defs>
        <linearGradient id="impGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ff2e9e" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#ff2e9e" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={impFill} fill="url(#impGrad)" />
      <path d={impLine} fill="none" stroke="#ff2e9e" strokeWidth="2" />
      <path d={clkLine} fill="none" stroke="#9b7bff" strokeWidth="2" strokeDasharray="4,2" />
      {labelDays.map((b) => {
        const i = breakdown.indexOf(b);
        const label = new Date(b.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
        return (
          <text
            key={b.date}
            x={px(i)}
            y={h - 6}
            textAnchor="middle"
            fontSize="9"
            fill="#71717a"
            fontFamily="Space Mono, monospace"
          >
            {label}
          </text>
        );
      })}
    </svg>
  );
}
