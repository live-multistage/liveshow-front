'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Pencil, Check, X, Loader2, AlertCircle } from 'lucide-react';
import { useGetAdQuery } from '../queries/use-get-ad';
import { useAdReportQuery } from '../queries/use-ad-report';
import { useChangeAdStatusMutation } from '../mutations/use-change-ad-status.mutation';
import { useUpdateAdMutation } from '../mutations/use-update-ad.mutation';
import type {
  AdResponse,
  AdStatus,
  AdStatusAction,
  AdFormat,
  AdPlacement,
  AdBillingModel,
  UpdateAdRequest,
} from '../types/advertisement.types';
import styles from './AdDetailPage.module.scss';

// ── Constants ──────────────────────────────────────────────────

const STATUS_CFG: Record<AdStatus, { label: string; color: string; bg: string }> = {
  DRAFT:  { label: 'Rascunho',    color: '#5fb4ff', bg: 'rgba(95,180,255,0.12)' },
  REVIEW: { label: 'Em revisão',  color: '#bba6ff', bg: 'rgba(187,166,255,0.12)' },
  ACTIVE: { label: 'Ativo',       color: '#7fe0a0', bg: 'rgba(127,224,160,0.12)' },
  PAUSED: { label: 'Pausado',     color: '#ffd166', bg: 'rgba(255,209,102,0.12)' },
  ENDED:  { label: 'Encerrado',   color: '#71717a', bg: 'rgba(113,113,122,0.12)' },
};

const FORMAT_LABEL: Record<AdFormat, string> = {
  HORIZONTAL_728x90: 'Horizontal 728×90',
  VERTICAL_300x600:  'Vertical 300×600',
};

const PLACEMENT_LABEL: Record<AdPlacement, string> = {
  FEED:          'Feed de descoberta',
  EVENT_DETAIL:  'Detalhes do evento',
  CHECKOUT:      'Checkout',
  POST_PURCHASE: 'Pós-compra',
};

const DOMAIN_OPTIONS = [
  { value: 'ENTERTAINMENT', label: 'Entretenimento' },
  { value: 'SPORTS',        label: 'Esportes' },
  { value: 'CORPORATE',     label: 'Corporativo' },
  { value: 'EDUCATION',     label: 'Educação' },
  { value: 'RELIGIOUS',     label: 'Religioso' },
];

const PLACEMENT_OPTIONS: AdPlacement[] = ['FEED', 'EVENT_DETAIL', 'CHECKOUT', 'POST_PURCHASE'];

const STATUS_FLOW: AdStatus[] = ['DRAFT', 'REVIEW', 'ACTIVE', 'PAUSED', 'ENDED'];

type StatusAction = { action: AdStatusAction; label: string; variant: 'primary' | 'secondary' | 'danger' };

function availableActions(status: AdStatus): StatusAction[] {
  if (status === 'DRAFT')  return [{ action: 'submit',   label: 'Enviar para Revisão', variant: 'primary' }];
  if (status === 'REVIEW') return [
    { action: 'activate', label: 'Ativar',     variant: 'primary' },
    { action: 'end',      label: 'Encerrar',   variant: 'danger' },
  ];
  if (status === 'ACTIVE') return [
    { action: 'pause',    label: 'Pausar',     variant: 'secondary' },
    { action: 'end',      label: 'Encerrar',   variant: 'danger' },
  ];
  if (status === 'PAUSED') return [
    { action: 'activate', label: 'Reativar',   variant: 'primary' },
    { action: 'end',      label: 'Encerrar',   variant: 'danger' },
  ];
  return [];
}

function fmtCents(cents: number) {
  return `R$ ${(cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

function fmtNum(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return n.toLocaleString('pt-BR');
  return String(n);
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

const GRADIENTS = [
  'linear-gradient(135deg,#ff2e9e 0%,#9b7bff 100%)',
  'linear-gradient(160deg,#ff7a4d 0%,#ffd166 100%)',
  'linear-gradient(135deg,#5fb4ff 0%,#9b7bff 100%)',
  'linear-gradient(135deg,#ffd166 0%,#ff7a4d 100%)',
  'linear-gradient(135deg,#bba6ff 0%,#5fb4ff 100%)',
  'linear-gradient(135deg,#7fe0a0 0%,#5fb4ff 100%)',
];
function gradientFor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return GRADIENTS[h % GRADIENTS.length];
}

// ── Edit form state type ───────────────────────────────────────

interface EditState {
  title: string;
  placements: AdPlacement[];
  targetDomains: string[];
  billingModel: AdBillingModel;
  bidCents: number;
  dailyBudgetCents: number;
  totalLimitCents: number;
}

function adToEditState(ad: AdResponse): EditState {
  return {
    title:           ad.title,
    placements:      [...ad.placements],
    targetDomains:   [...ad.targetDomains],
    billingModel:    ad.billingModel,
    bidCents:        ad.bidCents,
    dailyBudgetCents: ad.dailyBudgetCents,
    totalLimitCents: ad.totalLimitCents,
  };
}

function editStateToRequest(s: EditState): UpdateAdRequest {
  return {
    title:            s.title,
    placements:       s.placements,
    targetDomains:    s.targetDomains,
    billingModel:     s.billingModel,
    bidCents:         s.bidCents,
    dailyBudgetCents: s.dailyBudgetCents,
    totalLimitCents:  s.totalLimitCents,
  };
}

// ── Main component ─────────────────────────────────────────────

interface Props { id: string }

export function AdDetailPage({ id }: Props) {
  const router = useRouter();
  const { data: ad, isLoading, isError } = useGetAdQuery(id);
  const { data: report } = useAdReportQuery(id);
  const changeStatus = useChangeAdStatusMutation(ad?.organizationId);
  const updateAd = useUpdateAdMutation(id, ad?.organizationId);

  const [editing, setEditing] = useState(false);
  const [edit, setEdit] = useState<EditState | null>(null);

  useEffect(() => {
    if (ad && !editing) setEdit(adToEditState(ad));
  }, [ad]);

  function startEdit() {
    if (ad) { setEdit(adToEditState(ad)); setEditing(true); }
  }

  function cancelEdit() {
    if (ad) { setEdit(adToEditState(ad)); setEditing(false); }
  }

  async function saveEdit() {
    if (!edit) return;
    await updateAd.mutateAsync(editStateToRequest(edit));
    setEditing(false);
  }

  function setEditField<K extends keyof EditState>(k: K, v: EditState[K]) {
    setEdit((p) => p ? { ...p, [k]: v } : p);
  }

  function togglePlacement(p: AdPlacement) {
    if (!edit) return;
    const next = edit.placements.includes(p)
      ? edit.placements.filter((x) => x !== p)
      : [...edit.placements, p];
    setEditField('placements', next);
  }

  function toggleDomain(d: string) {
    if (!edit) return;
    const next = edit.targetDomains.includes(d)
      ? edit.targetDomains.filter((x) => x !== d)
      : [...edit.targetDomains, d];
    setEditField('targetDomains', next);
  }

  if (isLoading) {
    return (
      <div className={styles.centered}>
        <Loader2 size={28} className={styles.spinner} />
      </div>
    );
  }

  if (isError || !ad) {
    return (
      <div className={styles.centered}>
        <AlertCircle size={24} />
        <p>Anúncio não encontrado.</p>
        <button className={styles.backLink} onClick={() => router.push('/dashboard/advertisement')}>
          Voltar para anúncios
        </button>
      </div>
    );
  }

  const statusCfg = STATUS_CFG[ad.status];
  const actions = availableActions(ad.status);
  const isEnded = ad.status === 'ENDED';
  const canEdit = !isEnded;

  const spendPct = ad.totalLimitCents > 0
    ? Math.min(100, (ad.totalSpendCents / ad.totalLimitCents) * 100)
    : 0;

  const ctrPct = report?.ctr != null ? `${(report.ctr * 100).toFixed(2)}%` : '—';

  return (
    <div className={styles.page}>
      {/* Top bar */}
      <div className={styles.topBar}>
        <button className={styles.backBtn} onClick={() => router.push('/dashboard/advertisement')}>
          <ChevronLeft size={16} />
          ANÚNCIOS
        </button>

        <div className={styles.topBarRight}>
          {canEdit && !editing && (
            <button className={styles.editBtn} onClick={startEdit}>
              <Pencil size={14} />
              Editar
            </button>
          )}
          {editing && (
            <>
              <button
                className={styles.cancelBtn}
                onClick={cancelEdit}
                disabled={updateAd.isPending}
              >
                <X size={14} />
                Cancelar
              </button>
              <button
                className={styles.saveBtn}
                onClick={saveEdit}
                disabled={updateAd.isPending}
              >
                {updateAd.isPending
                  ? <><Loader2 size={14} className={styles.btnSpinner} />Salvando...</>
                  : <><Check size={14} />Salvar</>
                }
              </button>
            </>
          )}
        </div>
      </div>

      {/* Page header */}
      <div className={styles.pageHeader}>
        <div className={styles.adPreviewThumb} style={{ background: gradientFor(ad.id) }}>
          <span className={styles.thumbLabel}>{ad.format === 'HORIZONTAL_728x90' ? '728×90' : '300×600'}</span>
        </div>
        <div className={styles.pageHeaderMeta}>
          <div className={styles.pageHeaderTop}>
            <span className={styles.adIdTag}>{ad.id.slice(0, 8).toUpperCase()}</span>
            <span
              className={styles.statusBadge}
              style={{ color: statusCfg.color, background: statusCfg.bg }}
            >
              <span className={styles.statusDot} style={{ background: statusCfg.color }} />
              {statusCfg.label}
            </span>
          </div>
          {editing && edit ? (
            <input
              className={styles.titleInput}
              value={edit.title}
              onChange={(e) => setEditField('title', e.target.value)}
              maxLength={120}
            />
          ) : (
            <h1 className={styles.pageTitle}>{ad.title}</h1>
          )}
          <p className={styles.pageSub}>
            {FORMAT_LABEL[ad.format]} · {fmtDate(ad.startsAt)} – {fmtDate(ad.endsAt)}
          </p>
        </div>
      </div>

      {/* Two-column layout */}
      <div className={styles.layout}>
        {/* LEFT — details + edit form */}
        <div className={styles.left}>

          {/* Posicionamento */}
          <Section title="POSICIONAMENTO">
            {editing && edit ? (
              <div className={styles.checkGroup}>
                {PLACEMENT_OPTIONS.map((p) => (
                  <label key={p} className={styles.checkRow}>
                    <input
                      type="checkbox"
                      className={styles.checkbox}
                      checked={edit.placements.includes(p)}
                      onChange={() => togglePlacement(p)}
                    />
                    <span>{PLACEMENT_LABEL[p]}</span>
                  </label>
                ))}
              </div>
            ) : (
              <div className={styles.tagRow}>
                {ad.placements.map((p) => (
                  <span key={p} className={styles.tag}>{PLACEMENT_LABEL[p]}</span>
                ))}
              </div>
            )}
          </Section>

          {/* Segmentação */}
          <Section title="SEGMENTAÇÃO">
            {editing && edit ? (
              <div className={styles.checkGroup}>
                {DOMAIN_OPTIONS.map((d) => (
                  <label key={d.value} className={styles.checkRow}>
                    <input
                      type="checkbox"
                      className={styles.checkbox}
                      checked={edit.targetDomains.includes(d.value)}
                      onChange={() => toggleDomain(d.value)}
                    />
                    <span>{d.label}</span>
                  </label>
                ))}
              </div>
            ) : (
              <div className={styles.tagRow}>
                {ad.targetDomains.length > 0
                  ? ad.targetDomains.map((d) => (
                      <span key={d} className={styles.tag}>
                        {DOMAIN_OPTIONS.find((o) => o.value === d)?.label ?? d}
                      </span>
                    ))
                  : <span className={styles.empty}>Sem segmentação específica</span>
                }
              </div>
            )}
          </Section>

          {/* Cobrança */}
          <Section title="COBRANÇA">
            {editing && edit ? (
              <div className={styles.billingEdit}>
                <div className={styles.billingRow}>
                  {(['CPM', 'CPC'] as AdBillingModel[]).map((m) => (
                    <label key={m} className={`${styles.billingOption} ${edit.billingModel === m ? styles.billingOptionActive : ''}`}>
                      <input
                        type="radio"
                        name="billing"
                        value={m}
                        checked={edit.billingModel === m}
                        onChange={() => setEditField('billingModel', m)}
                        className={styles.radioHidden}
                      />
                      <span className={styles.billingLabel}>{m}</span>
                      <span className={styles.billingDesc}>{m === 'CPM' ? 'por mil impressões' : 'por clique'}</span>
                    </label>
                  ))}
                </div>
                <SliderField
                  label={`LANCE (${edit.billingModel === 'CPM' ? 'por 1k imp.' : 'por clique'})`}
                  value={edit.bidCents / 100}
                  min={edit.billingModel === 'CPM' ? 5 : 1}
                  max={edit.billingModel === 'CPM' ? 100 : 20}
                  step={edit.billingModel === 'CPM' ? 5 : 0.5}
                  format={(v) => `R$ ${v.toFixed(2)}`}
                  onChange={(v) => setEditField('bidCents', Math.round(v * 100))}
                />
                <SliderField
                  label="ORÇAMENTO DIÁRIO"
                  value={edit.dailyBudgetCents / 100}
                  min={10}
                  max={500}
                  step={10}
                  format={(v) => `R$ ${v}`}
                  onChange={(v) => setEditField('dailyBudgetCents', Math.round(v * 100))}
                />
                <SliderField
                  label="LIMITE TOTAL"
                  value={edit.totalLimitCents / 100}
                  min={100}
                  max={5000}
                  step={50}
                  format={(v) => `R$ ${v}`}
                  onChange={(v) => setEditField('totalLimitCents', Math.round(v * 100))}
                />
              </div>
            ) : (
              <div className={styles.detailGrid}>
                <DetailRow label="MODELO"  value={ad.billingModel === 'CPM' ? 'CPM — por mil impressões' : 'CPC — por clique'} />
                <DetailRow label="LANCE"   value={fmtCents(ad.bidCents)} />
                <DetailRow label="DIÁRIO"  value={fmtCents(ad.dailyBudgetCents)} />
                <DetailRow label="TOTAL"   value={fmtCents(ad.totalLimitCents)} />
              </div>
            )}
          </Section>

          {/* Período */}
          <Section title="PERÍODO">
            <div className={styles.detailGrid}>
              <DetailRow label="INÍCIO"    value={fmtDate(ad.startsAt)} />
              <DetailRow label="TÉRMINO"   value={fmtDate(ad.endsAt)} />
              <DetailRow label="CRIADO EM" value={fmtDate(ad.createdAt)} />
            </div>
          </Section>

        </div>

        {/* RIGHT — metrics + status panel */}
        <div className={styles.right}>

          {/* Metrics */}
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>MÉTRICAS</h3>
            <div className={styles.metricsGrid}>
              <MetricKpi label="IMPRESSÕES"  value={report ? fmtNum(report.impressions) : '—'} />
              <MetricKpi label="CLIQUES"     value={report ? fmtNum(report.clicks)      : '—'} />
              <MetricKpi label="CTR"         value={ctrPct} accent />
            </div>

            <div className={styles.spendRow}>
              <div className={styles.spendLabels}>
                <span className={styles.spendLabel}>GASTO</span>
                <span className={styles.spendValues}>
                  {fmtCents(ad.totalSpendCents)} / {fmtCents(ad.totalLimitCents)}
                </span>
              </div>
              <div className={styles.progressBar}>
                <div
                  className={styles.progressFill}
                  style={{
                    width: `${spendPct}%`,
                    background: spendPct > 90 ? '#ff6b6b' : spendPct > 70 ? '#ffd166' : '#7fe0a0',
                  }}
                />
              </div>
              <span className={styles.spendPct}>{spendPct.toFixed(1)}% utilizado</span>
            </div>
          </div>

          {/* Status flow */}
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>FLUXO DE STATUS</h3>
            <div className={styles.statusFlow}>
              {STATUS_FLOW.map((s, i) => {
                const cfg = STATUS_CFG[s];
                const isCurrent = s === ad.status;
                const isPast = STATUS_FLOW.indexOf(ad.status) > i && ad.status !== 'PAUSED';
                return (
                  <div key={s} className={styles.statusFlowStep}>
                    <div
                      className={`${styles.statusFlowDot} ${isCurrent ? styles.statusFlowDotCurrent : isPast ? styles.statusFlowDotPast : ''}`}
                      style={isCurrent ? { background: cfg.color, boxShadow: `0 0 10px ${cfg.color}60` } : {}}
                    />
                    <span
                      className={`${styles.statusFlowLabel} ${isCurrent ? styles.statusFlowLabelCurrent : ''}`}
                      style={isCurrent ? { color: cfg.color } : {}}
                    >
                      {cfg.label}
                    </span>
                    {i < STATUS_FLOW.length - 1 && (
                      <div className={`${styles.statusFlowLine} ${isPast ? styles.statusFlowLinePast : ''}`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          {actions.length > 0 && (
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>AÇÕES</h3>
              <div className={styles.actionsBtnGroup}>
                {actions.map((a) => (
                  <button
                    key={a.action}
                    className={`${styles.actionBtn} ${styles[`actionBtn_${a.variant}`]}`}
                    disabled={changeStatus.isPending}
                    onClick={() => changeStatus.mutate({ adId: ad.id, action: a.action })}
                  >
                    {changeStatus.isPending
                      ? <Loader2 size={14} className={styles.btnSpinner} />
                      : null
                    }
                    {a.label}
                  </button>
                ))}
              </div>
              <p className={styles.actionHint}>
                {ad.status === 'DRAFT' && 'Após envio, o anúncio fica em revisão antes de ser exibido.'}
                {ad.status === 'REVIEW' && 'Aprovado manualmente — ative para iniciar a veiculação.'}
                {ad.status === 'ACTIVE' && 'Pausar interrompe a veiculação sem encerrar o orçamento.'}
                {ad.status === 'PAUSED' && 'Reative a qualquer momento dentro do período configurado.'}
              </p>
            </div>
          )}

          {/* Preview */}
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>PRÉVIA</h3>
            <div
              className={`${styles.previewBox} ${ad.format === 'VERTICAL_300x600' ? styles.previewBoxV : styles.previewBoxH}`}
              style={{ background: gradientFor(ad.id) }}
            >
              <span className={styles.previewSponsored}>PATROCINADO</span>
              <span className={styles.previewTitle}>{ad.title}</span>
              <span className={styles.previewCta}>SAIBA MAIS →</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>{title}</h3>
      {children}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.detailRow}>
      <span className={styles.detailLabel}>{label}</span>
      <span className={styles.detailValue}>{value}</span>
    </div>
  );
}

function MetricKpi({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={styles.metricKpi}>
      <span className={styles.metricKpiLabel}>{label}</span>
      <span className={`${styles.metricKpiValue} ${accent ? styles.metricKpiAccent : ''}`}>{value}</span>
    </div>
  );
}

function SliderField({
  label, value, min, max, step, format, onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <div className={styles.sliderField}>
      <div className={styles.sliderHeader}>
        <span className={styles.sliderLabel}>{label}</span>
        <span className={styles.sliderValue}>{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        className={styles.slider}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}
