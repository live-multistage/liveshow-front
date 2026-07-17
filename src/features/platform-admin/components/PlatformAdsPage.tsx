'use client';

import { useState } from 'react';
import {
  usePlatformAdsQuery,
  usePauseResumeAdMutation,
  useReviewConfigQuery,
  useSetReviewStrategyMutation,
} from '../queries/get-platform-directory';
import type { PlatformAdRow } from '../types/platform-admin.types';
import { brlCompact } from '../utils/format';
import { PlatformPageShell } from './PlatformPageShell';
import { Pager } from './PlatformEventsPage';
import { AdDetailDrawer } from './AdDetailDrawer';
import table from './PlatformTable.module.scss';

const STATUSES = ['REVIEW', 'ACTIVE', 'PAUSED', 'REJECTED', 'DRAFT', 'ENDED'];
const COLS = '2fr 1.3fr 0.9fr 1fr 1fr auto';

const STRATEGY_LABEL: Record<string, string> = {
  human: 'Humano', auto: 'Auto-aprovar', ai: 'IA / triagem',
};

function statusBadge(s: string): string {
  if (s === 'ACTIVE') return table.badgeGreen;
  if (s === 'REVIEW') return table.badgeAmber;
  if (s === 'PAUSED') return table.badgeViolet;
  if (s === 'REJECTED') return table.badgeRed;
  return table.badge;
}

const compact = (n: number) => (n < 1000 ? String(n) : `${(n / 1000).toFixed(1).replace('.', ',')}k`);

// D5 — Anúncios. Global directory + review pipeline: publishing enters REVIEW,
// a super-admin (or the active strategy) decides. Strategy is swappable here.
export function PlatformAdsPage() {
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [detailId, setDetailId] = useState<string | null>(null);

  const { data, isLoading } = usePlatformAdsQuery({ status: status || undefined, page });
  const config = useReviewConfigQuery();
  const setStrategy = useSetReviewStrategyMutation();
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / (data?.limit ?? 20)));

  return (
    <PlatformPageShell
      group="OPERACIONAL · ADVERTISEMENTS"
      title="Anúncios"
      subtitle="Ao publicar, o anúncio entra em revisão antes de ir ao ar. O revisor ativo decide — trocável abaixo."
      actions={
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
      }
    >
      <div className={table.card}>
        <div className={table.scroll}>
          <div className={table.head} style={{ gridTemplateColumns: COLS }}>
            <span>Campanha</span><span>Organização</span><span>Status</span><span className={table.right}>Impressões 30d</span><span className={table.right}>Gasto</span><span className={table.right}>Ações</span>
          </div>
          {isLoading && <div className={table.empty}>Carregando…</div>}
          {!isLoading && total === 0 && <div className={table.empty}>Nenhuma campanha para este filtro.</div>}
          {data?.items.map((a) => <AdRow key={a.id} a={a} onOpen={() => setDetailId(a.id)} />)}
        </div>
        {total > 0 && <Pager page={page} totalPages={totalPages} total={total} limit={data?.limit ?? 20} onPage={setPage} />}
      </div>

      {detailId && <AdDetailDrawer adId={detailId} onClose={() => setDetailId(null)} />}
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
