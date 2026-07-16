'use client';

import { useState } from 'react';
import { usePlatformAdsQuery, useModerateAdMutation } from '../queries/get-platform-directory';
import type { PlatformAdRow } from '../types/platform-admin.types';
import { brlCompact } from '../utils/format';
import { PlatformPageShell } from './PlatformPageShell';
import { Pager } from './PlatformEventsPage';
import table from './PlatformTable.module.scss';

const STATUSES = ['REVIEW', 'ACTIVE', 'PAUSED', 'DRAFT', 'ENDED'];
const COLS = '2fr 1.3fr 0.9fr 1fr 1fr auto';

function statusBadge(s: string): string {
  if (s === 'ACTIVE') return table.badgeGreen;
  if (s === 'REVIEW') return table.badgeAmber;
  if (s === 'PAUSED') return table.badgeViolet;
  return table.badge;
}

const compact = (n: number) => (n < 1000 ? String(n) : `${(n / 1000).toFixed(1).replace('.', ',')}k`);

// D5 — Anúncios (moderação global de campanhas).
export function PlatformAdsPage() {
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const { data, isLoading } = usePlatformAdsQuery({ status: status || undefined, page });
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / (data?.limit ?? 20)));

  return (
    <PlatformPageShell
      group="OPERACIONAL · ADVERTISEMENTS"
      title="Anúncios"
      subtitle="Campanhas de todas as organizações. Aprovar tira da fila de revisão; pausar/retomar controla veiculação. Auditado."
      actions={
        <select className={table.filter} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} aria-label="Status">
          <option value="">Todos os status</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      }
    >
      <div className={table.card}>
        <div className={table.scroll}>
          <div className={table.head} style={{ gridTemplateColumns: COLS }}>
            <span>Campanha</span><span>Organização</span><span>Status</span><span className={table.right}>Impressões 30d</span><span className={table.right}>Gasto</span><span className={table.right}>Ações</span>
          </div>
          {isLoading && <div className={table.empty}>Carregando…</div>}
          {!isLoading && total === 0 && <div className={table.empty}>Nenhuma campanha para este filtro.</div>}
          {data?.items.map((a) => <AdRow key={a.id} a={a} />)}
        </div>
        {total > 0 && <Pager page={page} totalPages={totalPages} total={total} limit={data?.limit ?? 20} onPage={setPage} />}
      </div>
    </PlatformPageShell>
  );
}

function AdRow({ a }: { a: PlatformAdRow }) {
  const moderate = useModerateAdMutation();

  return (
    <div className={table.row} style={{ gridTemplateColumns: COLS }}>
      <span className={table.primary}>{a.name}</span>
      <span className={table.mono}>{a.orgName}</span>
      <span><span className={`${table.badge} ${statusBadge(a.status)}`}>{a.status}</span></span>
      <span className={`${table.mono} ${table.right}`}>{compact(a.impressions30d)}</span>
      <span className={`${table.mono} ${table.right}`}>{brlCompact(a.spend)}</span>
      <span className={table.actions}>
        {a.status === 'REVIEW' && (
          <button className={`${table.actionBtn} ${table.actionGreen}`} onClick={() => moderate.mutate({ id: a.id, action: 'APPROVE' })} disabled={moderate.isPending}>Aprovar</button>
        )}
        {a.status === 'ACTIVE' && (
          <button className={table.actionBtn} onClick={() => moderate.mutate({ id: a.id, action: 'PAUSE' })} disabled={moderate.isPending}>Pausar</button>
        )}
        {a.status === 'PAUSED' && (
          <button className={`${table.actionBtn} ${table.actionGreen}`} onClick={() => moderate.mutate({ id: a.id, action: 'RESUME' })} disabled={moderate.isPending}>Retomar</button>
        )}
      </span>
    </div>
  );
}
