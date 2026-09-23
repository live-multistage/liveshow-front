'use client';

import { useRef, useState, type KeyboardEvent } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  usePlatformAdsQuery,
  usePauseResumeAdMutation,
  useReviewConfigQuery,
  useSetReviewStrategyMutation,
} from '../queries/get-platform-directory';
import { useHouseAdsQuery } from '../house-ads/queries/house-ads.queries';
import type { HouseAdListItem, HouseAdPriority, HouseAdStatus } from '../house-ads/types/house-ads.types';
import type { PlatformAdRow } from '../types/platform-admin.types';
import { brlCompact } from '../utils/format';
import { PlatformPageShell } from './PlatformPageShell';
import { Pager } from './PlatformEventsPage';
import { AdDetailDrawer } from './AdDetailDrawer';
import { HouseAdsTab } from './HouseAdsTab';
// F3's create/edit wizard — imported by direct path per the branch's
// file-ownership split (see HouseAdWizardDialogProps doc comment).
import { HouseAdWizardDialog } from './house-ads-wizard/HouseAdWizardDialog';
import table from './PlatformTable.module.scss';
import styles from './PlatformAdsPage.module.scss';

const STATUSES = ['REVIEW', 'ACTIVE', 'PAUSED', 'REJECTED', 'DRAFT', 'ENDED'];
const COLS = '2fr 1.3fr 0.9fr 1fr 1fr auto';

const STRATEGY_LABEL: Record<string, string> = {
  human: 'Humano', auto: 'Auto-aprovar', ai: 'IA / triagem',
};

const HOUSE_AD_STATUSES: HouseAdStatus[] = ['DRAFT', 'ACTIVE', 'PAUSED', 'ENDED'];
const HOUSE_AD_PRIORITIES: HouseAdPriority[] = ['PRIORITY', 'FILL'];
const HOUSE_AD_PRIORITY_LABEL: Record<HouseAdPriority, string> = { PRIORITY: 'Prioritário', FILL: 'Preenchimento' };
const HA_LIMIT = 20;

function statusBadge(s: string): string {
  if (s === 'ACTIVE') return table.badgeGreen;
  if (s === 'REVIEW') return table.badgeAmber;
  if (s === 'PAUSED') return table.badgeViolet;
  if (s === 'REJECTED') return table.badgeRed;
  return table.badge;
}

const compact = (n: number) => (n < 1000 ? String(n) : `${(n / 1000).toFixed(1).replace('.', ',')}k`);

type Tab = 'review' | 'house-ads';
const TABS: { key: Tab; label: string }[] = [
  { key: 'review', label: 'Revisão' },
  { key: 'house-ads', label: 'Anúncios da plataforma' },
];

// D5 — Anúncios. Global directory + review pipeline (unchanged behaviour) in
// the "Revisão" tab; "Anúncios da plataforma" is the new house-ads tab (F2).
// The active tab lives in the URL (?tab=house-ads) so reload/back keep it.
export function PlatformAdsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab: Tab = searchParams.get('tab') === 'house-ads' ? 'house-ads' : 'review';
  const tabRefs = useRef<Partial<Record<Tab, HTMLButtonElement | null>>>({});

  const selectTab = (next: Tab) => router.replace(next === 'house-ads' ? `${pathname}?tab=house-ads` : pathname);

  const onTabKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const nextIndex = e.key === 'ArrowRight' ? (index + 1) % TABS.length : (index - 1 + TABS.length) % TABS.length;
    const next = TABS[nextIndex].key;
    selectTab(next);
    tabRefs.current[next]?.focus();
  };

  // Revisão — untouched state/queries.
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<{ id: string; orgName: string } | null>(null);

  const { data, isLoading } = usePlatformAdsQuery({ status: status || undefined, page });
  const config = useReviewConfigQuery();
  const setStrategy = useSetReviewStrategyMutation();
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / (data?.limit ?? 20)));

  // Anúncios da plataforma — new state/query.
  const [haStatus, setHaStatus] = useState<HouseAdStatus | ''>('');
  const [haPriority, setHaPriority] = useState<HouseAdPriority | ''>('');
  const [haPage, setHaPage] = useState(1);
  const houseAds = useHouseAdsQuery({
    status: haStatus || undefined,
    priority: haPriority || undefined,
    page: haPage,
    limit: HA_LIMIT,
  });
  const haTotal = houseAds.data?.total ?? 0;
  const haHasFilter = haStatus !== '' || haPriority !== '';
  const clearHaFilter = () => { setHaStatus(''); setHaPriority(''); setHaPage(1); };

  // Create/edit wizard (F3) — shared by the shell's "Novo anúncio" button,
  // the list's empty state and each row's "Editar" action.
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editingAd, setEditingAd] = useState<HouseAdListItem | null>(null);
  const openCreateWizard = () => { setEditingAd(null); setWizardOpen(true); };
  const openEditWizard = (ad: HouseAdListItem) => { setEditingAd(ad); setWizardOpen(true); };

  return (
    <PlatformPageShell
      group="OPERACIONAL · ADVERTISEMENTS"
      title="Anúncios"
      subtitle={
        tab === 'review'
          ? 'Ao publicar, o anúncio entra em revisão antes de ir ao ar. O revisor ativo decide — trocável abaixo.'
          : 'Anúncios da própria showon.io, sem custo e sem conta de anunciante.'
      }
      actions={
        tab === 'review' ? (
          <div className={table.filters}>
            <label className={table.filterLabel}>
              <span>Revisor</span>
              <select
                className={table.filter}
                value={config.data?.strategy ?? 'human'}
                onChange={(e) => setStrategy.mutate(e.target.value)}
                disabled={setStrategy.isPending || !config.data}
                aria-label="Estratégia de revisão ativa"
              >
                {(config.data?.strategies ?? ['human']).map((s) => (
                  <option key={s} value={s}>{STRATEGY_LABEL[s] ?? s}</option>
                ))}
              </select>
            </label>
            <select className={table.filter} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} aria-label="Status">
              <option value="">Todos os status</option>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        ) : (
          <div className={table.filters}>
            <select
              className={table.filter}
              value={haStatus}
              onChange={(e) => { setHaStatus(e.target.value as HouseAdStatus | ''); setHaPage(1); }}
              aria-label="Status"
            >
              <option value="">Todos os status</option>
              {HOUSE_AD_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select
              className={table.filter}
              value={haPriority}
              onChange={(e) => { setHaPriority(e.target.value as HouseAdPriority | ''); setHaPage(1); }}
              aria-label="Prioridade"
            >
              <option value="">Todas as prioridades</option>
              {HOUSE_AD_PRIORITIES.map((p) => <option key={p} value={p}>{HOUSE_AD_PRIORITY_LABEL[p]}</option>)}
            </select>
            <button className={styles.primary} onClick={openCreateWizard}>+ Novo anúncio</button>
          </div>
        )
      }
    >
      <div role="tablist" aria-label="Anúncios" className={styles.tabs}>
        {TABS.map((t, i) => (
          <button
            key={t.key}
            ref={(el) => { tabRefs.current[t.key] = el; }}
            id={`ads-tab-${t.key}`}
            role="tab"
            type="button"
            aria-selected={tab === t.key}
            aria-controls={`ads-tabpanel-${t.key}`}
            tabIndex={tab === t.key ? 0 : -1}
            className={styles.tab}
            onClick={() => selectTab(t.key)}
            onKeyDown={(e) => onTabKeyDown(e, i)}
          >
            {t.label}
            <span className={styles.tabCount}>{t.key === 'review' ? total : haTotal}</span>
          </button>
        ))}
      </div>

      {tab === 'review' && (
        <div id="ads-tabpanel-review" role="tabpanel" aria-labelledby="ads-tab-review">
          <div className={table.card}>
            <div className={table.scroll}>
              <div className={table.head} style={{ gridTemplateColumns: COLS }}>
                <span>Campanha</span><span>Organização</span><span>Status</span><span className={table.right}>Impressões 30d</span><span className={table.right}>Gasto</span><span className={table.right}>Ações</span>
              </div>
              {isLoading && <div className={table.empty}>Carregando…</div>}
              {!isLoading && total === 0 && <div className={table.empty}>Nenhuma campanha para este filtro.</div>}
              {data?.items.map((a) => <AdRow key={a.id} a={a} onOpen={() => setDetail({ id: a.id, orgName: a.orgName })} />)}
            </div>
            {total > 0 && <Pager page={page} totalPages={totalPages} total={total} limit={data?.limit ?? 20} onPage={setPage} />}
          </div>
        </div>
      )}

      {tab === 'house-ads' && (
        <div id="ads-tabpanel-house-ads" role="tabpanel" aria-labelledby="ads-tab-house-ads">
          <HouseAdsTab
            items={houseAds.data?.items ?? []}
            total={haTotal}
            page={haPage}
            limit={HA_LIMIT}
            onPage={setHaPage}
            isLoading={houseAds.isLoading}
            isError={houseAds.isError}
            onRetry={houseAds.refetch}
            hasFilter={haHasFilter}
            onClearFilter={clearHaFilter}
            onCreate={openCreateWizard}
            onEdit={openEditWizard}
          />
        </div>
      )}

      {detail && <AdDetailDrawer adId={detail.id} orgName={detail.orgName} onClose={() => setDetail(null)} />}
      <HouseAdWizardDialog open={wizardOpen} onOpenChange={setWizardOpen} ad={editingAd} />
    </PlatformPageShell>
  );
}

function AdRow({ a, onOpen }: { a: PlatformAdRow; onOpen: () => void }) {
  const pauseResume = usePauseResumeAdMutation();

  return (
    <div className={table.row} style={{ gridTemplateColumns: COLS }}>
      <span className={table.primary}>{a.name}</span>
      <span className={table.mono}>{a.orgName}</span>
      <span><span className={`${table.badge} ${statusBadge(a.status)}`}>{a.status}</span></span>
      <span className={`${table.mono} ${table.right}`}>{compact(a.impressions30d)}</span>
      <span className={`${table.mono} ${table.right}`}>{brlCompact(a.spend)}</span>
      <span className={table.actions}>
        {a.status === 'REVIEW' && (
          <button className={`${table.actionBtn} ${table.actionGreen}`} onClick={onOpen}>Revisar</button>
        )}
        {a.status === 'ACTIVE' && (
          <button className={table.actionBtn} onClick={() => pauseResume.mutate({ id: a.id, action: 'pause' })} disabled={pauseResume.isPending}>Pausar</button>
        )}
        {a.status === 'PAUSED' && (
          <button className={`${table.actionBtn} ${table.actionGreen}`} onClick={() => pauseResume.mutate({ id: a.id, action: 'resume' })} disabled={pauseResume.isPending}>Retomar</button>
        )}
        <button className={table.actionBtn} onClick={onOpen}>Detalhes</button>
      </span>
    </div>
  );
}
