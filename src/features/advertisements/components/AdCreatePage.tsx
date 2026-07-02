'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Check, Loader2, ImagePlus, X } from 'lucide-react';
import { useCreateAdMutation } from '../mutations/use-create-ad.mutation';
import { advertisementsService } from '../services/advertisements.service';
import { eventsService } from '@/features/events/services/events.service';
import { useMyOrganizationsQuery } from '@/features/organizations/queries/get-my-organizations';
import type { AdFormat, AdPlacement, AdBillingModel, FrequencyCapWindow } from '../types/advertisement.types';
import styles from './AdCreatePage.module.scss';

// ── Types ──────────────────────────────────────────────────────

type Step = 1 | 2 | 3;

interface FormState {
  title: string;
  format: 'h' | 'v';
  eventId: string;
  placementFeed: boolean;
  placementDetail: boolean;
  placementCheckout: boolean;
  placementPost: boolean;
  interestEntertainment: boolean;
  interestSports: boolean;
  interestCorporate: boolean;
  interestEducation: boolean;
  interestReligion: boolean;
  frequency: 'unlimited' | 'limit3' | 'once';
  startsAt: string;
  endsAt: string;
  billing: 'cpm' | 'cpc';
  bidAmount: number;
  dailyBudget: number;
  totalLimit: number;
}

const today = new Date().toISOString().slice(0, 10);
const nextMonth = new Date(Date.now() + 30 * 86400_000).toISOString().slice(0, 10);

const INITIAL: FormState = {
  title: '',
  format: 'h',
  eventId: '',
  placementFeed: true,
  placementDetail: false,
  placementCheckout: false,
  placementPost: false,
  interestEntertainment: true,
  interestSports: false,
  interestCorporate: false,
  interestEducation: false,
  interestReligion: false,
  frequency: 'unlimited',
  startsAt: today,
  endsAt: nextMonth,
  billing: 'cpm',
  bidAmount: 15,
  dailyBudget: 50,
  totalLimit: 1550,
};

// ── Constants ──────────────────────────────────────────────────

const PLACEMENTS = [
  { key: 'placementFeed' as const,     label: 'Feed de descoberta',   desc: 'Entre eventos no feed' },
  { key: 'placementDetail' as const,   label: 'Página de detalhes',   desc: 'Sidebar no detalhe do evento' },
  { key: 'placementCheckout' as const, label: 'Checkout',             desc: 'Durante finalização de compra' },
  { key: 'placementPost' as const,     label: 'Pós-compra',           desc: 'Após confirmação de ingresso' },
];

const INTERESTS = [
  { key: 'interestEntertainment' as const, label: 'Entretenimento', domain: 'ENTERTAINMENT' },
  { key: 'interestSports' as const,        label: 'Esportes',       domain: 'SPORTS' },
  { key: 'interestCorporate' as const,     label: 'Corporativo',    domain: 'CORPORATE' },
  { key: 'interestEducation' as const,     label: 'Educação',       domain: 'EDUCATION' },
  { key: 'interestReligion' as const,      label: 'Religioso',      domain: 'RELIGIOUS' },
];

const FREQUENCY_OPTIONS = [
  { v: 'unlimited' as const, label: 'Sem limite',       desc: 'Exibe quantas vezes precisar' },
  { v: 'limit3' as const,    label: 'Máx 3× por dia',   desc: 'Por usuário / dia' },
  { v: 'once' as const,      label: '1× por usuário',   desc: 'Impressão única por pessoa' },
];

const STEP_LABELS = ['Criativo', 'Segmentação', 'Orçamento'];

const GRADIENTS = [
  'linear-gradient(135deg,#ff2e9e 0%,#9b7bff 100%)',
  'linear-gradient(160deg,#ff7a4d 0%,#ffd166 100%)',
  'linear-gradient(135deg,#5fb4ff 0%,#9b7bff 100%)',
  'linear-gradient(135deg,#ffd166 0%,#ff7a4d 100%)',
  'linear-gradient(135deg,#bba6ff 0%,#5fb4ff 100%)',
  'linear-gradient(135deg,#7fe0a0 0%,#5fb4ff 100%)',
];

// ── Helpers ────────────────────────────────────────────────────

function buildRequest(form: FormState, orgId: string, events: { id: string; title: string }[]) {
  const placements: AdPlacement[] = [];
  if (form.placementFeed)     placements.push('FEED');
  if (form.placementDetail)   placements.push('EVENT_DETAIL');
  if (form.placementCheckout) placements.push('CHECKOUT');
  if (form.placementPost)     placements.push('POST_PURCHASE');

  const targetDomains = INTERESTS.filter((i) => form[i.key]).map((i) => i.domain);

  let frequencyCapMax: number | undefined;
  let frequencyCapWindow: FrequencyCapWindow | undefined;
  if (form.frequency === 'limit3') { frequencyCapMax = 3; frequencyCapWindow = 'day'; }
  else if (form.frequency === 'once') { frequencyCapMax = 1; frequencyCapWindow = 'total'; }

  const selectedEvent = events.find((e) => e.id === form.eventId);
  const autoTitle = selectedEvent
    ? `${selectedEvent.title} — ${form.format === 'h' ? 'Banner Topo' : 'Sidebar'}`
    : 'Novo Anúncio';

  return {
    organizationId: orgId,
    eventId: form.eventId || undefined,
    title: form.title.trim() || autoTitle,
    format: (form.format === 'h' ? 'HORIZONTAL_728x90' : 'VERTICAL_300x600') as AdFormat,
    placements,
    targetDomains,
    targetCategories: [] as string[],
    frequencyCapMax,
    frequencyCapWindow,
    billingModel: form.billing.toUpperCase() as AdBillingModel,
    bidCents: Math.round(form.bidAmount * 100),
    dailyBudgetCents: Math.round(form.dailyBudget * 100),
    totalLimitCents: Math.round(form.totalLimit * 100),
    startsAt: `${form.startsAt}T00:00:00.000Z`,
    endsAt: `${form.endsAt}T23:59:59.000Z`,
  };
}

function fmtDate(iso: string) {
  if (!iso) return '—';
  return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Main ───────────────────────────────────────────────────────

export function AdCreatePage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<FormState>(INITIAL);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: orgs } = useMyOrganizationsQuery();
  const orgId = orgs?.[0]?.id;

  const createMutation = useCreateAdMutation(orgId);

  const { data: myEvents = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['events', 'mine'],
    queryFn: () => eventsService.getMyEvents(),
    staleTime: 60_000,
  });

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  const canNext =
    step === 1 ? true
    : step === 2 ? !!form.startsAt && !!form.endsAt && form.endsAt >= form.startsAt
    : true;

  async function handleCreate() {
    if (!orgId) return;
    const payload = buildRequest(form, orgId, myEvents);
    createMutation.mutate(payload, {
      onSuccess: async (created) => {
        if (bannerFile && created?.id) {
          setUploading(true);
          try { await advertisementsService.uploadBanner(created.id, bannerFile); }
          finally { setUploading(false); }
        }
        router.push(`/dashboard/advertisement/${created.id}`);
      },
    });
  }

  const isSubmitting = createMutation.isPending || uploading;
  const bannerPreview = bannerFile ? URL.createObjectURL(bannerFile) : null;

  const previewBg = GRADIENTS[
    form.title
      ? (Array.from(form.title).reduce((h, c) => ((h * 31) + c.charCodeAt(0)) >>> 0, 0)) % GRADIENTS.length
      : 0
  ];

  return (
    <div className={styles.page}>
      {/* Top bar */}
      <div className={styles.topBar}>
        <button className={styles.backBtn} onClick={() => router.push('/dashboard/advertisement')}>
          <ChevronLeft size={16} />
          ANÚNCIOS
        </button>
        <h1 className={styles.pageTitle}>Criar Anúncio</h1>
      </div>

      {/* Stepper */}
      <div className={styles.stepper}>
        {STEP_LABELS.map((label, i) => {
          const s = (i + 1) as Step;
          const done = step > s;
          const current = step === s;
          return (
            <div key={s} className={styles.stepItem}>
              <button
                className={`${styles.stepCircle} ${done ? styles.stepDone : current ? styles.stepCurrent : styles.stepPending}`}
                onClick={() => done && setStep(s)}
                disabled={!done}
                aria-label={`Ir para passo ${s}`}
              >
                {done ? <Check size={12} /> : s}
              </button>
              <span className={`${styles.stepLabel} ${current ? styles.stepLabelCurrent : ''}`}>{label}</span>
              {s < 3 && <div className={`${styles.stepLine} ${step > s ? styles.stepLineDone : ''}`} />}
            </div>
          );
        })}
      </div>

      {/* Content + sidebar */}
      <div className={styles.layout}>
        {/* FORM */}
        <div className={styles.formArea}>

          {/* ── STEP 1: Criativo ── */}
          {step === 1 && (
            <div className={styles.stepContent}>
              {/* Title */}
              <FormSection title="TÍTULO DO ANÚNCIO">
                <input
                  className={styles.input}
                  placeholder="Ex: Ingressos para Rock in Rio 2026"
                  value={form.title}
                  onChange={(e) => set('title', e.target.value)}
                  maxLength={120}
                />
                <span className={styles.inputHint}>{form.title.length}/120 · Deixe em branco para gerar automaticamente</span>
              </FormSection>

              {/* Banner upload */}
              <FormSection title="BANNER DO ANÚNCIO">
                <div
                  className={styles.bannerDrop}
                  onClick={() => fileRef.current?.click()}
                  style={bannerPreview ? {
                    backgroundImage: `url(${bannerPreview})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  } : undefined}
                >
                  {!bannerPreview && (
                    <>
                      <ImagePlus size={28} className={styles.bannerIcon} />
                      <span className={styles.bannerHint}>Clique para selecionar imagem</span>
                      <span className={styles.bannerSub}>JPG, PNG, WEBP · máx 5 MB</span>
                    </>
                  )}
                  {bannerPreview && (
                    <button
                      className={styles.bannerRemove}
                      onClick={(e) => { e.stopPropagation(); setBannerFile(null); }}
                      type="button"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className={styles.fileInput}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f && f.size <= 5 * 1024 * 1024) setBannerFile(f);
                    e.target.value = '';
                  }}
                />
              </FormSection>

              <div className={styles.twoCol}>
                {/* Event */}
                <FormSection title="EVENTO VINCULADO (OPCIONAL)">
                  <select
                    className={styles.select}
                    value={form.eventId}
                    onChange={(e) => set('eventId', e.target.value)}
                    disabled={eventsLoading}
                  >
                    <option value="">Sem evento específico</option>
                    {myEvents.map((ev) => (
                      <option key={ev.id} value={ev.id}>{ev.title}</option>
                    ))}
                  </select>
                </FormSection>

                {/* Format */}
                <FormSection title="FORMATO">
                  <div className={styles.formatCards}>
                    <button
                      className={`${styles.formatCard} ${form.format === 'h' ? styles.formatCardActive : ''}`}
                      onClick={() => set('format', 'h')}
                    >
                      <div className={styles.formatPreviewH}>728×90</div>
                      <span className={styles.formatCardLabel}>Horizontal</span>
                      <span className={styles.formatCardSub}>728 × 90 px</span>
                    </button>
                    <button
                      className={`${styles.formatCard} ${form.format === 'v' ? styles.formatCardActive : ''}`}
                      onClick={() => set('format', 'v')}
                    >
                      <div className={styles.formatPreviewV}>300×600</div>
                      <span className={styles.formatCardLabel}>Vertical</span>
                      <span className={styles.formatCardSub}>300 × 600 px</span>
                    </button>
                  </div>
                </FormSection>
              </div>

              {/* Placement */}
              <FormSection title="POSICIONAMENTO">
                <div className={styles.optionGrid}>
                  {PLACEMENTS.map((p) => (
                    <button
                      key={p.key}
                      type="button"
                      className={`${styles.optionCard} ${form[p.key] ? styles.optionCardActive : ''}`}
                      onClick={() => set(p.key, !form[p.key])}
                    >
                      <div className={`${styles.optionCheck} ${form[p.key] ? styles.optionCheckActive : ''}`}>
                        {form[p.key] && <Check size={10} />}
                      </div>
                      <div>
                        <span className={styles.optionCardLabel}>{p.label}</span>
                        <span className={styles.optionCardDesc}>{p.desc}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </FormSection>
            </div>
          )}

          {/* ── STEP 2: Segmentação ── */}
          {step === 2 && (
            <div className={styles.stepContent}>
              {/* Period */}
              <FormSection title="PERÍODO DE EXIBIÇÃO">
                <div className={styles.dateRow}>
                  <div className={styles.dateField}>
                    <label className={styles.dateLabel}>INÍCIO</label>
                    <input
                      type="date"
                      className={styles.dateInput}
                      value={form.startsAt}
                      min={today}
                      onChange={(e) => set('startsAt', e.target.value)}
                    />
                  </div>
                  <span className={styles.dateSep}>→</span>
                  <div className={styles.dateField}>
                    <label className={styles.dateLabel}>FIM</label>
                    <input
                      type="date"
                      className={styles.dateInput}
                      value={form.endsAt}
                      min={form.startsAt || today}
                      onChange={(e) => set('endsAt', e.target.value)}
                    />
                  </div>
                </div>
                {form.startsAt && form.endsAt && (
                  <p className={styles.periodHint}>
                    {Math.max(0, Math.round(
                      (new Date(form.endsAt).getTime() - new Date(form.startsAt).getTime()) / 86400_000
                    ))} dias de veiculação
                  </p>
                )}
              </FormSection>

              {/* Audience interests */}
              <FormSection title="INTERESSES DO PÚBLICO">
                <p className={styles.sectionDesc}>Seu anúncio será exibido para usuários com preferências correspondentes.</p>
                <div className={styles.tagList}>
                  {INTERESTS.map((i) => (
                    <button
                      key={i.key}
                      className={`${styles.tag} ${form[i.key] ? styles.tagActive : ''}`}
                      onClick={() => set(i.key, !form[i.key])}
                    >
                      {i.label}
                    </button>
                  ))}
                </div>
              </FormSection>

              {/* Frequency cap */}
              <FormSection title="FREQUÊNCIA DE EXIBIÇÃO">
                <div className={styles.optionGrid}>
                  {FREQUENCY_OPTIONS.map((opt) => (
                    <button
                      key={opt.v}
                      type="button"
                      className={`${styles.optionCard} ${form.frequency === opt.v ? styles.optionCardActive : ''}`}
                      onClick={() => set('frequency', opt.v)}
                    >
                      <div className={`${styles.optionCheck} ${form.frequency === opt.v ? styles.optionCheckActive : ''}`}>
                        {form.frequency === opt.v && <Check size={10} />}
                      </div>
                      <div>
                        <span className={styles.optionCardLabel}>{opt.label}</span>
                        <span className={styles.optionCardDesc}>{opt.desc}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </FormSection>
            </div>
          )}

          {/* ── STEP 3: Orçamento ── */}
          {step === 3 && (
            <div className={styles.stepContent}>
              {/* Billing model */}
              <FormSection title="MODELO DE COBRANÇA">
                <div className={styles.billingCards}>
                  {(
                    [
                      { v: 'cpm' as const, label: 'CPM', sub: 'Custo por mil impressões', desc: 'Ideal para reconhecimento de marca' },
                      { v: 'cpc' as const, label: 'CPC', sub: 'Custo por clique',         desc: 'Ideal para gerar conversões' },
                    ]
                  ).map((opt) => (
                    <button
                      key={opt.v}
                      className={`${styles.billingCard} ${form.billing === opt.v ? styles.billingCardActive : ''}`}
                      onClick={() => set('billing', opt.v)}
                    >
                      <div className={styles.billingCardTop}>
                        <span className={styles.billingLabel}>{opt.label}</span>
                        <div className={`${styles.optionCheck} ${form.billing === opt.v ? styles.optionCheckActive : ''}`}>
                          {form.billing === opt.v && <Check size={10} />}
                        </div>
                      </div>
                      <span className={styles.billingSub}>{opt.sub}</span>
                      <span className={styles.billingDesc}>{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </FormSection>

              {/* Sliders */}
              <div className={styles.twoCol}>
                <FormSection title={`LANCE POR ${form.billing === 'cpm' ? 'MIL IMPRESSÕES' : 'CLIQUE'}`}>
                  <SliderField
                    value={form.bidAmount}
                    min={form.billing === 'cpm' ? 5 : 1}
                    max={form.billing === 'cpm' ? 100 : 20}
                    step={form.billing === 'cpm' ? 5 : 0.5}
                    display={`R$ ${form.bidAmount.toFixed(2)}`}
                    onChange={(v) => set('bidAmount', v)}
                  />
                </FormSection>

                <FormSection title="ORÇAMENTO DIÁRIO">
                  <SliderField
                    value={form.dailyBudget}
                    min={10}
                    max={500}
                    step={10}
                    display={`R$ ${form.dailyBudget}`}
                    onChange={(v) => set('dailyBudget', v)}
                  />
                </FormSection>
              </div>

              <FormSection title="LIMITE TOTAL DE GASTO">
                <SliderField
                  value={form.totalLimit}
                  min={100}
                  max={10000}
                  step={100}
                  display={`R$ ${form.totalLimit.toLocaleString('pt-BR')}`}
                  onChange={(v) => set('totalLimit', v)}
                />
                <p className={styles.inputHint}>
                  Duração estimada: ~{Math.floor(form.totalLimit / form.dailyBudget)} dias ao ritmo máximo
                </p>
              </FormSection>

              {/* Error */}
              {createMutation.isError && (
                <div className={styles.errorBox}>
                  Erro ao criar anúncio. Verifique os dados e tente novamente.
                </div>
              )}
            </div>
          )}

          {/* Navigation */}
          <div className={styles.nav}>
            <button
              className={styles.navBack}
              onClick={() => step === 1 ? router.push('/dashboard/advertisement') : setStep((s) => (s - 1) as Step)}
              disabled={isSubmitting}
            >
              <ChevronLeft size={14} />
              {step === 1 ? 'Cancelar' : 'Voltar'}
            </button>

            <button
              className={styles.navNext}
              disabled={!canNext || isSubmitting}
              onClick={() => step < 3 ? setStep((s) => (s + 1) as Step) : void handleCreate()}
            >
              {isSubmitting ? (
                <><Loader2 size={14} className={styles.btnSpinner} />{uploading ? 'Enviando banner...' : 'Criando...'}</>
              ) : step < 3 ? (
                <><span>Próximo</span><ChevronRight size={14} /></>
              ) : (
                'Criar Anúncio'
              )}
            </button>
          </div>
        </div>

        {/* SIDEBAR — preview + summary */}
        <aside className={styles.sidebar}>
          {/* Live preview */}
          <div className={styles.sideCard}>
            <p className={styles.sideCardTitle}>PRÉVIA</p>
            <div
              className={`${styles.preview} ${form.format === 'v' ? styles.previewV : styles.previewH}`}
              style={{
                background: bannerPreview
                  ? `url(${bannerPreview}) center/cover`
                  : previewBg,
              }}
            >
              <span className={styles.previewSponsored}>PATROCINADO</span>
              <div className={styles.previewContent}>
                <span className={styles.previewTitle}>
                  {form.title || (myEvents.find((e) => e.id === form.eventId)?.title) || 'Título do anúncio'}
                </span>
                <span className={styles.previewCta}>SAIBA MAIS →</span>
              </div>
            </div>
            <p className={styles.previewLabel}>
              {form.format === 'h' ? 'Horizontal 728×90' : 'Vertical 300×600'}
            </p>
          </div>

          {/* Summary */}
          <div className={styles.sideCard}>
            <p className={styles.sideCardTitle}>RESUMO</p>
            <div className={styles.summaryList}>
              <SummaryRow label="FORMATO"
                value={form.format === 'h' ? 'Horizontal' : 'Vertical'} />
              <SummaryRow label="PERÍODO"
                value={form.startsAt && form.endsAt
                  ? `${fmtDate(form.startsAt)} – ${fmtDate(form.endsAt)}`
                  : '—'} />
              <SummaryRow label="EXIBIÇÃO"
                value={[
                  form.placementFeed     && 'Feed',
                  form.placementDetail   && 'Detalhes',
                  form.placementCheckout && 'Checkout',
                  form.placementPost     && 'Pós-compra',
                ].filter(Boolean).join(', ') || '—'} />
              <SummaryRow label="INTERESSES"
                value={INTERESTS.filter((i) => form[i.key]).map((i) => i.label).join(', ') || '—'} />
              <SummaryRow label="MODELO"
                value={form.billing === 'cpm' ? 'CPM' : 'CPC'} />
              <SummaryRow label="LANCE"
                value={`R$ ${form.bidAmount.toFixed(2)}/${form.billing === 'cpm' ? '1k' : 'clique'}`} />
              <SummaryRow label="DIÁRIO"     value={`R$ ${form.dailyBudget}`} />
              <SummaryRow label="TOTAL"      value={`R$ ${form.totalLimit.toLocaleString('pt-BR')}`} />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className={styles.formSection}>
      <h3 className={styles.sectionTitle}>{title}</h3>
      {children}
    </div>
  );
}

function SliderField({
  value, min, max, step, display, onChange,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className={styles.sliderWrap}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        className={styles.slider}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span className={styles.sliderValue}>{display}</span>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.summaryRow}>
      <span className={styles.summaryLabel}>{label}</span>
      <span className={styles.summaryValue}>{value}</span>
    </div>
  );
}
