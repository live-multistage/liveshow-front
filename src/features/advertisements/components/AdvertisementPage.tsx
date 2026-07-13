'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Plus, Search, Loader2, ExternalLink, BarChart3 } from 'lucide-react';
import styles from './AdvertisementPage.module.scss';
import { AdReportModal, type ReportAdRef } from './AdReportModal';
import { useListAdsQuery } from '../queries/use-list-ads';
import { useChangeAdStatusMutation } from '../mutations/use-change-ad-status.mutation';
import { useMyOrganizationsQuery } from '@/features/organizations/queries/get-my-organizations';
import type { AdResponse, AdStatus, AdFormat } from '../types/advertisement.types';

// ── Display helpers ────────────────────────────────────────────

type DisplayStatus = 'active' | 'paused' | 'review' | 'ended' | 'draft';
type DisplayFormat = 'h' | 'v';


const STATUS_MAP: Record<DisplayStatus, { label: string; color: string }> = {
  active:  { label: 'Ativo',       color: '#7fe0a0' },
  paused:  { label: 'Pausado',     color: '#ffd166' },
  review:  { label: 'Em revisão',  color: '#bba6ff' },
  ended:   { label: 'Encerrado',   color: '#71717a' },
  draft:   { label: 'Rascunho',    color: '#5fb4ff' },
};

const FORMAT_LABEL: Record<AdFormat, { label: string; key: DisplayFormat; preview: string }> = {
  HORIZONTAL_728x90: { label: 'Horizontal 728×90', key: 'h', preview: '728×90' },
  VERTICAL_300x600:  { label: 'Vertical 300×600',  key: 'v', preview: '300×600' },
};

const GRADIENTS = [
  'linear-gradient(135deg,#ff2e9e 0%,#9b7bff 100%)',
  'linear-gradient(160deg,#ff7a4d 0%,#ffd166 100%)',
  'linear-gradient(135deg,#5fb4ff 0%,#9b7bff 100%)',
  'linear-gradient(135deg,#ffd166 0%,#ff7a4d 100%)',
  'linear-gradient(135deg,#bba6ff 0%,#5fb4ff 100%)',
  'linear-gradient(135deg,#7fe0a0 0%,#5fb4ff 100%)',
];

function gradientFor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return GRADIENTS[h % GRADIENTS.length];
}

function toDisplayStatus(status: AdStatus): DisplayStatus {
  if (status === 'ACTIVE') return 'active';
  if (status === 'PAUSED') return 'paused';
  if (status === 'REVIEW') return 'review';
  if (status === 'ENDED') return 'ended';
  return 'draft';
}

function formatPeriod(startsAt: string, endsAt: string): string {
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  return `${fmt(startsAt)} – ${fmt(endsAt)}`;
}

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return n.toLocaleString('pt-BR');
  return String(n);
}

function fmtCents(cents: number): string {
  return `R$ ${(cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

// ── Types ─────────────────────────────────────────────────────

type TabKey = 'all' | 'active' | 'paused' | 'ended';

// ── Main component ─────────────────────────────────────────────

export function AdvertisementPage() {
  const [tab, setTab] = useState<TabKey>('all');
  const [formatFilter, setFormatFilter] = useState<'all' | DisplayFormat>('all');
  const [search, setSearch] = useState('');
  const [reportAd, setReportAd] = useState<ReportAdRef | null>(null);

  const { data: orgs } = useMyOrganizationsQuery();
  const orgId = orgs?.[0]?.id;

  const { data: ads = [], isLoading, isError } = useListAdsQuery(orgId);
  const changeStatus = useChangeAdStatusMutation(orgId);

  // Compute tab counts from real data
  const counts = useMemo(() => ({
    all:    ads.length,
    active: ads.filter((a) => a.status === 'ACTIVE' || a.status === 'REVIEW').length,
    paused: ads.filter((a) => a.status === 'PAUSED' || a.status === 'DRAFT').length,
    ended:  ads.filter((a) => a.status === 'ENDED').length,
  }), [ads]);

  // Compute aggregate KPIs from spend
  const totalSpendCents = useMemo(() => ads.reduce((s, a) => s + a.totalSpendCents, 0), [ads]);

  const TABS = [
    { key: 'all' as TabKey,    label: 'TODOS',      count: counts.all },
    { key: 'active' as TabKey, label: 'ATIVOS',     count: counts.active },
    { key: 'paused' as TabKey, label: 'PAUSADOS',   count: counts.paused },
    { key: 'ended' as TabKey,  label: 'ENCERRADOS', count: counts.ended },
  ];

  function tabMatch(ad: AdResponse): boolean {
    const s = ad.status;
    if (tab === 'all') return true;
    if (tab === 'active') return s === 'ACTIVE' || s === 'REVIEW';
    if (tab === 'paused') return s === 'PAUSED' || s === 'DRAFT';
    if (tab === 'ended') return s === 'ENDED';
    return false;
  }

  const filtered = ads.filter((ad) => {
    const fmtKey = FORMAT_LABEL[ad.format]?.key;
    return (
      tabMatch(ad) &&
      (formatFilter === 'all' || fmtKey === formatFilter) &&
      (search === '' || ad.title.toLowerCase().includes(search.toLowerCase()))
    );
  });

  function handleToggle(ad: AdResponse) {
    const action = ad.status === 'ACTIVE' ? 'pause' : 'activate';
    changeStatus.mutate({ adId: ad.id, action });
  }

  function openReport(ad: AdResponse) {
    const fmt = FORMAT_LABEL[ad.format];
    setReportAd({
      id: ad.id,
      title: ad.title,
      formatLabel: fmt?.label ?? ad.format,
      period: formatPeriod(ad.startsAt, ad.endsAt),
      previewBg: gradientFor(ad.id),
    });
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Anúncios</h1>
          <p className={styles.subtitle}>Gerencie e acompanhe seus anúncios</p>
        </div>
        <Link href="/dashboard/advertisement/new" className={styles.createBtn}>
          <Plus size={16} />
          Criar Anúncio
        </Link>
      </header>

      {/* KPI strip — aggregate computed from list; impressions/clicks require report */}
      <div className={styles.kpiGrid}>
        <KpiCard label="ANÚNCIOS ATIVOS"   value={String(counts.active)}     sub="total" accent />
        <KpiCard label="PAUSADOS"          value={String(counts.paused)}     sub="total" />
        <KpiCard label="ENCERRADOS"        value={String(counts.ended)}      sub="total" />
        <KpiCard label="GASTO TOTAL"       value={fmtCents(totalSpendCents)} sub="acumulado" />
      </div>

      <div className={styles.toolbar}>
        <div className={styles.tabs}>
          {TABS.map((t) => (
            <button
              key={t.key}
              className={`${styles.tab} ${tab === t.key ? styles.tabActive : ''}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
              <span className={styles.tabCount}>{t.count}</span>
            </button>
          ))}
        </div>

        <div className={styles.toolbarRight}>
          <div className={styles.searchBox}>
            <Search size={14} className={styles.searchIcon} />
            <input
              className={styles.searchInput}
              placeholder="Buscar anúncio..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className={styles.formatFilter}>
            {(['all', 'h', 'v'] as const).map((f) => (
              <button
                key={f}
                className={`${styles.formatBtn} ${formatFilter === f ? styles.formatBtnActive : ''}`}
                onClick={() => setFormatFilter(f)}
              >
                {f === 'all' ? 'TODOS' : f === 'h' ? 'HORIZ.' : 'VERT.'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.adList}>
        {isLoading && (
          <div className={styles.loadingRow}>
            <Loader2 size={20} className={styles.spinner} />
            <span>Carregando anúncios...</span>
          </div>
        )}
        {isError && (
          <div className={styles.empty}>Erro ao carregar anúncios. Tente novamente.</div>
        )}
        {!isLoading && !isError && filtered.length === 0 && (
          <div className={styles.empty}>
            {ads.length === 0 ? 'Nenhum anúncio criado ainda.' : 'Nenhum anúncio encontrado.'}
          </div>
        )}
        {filtered.map((ad) => {
          const ds = toDisplayStatus(ad.status);
          const st = STATUS_MAP[ds];
          const fmt = FORMAT_LABEL[ad.format];
          const canToggle = ad.status === 'ACTIVE' || ad.status === 'PAUSED';
          const isOn = ad.status === 'ACTIVE';

          return (
            <div key={ad.id} className={styles.adRow}>
              <div
                className={styles.adPreview}
                style={ad.bannerUrl
                  ? { backgroundImage: `url(${ad.bannerUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                  : { background: gradientFor(ad.id) }
                }
              >
                {!ad.bannerUrl && <span className={styles.adPreviewLabel}>{fmt?.preview ?? '—'}</span>}
              </div>

              <div className={styles.adInfo}>
                <div className={styles.adMeta}>
                  <span className={styles.adId}>{ad.id.slice(0, 8).toUpperCase()}</span>
                  <span className={styles.adFormat}>{fmt?.label ?? ad.format}</span>
                </div>
                <p className={styles.adName}>{ad.title}</p>
                <p className={styles.adPeriod}>{formatPeriod(ad.startsAt, ad.endsAt)}</p>
              </div>

              <div className={styles.adStatus}>
                <span className={styles.statusBadge} style={{ color: st.color, borderColor: `${st.color}40` }}>
                  <span className={styles.statusDot} style={{ background: st.color }} />
                  {st.label}
                </span>
              </div>

              <div className={styles.adMetrics}>
                <Metric label="GASTO"   value={fmtCents(ad.totalSpendCents)} />
                <Metric label="LIMITE"  value={fmtCents(ad.totalLimitCents)} />
                <Metric label="DIÁRIO"  value={fmtCents(ad.dailyBudgetCents)} />
                <Metric label="LANCE"   value={`R$ ${(ad.bidCents / 100).toFixed(2)}`} />
              </div>

              <div className={styles.adActions}>
                {canToggle && (
                  <button
                    className={`${styles.toggle} ${isOn ? styles.toggleOn : ''}`}
                    onClick={() => handleToggle(ad)}
                    disabled={changeStatus.isPending}
                    aria-label={isOn ? 'Pausar anúncio' : 'Ativar anúncio'}
                  >
                    <span className={styles.toggleThumb} />
                  </button>
                )}
                <Link
                  href={`/dashboard/advertisement/${ad.id}`}
                  className={styles.reportBtn}
                  aria-label="Detalhes"
                  title="Detalhes"
                >
                  <ExternalLink size={14} />
                </Link>
                <button
                  className={styles.reportBtn}
                  onClick={() => openReport(ad)}
                  aria-label="Relatório"
                  title="Relatório"
                >
                  <BarChart3 size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className={styles.pagination}>
        <span className={styles.paginationInfo}>
          Mostrando {filtered.length} de {ads.length} anúncios
        </span>
      </div>

      {reportAd && (
        <AdReportModal ad={reportAd} onClose={() => setReportAd(null)} />
      )}
    </div>
  );
}

function KpiCard({ label, value, sub, accent }: { label: string; value: string; sub: string; accent?: boolean }) {
  return (
    <div className={`${styles.kpiCard} ${accent ? styles.kpiCardAccent : ''}`}>
      <span className={styles.kpiLabel}>{label}</span>
      <span className={styles.kpiValue}>{value}</span>
      <div className={styles.kpiFooter}>
        <span className={styles.kpiSub}>{sub}</span>
      </div>
    </div>
  );
}

function Metric({ label, value, up }: { label: string; value: string; up?: boolean }) {
  return (
    <div className={styles.metric}>
      <span className={styles.metricLabel}>{label}</span>
      <span className={`${styles.metricValue} ${up === true ? styles.metricUp : up === false ? styles.metricDown : ''}`}>
        {value}
      </span>
    </div>
  );
}
