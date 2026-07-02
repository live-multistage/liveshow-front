'use client';

import { useState, useRef } from 'react';
import { X, Check, ChevronLeft, ChevronRight, Loader2, ImagePlus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import styles from './CreateAdDrawer.module.scss';
import { useCreateAdMutation } from '../mutations/use-create-ad.mutation';
import { advertisementsService } from '../services/advertisements.service';
import { eventsService } from '@/features/events/services/events.service';
import type { AdFormat, AdPlacement, AdBillingModel, FrequencyCapWindow } from '../types/advertisement.types';

interface CreateAdDrawerProps {
  open: boolean;
  orgId?: string;
  onClose: () => void;
}

type Step = 1 | 2 | 3;

interface FormState {
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
  startDay: number | null;
  endDay: number | null;
  billing: 'cpm' | 'cpc';
  bidAmount: number;
  dailyBudget: number;
  totalLimit: number;
}

const INITIAL: FormState = {
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
  startDay: 1,
  endDay: 31,
  billing: 'cpm',
  bidAmount: 15,
  dailyBudget: 50,
  totalLimit: 1550,
};

const PLACEMENTS = [
  { key: 'placementFeed' as const,     label: 'Feed de descoberta' },
  { key: 'placementDetail' as const,   label: 'Página de detalhes' },
  { key: 'placementCheckout' as const, label: 'Página de checkout' },
  { key: 'placementPost' as const,     label: 'Tela pós-compra' },
];

const INTERESTS = [
  { key: 'interestEntertainment' as const, label: 'Entretenimento', domain: 'ENTERTAINMENT' },
  { key: 'interestSports' as const,        label: 'Esportes',       domain: 'SPORTS' },
  { key: 'interestCorporate' as const,     label: 'Corporativo',    domain: 'CORPORATE' },
  { key: 'interestEducation' as const,     label: 'Educação',       domain: 'EDUCATION' },
  { key: 'interestReligion' as const,      label: 'Religioso',      domain: 'RELIGIOUS' },
];

const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
// July 2026 starts on Wednesday (index 3)
const JULY_START_DOF = 3;
const JULY_DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

function dayToIso(day: number): string {
  return `2026-07-${String(day).padStart(2, '0')}T00:00:00.000Z`;
}

function buildRequest(form: FormState, orgId: string) {
  const placements: AdPlacement[] = [];
  if (form.placementFeed)     placements.push('FEED');
  if (form.placementDetail)   placements.push('EVENT_DETAIL');
  if (form.placementCheckout) placements.push('CHECKOUT');
  if (form.placementPost)     placements.push('POST_PURCHASE');

  const targetDomains = INTERESTS
    .filter((i) => form[i.key])
    .map((i) => i.domain);

  let frequencyCapMax: number | undefined;
  let frequencyCapWindow: FrequencyCapWindow | undefined;
  if (form.frequency === 'limit3') {
    frequencyCapMax = 3;
    frequencyCapWindow = 'day';
  } else if (form.frequency === 'once') {
    frequencyCapMax = 1;
    frequencyCapWindow = 'total';
  }

  return {
    organizationId: orgId,
    eventId: form.eventId || undefined,
    title: form.eventId ? '' : 'Novo Anúncio',
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
    startsAt: dayToIso(form.startDay ?? 1),
    endsAt: dayToIso(form.endDay ?? 31),
  };
}

export function CreateAdDrawer({ open, orgId, onClose }: CreateAdDrawerProps) {
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<FormState>(INITIAL);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const createMutation = useCreateAdMutation(orgId);

  const { data: myEvents = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['events', 'mine'],
    queryFn: () => eventsService.getMyEvents(),
    enabled: open,
    staleTime: 60_000,
  });

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  function handleClose() {
    setStep(1);
    setForm(INITIAL);
    setBannerFile(null);
    createMutation.reset();
    onClose();
  }

  function handleDayClick(day: number) {
    if (form.startDay === null || (form.startDay !== null && form.endDay !== null)) {
      set('startDay', day);
      set('endDay', null);
    } else {
      if (day < form.startDay) {
        set('startDay', day);
        set('endDay', null);
      } else {
        set('endDay', day);
      }
    }
  }

  async function handleSubmit() {
    if (!orgId) return;
    const payload = buildRequest(form, orgId);

    const selectedEvent = myEvents.find((e) => e.id === form.eventId);
    if (selectedEvent) {
      payload.title = `${selectedEvent.title} — ${payload.format === 'HORIZONTAL_728x90' ? 'Banner Topo' : 'Sidebar'}`;
    } else {
      payload.title = 'Novo Anúncio';
    }

    createMutation.mutate(payload, {
      onSuccess: async (created) => {
        if (bannerFile && created?.id) {
          setUploading(true);
          try {
            await advertisementsService.uploadBanner(created.id, bannerFile);
          } finally {
            setUploading(false);
          }
        }
        handleClose();
      },
    });
  }

  const canNext =
    step === 1 ? form.eventId !== '' || true  // allow no event
      : step === 2 ? form.startDay !== null && form.endDay !== null
      : true;

  return (
    <>
      {open && <div className={styles.overlay} onClick={handleClose} />}
      <div className={`${styles.drawer} ${open ? styles.drawerOpen : ''}`}>
        <div className={styles.drawerHeader}>
          <div>
            <h2 className={styles.drawerTitle}>Criar Anúncio</h2>
            <p className={styles.drawerSub}>Passo {step} de 3</p>
          </div>
          <button className={styles.closeBtn} onClick={handleClose} aria-label="Fechar">
            <X size={18} />
          </button>
        </div>

        <div className={styles.stepper}>
          {([1, 2, 3] as Step[]).map((s) => (
            <div key={s} className={styles.stepItem}>
              <div
                className={`${styles.stepCircle} ${step > s ? styles.stepDone : step === s ? styles.stepCurrent : styles.stepPending}`}
              >
                {step > s ? <Check size={12} /> : s}
              </div>
              <span className={`${styles.stepLabel} ${step === s ? styles.stepLabelCurrent : ''}`}>
                {s === 1 ? 'Formato' : s === 2 ? 'Segmentação' : 'Orçamento'}
              </span>
              {s < 3 && <div className={`${styles.stepLine} ${step > s ? styles.stepLineDone : ''}`} />}
            </div>
          ))}
        </div>

        <div className={styles.drawerBody}>
          {step === 1 && (
            <Step1
              form={form}
              set={set}
              events={myEvents}
              eventsLoading={eventsLoading}
              bannerFile={bannerFile}
              onBannerChange={setBannerFile}
            />
          )}
          {step === 2 && (
            <Step2 form={form} set={set} onDayClick={handleDayClick} />
          )}
          {step === 3 && <Step3 form={form} set={set} />}
        </div>

        {createMutation.isError && (
          <p className={styles.errorMsg}>Erro ao criar anúncio. Tente novamente.</p>
        )}

        <div className={styles.drawerFooter}>
          {step > 1 && (
            <button
              className={styles.backBtn}
              onClick={() => setStep((s) => (s - 1) as Step)}
              disabled={createMutation.isPending}
            >
              <ChevronLeft size={14} />
              Voltar
            </button>
          )}
          <button
            className={styles.nextBtn}
            disabled={!canNext || createMutation.isPending || uploading}
            onClick={() => {
              if (step < 3) setStep((s) => (s + 1) as Step);
              else void handleSubmit();
            }}
          >
            {(createMutation.isPending || uploading) ? (
              <><Loader2 size={14} className={styles.btnSpinner} /> {uploading ? 'Enviando banner...' : 'Criando...'}</>
            ) : step === 3 ? (
              'Criar Anúncio'
            ) : (
              <><span>Próximo</span><ChevronRight size={14} /></>
            )}
          </button>
        </div>
      </div>
    </>
  );
}

// ── Step sub-components ────────────────────────────────────────

function Step1({
  form,
  set,
  events,
  eventsLoading,
  bannerFile,
  onBannerChange,
}: {
  form: FormState;
  set: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  events: { id: string; title: string }[];
  eventsLoading: boolean;
  bannerFile: File | null;
  onBannerChange: (f: File | null) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const preview = bannerFile ? URL.createObjectURL(bannerFile) : null;

  return (
    <div className={styles.stepContent}>
      <section className={styles.section}>
        <label className={styles.sectionLabel}>BANNER DO ANÚNCIO</label>
        <div
          className={styles.bannerDrop}
          onClick={() => fileRef.current?.click()}
          style={preview ? { backgroundImage: `url(${preview})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
        >
          {!preview && (
            <>
              <ImagePlus size={24} className={styles.bannerIcon} />
              <span className={styles.bannerHint}>Clique para selecionar (JPG, PNG, WEBP · máx 5 MB)</span>
            </>
          )}
          {preview && (
            <button
              className={styles.bannerRemove}
              onClick={(e) => { e.stopPropagation(); onBannerChange(null); }}
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
            if (f && f.size <= 5 * 1024 * 1024) onBannerChange(f);
            e.target.value = '';
          }}
        />
      </section>

      <section className={styles.section}>
        <label className={styles.sectionLabel}>EVENTO (OPCIONAL)</label>
        <select
          className={styles.select}
          value={form.eventId}
          onChange={(e) => set('eventId', e.target.value)}
          disabled={eventsLoading}
        >
          <option value="">Sem evento específico</option>
          {events.map((ev) => (
            <option key={ev.id} value={ev.id}>{ev.title}</option>
          ))}
        </select>
      </section>

      <section className={styles.section}>
        <label className={styles.sectionLabel}>FORMATO DO ANÚNCIO</label>
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
      </section>

      <section className={styles.section}>
        <label className={styles.sectionLabel}>POSICIONAMENTO</label>
        <div className={styles.optionGrid}>
          {PLACEMENTS.map((p) => (
            <button
              key={p.key}
              type="button"
              className={`${styles.optionCard} ${form[p.key] ? styles.optionCardActive : ''}`}
              onClick={() => set(p.key, !form[p.key])}
            >
              <span className={`${styles.optionDot} ${styles.optionDotCheck}`} />
              <span className={styles.optionCardLabel}>{p.label}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function Step2({
  form,
  set,
  onDayClick,
}: {
  form: FormState;
  set: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  onDayClick: (day: number) => void;
}) {
  const inRange = (d: number) =>
    form.startDay !== null &&
    form.endDay !== null &&
    d >= form.startDay &&
    d <= form.endDay;

  return (
    <div className={styles.stepContent}>
      <section className={styles.section}>
        <label className={styles.sectionLabel}>PERÍODO DE EXIBIÇÃO — JULHO 2026</label>
        <div className={styles.calendar}>
          <div className={styles.calHead}>
            {DAY_LABELS.map((d) => (
              <span key={d} className={styles.calDow}>{d}</span>
            ))}
          </div>
          <div className={styles.calGrid}>
            {Array.from({ length: JULY_START_DOF }).map((_, i) => (
              <span key={`e${i}`} />
            ))}
            {JULY_DAYS.map((d) => (
              <button
                key={d}
                className={`${styles.calDay}
                  ${d === form.startDay ? styles.calDayStart : ''}
                  ${d === form.endDay ? styles.calDayEnd : ''}
                  ${inRange(d) && d !== form.startDay && d !== form.endDay ? styles.calDayRange : ''}
                `}
                onClick={() => onDayClick(d)}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
        {form.startDay && (
          <p className={styles.calSummary}>
            {form.endDay
              ? `${form.startDay}–${form.endDay} Jul 2026`
              : `Início: ${form.startDay} Jul — selecione o fim`}
          </p>
        )}
      </section>

      <section className={styles.section}>
        <label className={styles.sectionLabel}>INTERESSES DO PÚBLICO</label>
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
      </section>

      <section className={styles.section}>
        <label className={styles.sectionLabel}>FREQUÊNCIA</label>
        <div className={styles.optionGrid}>
          {(
            [
              { v: 'unlimited', label: 'Sem limite' },
              { v: 'limit3',    label: 'Máx 3× / dia' },
              { v: 'once',      label: '1× por usuário' },
            ] as const
          ).map((opt) => (
            <button
              key={opt.v}
              type="button"
              className={`${styles.optionCard} ${form.frequency === opt.v ? styles.optionCardActive : ''}`}
              onClick={() => set('frequency', opt.v)}
            >
              <span className={styles.optionDot} />
              <span className={styles.optionCardLabel}>{opt.label}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function Step3({ form, set }: { form: FormState; set: <K extends keyof FormState>(k: K, v: FormState[K]) => void }) {
  return (
    <div className={styles.stepContent}>
      <section className={styles.section}>
        <label className={styles.sectionLabel}>MODELO DE COBRANÇA</label>
        <div className={styles.billingCards}>
          {(
            [
              { v: 'cpm', label: 'CPM', sub: 'Custo por mil impressões' },
              { v: 'cpc', label: 'CPC', sub: 'Custo por clique' },
            ] as const
          ).map((opt) => (
            <button
              key={opt.v}
              className={`${styles.billingCard} ${form.billing === opt.v ? styles.billingCardActive : ''}`}
              onClick={() => set('billing', opt.v)}
            >
              <span className={styles.billingLabel}>{opt.label}</span>
              <span className={styles.billingSub}>{opt.sub}</span>
            </button>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <label className={styles.sectionLabel}>
          LANCE POR {form.billing === 'cpm' ? 'MIL IMPRESSÕES' : 'CLIQUE'} (R$)
        </label>
        <div className={styles.budgetRow}>
          <input
            type="range"
            min={form.billing === 'cpm' ? 5 : 1}
            max={form.billing === 'cpm' ? 100 : 20}
            step={form.billing === 'cpm' ? 5 : 0.5}
            value={form.bidAmount}
            className={styles.slider}
            onChange={(e) => set('bidAmount', Number(e.target.value))}
          />
          <span className={styles.budgetValue}>R$ {form.bidAmount.toFixed(2)}</span>
        </div>
      </section>

      <section className={styles.section}>
        <label className={styles.sectionLabel}>ORÇAMENTO DIÁRIO (R$)</label>
        <div className={styles.budgetRow}>
          <input
            type="range"
            min={10}
            max={500}
            step={10}
            value={form.dailyBudget}
            className={styles.slider}
            onChange={(e) => set('dailyBudget', Number(e.target.value))}
          />
          <span className={styles.budgetValue}>R$ {form.dailyBudget}</span>
        </div>
      </section>

      <section className={styles.section}>
        <label className={styles.sectionLabel}>LIMITE TOTAL (R$)</label>
        <div className={styles.budgetRow}>
          <input
            type="range"
            min={100}
            max={5000}
            step={50}
            value={form.totalLimit}
            className={styles.slider}
            onChange={(e) => set('totalLimit', Number(e.target.value))}
          />
          <span className={styles.budgetValue}>R$ {form.totalLimit}</span>
        </div>
      </section>

      <div className={styles.summary}>
        <p className={styles.summaryTitle}>RESUMO</p>
        <div className={styles.summaryGrid}>
          <SummaryRow label="FORMATO" value={form.format === 'h' ? 'Horizontal 728×90' : 'Vertical 300×600'} />
          <SummaryRow
            label="EXIBIÇÃO"
            value={
              [
                form.placementFeed     && 'Feed',
                form.placementDetail   && 'Detalhes',
                form.placementCheckout && 'Checkout',
                form.placementPost     && 'Pós-compra',
              ]
                .filter(Boolean)
                .join(', ') || '—'
            }
          />
          <SummaryRow
            label="SEGMENTAÇÃO"
            value={
              INTERESTS.filter((i) => form[i.key]).map((i) => i.label).join(', ') || '—'
            }
          />
          <SummaryRow
            label="PERÍODO"
            value={form.startDay && form.endDay ? `${form.startDay}–${form.endDay} Jul 2026` : '—'}
          />
          <SummaryRow
            label="FREQUÊNCIA"
            value={
              form.frequency === 'limit3' ? 'Máx 3× / dia'
              : form.frequency === 'once' ? '1× por usuário'
              : 'Sem limite'
            }
          />
          <SummaryRow label="LANCE" value={`R$ ${form.bidAmount.toFixed(2)} / ${form.billing === 'cpm' ? '1k imp.' : 'clique'}`} />
          <SummaryRow label="ORÇAMENTO" value={`R$ ${form.dailyBudget}/dia · Total R$ ${form.totalLimit}`} />
        </div>
      </div>
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
