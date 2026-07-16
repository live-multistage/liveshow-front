'use client';

import { useState } from 'react';
import { usePlatformEventsQuery, useModerateEventMutation } from '../queries/get-platform-directory';
import type { PlatformEventRow } from '../types/platform-admin.types';
import { PlatformPageShell } from './PlatformPageShell';
import table from './PlatformTable.module.scss';

const STATUSES = ['SCHEDULED', 'PUBLISHED', 'LIVE', 'FINISHED', 'CANCELLED', 'DRAFT'];
const COLS = '2.2fr 1.4fr 0.9fr 1fr auto';

function statusBadge(s: string): string {
  if (s === 'LIVE') return table.badgeRed;
  if (s === 'SCHEDULED' || s === 'PUBLISHED') return table.badgeGreen;
  if (s === 'CANCELLED') return table.badgeRed;
  if (s === 'DRAFT') return '';
  return table.badge;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' });
}

// D1 — Diretório de eventos (moderação global cross-org).
export function PlatformEventsPage() {
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = usePlatformEventsQuery({ status: status || undefined, q: q || undefined, page });
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / (data?.limit ?? 20)));

  return (
    <PlatformPageShell
      group="PLATAFORMA · MODERAÇÃO"
      title="Diretório de eventos"
      subtitle="Todos os eventos da plataforma. Despublicar volta ao rascunho; cancelar remove do ar. Ambos auditados."
      actions={
        <div className={table.filters}>
          <input
            className={table.search}
            placeholder="Buscar por título…"
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
            aria-label="Buscar eventos"
          />
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
            <span>Evento</span><span>Organização</span><span>Status</span><span>Data</span><span className={table.right}>Ações</span>
          </div>
          {isLoading && <div className={table.empty}>Carregando…</div>}
          {!isLoading && total === 0 && <div className={table.empty}>Nenhum evento para este filtro.</div>}
          {data?.items.map((e) => <EventRow key={e.id} e={e} />)}
        </div>
        {total > 0 && (
          <Pager page={page} totalPages={totalPages} total={total} limit={data?.limit ?? 20} onPage={setPage} />
        )}
      </div>
    </PlatformPageShell>
  );
}

function EventRow({ e }: { e: PlatformEventRow }) {
  const [confirm, setConfirm] = useState<'UNPUBLISH' | 'CANCEL' | null>(null);
  const moderate = useModerateEventMutation(() => setConfirm(null));
  const canUnpublish = e.status === 'SCHEDULED' || e.status === 'PUBLISHED';
  const canCancel = e.status !== 'FINISHED' && e.status !== 'CANCELLED';

  return (
    <div className={table.row} style={{ gridTemplateColumns: COLS }}>
      <span className={table.primary}>{e.title}</span>
      <span className={table.mono}>{e.orgName}</span>
      <span><span className={`${table.badge} ${statusBadge(e.status)}`}>{e.status}</span></span>
      <span className={table.mono}>{fmtDate(e.startsAt)}</span>
      <span className={table.actions}>
        {confirm ? (
          <>
            <button
              className={`${table.actionBtn} ${table.actionDanger}`}
              onClick={() => moderate.mutate({ id: e.id, action: confirm })}
              disabled={moderate.isPending}
            >
              {moderate.isPending ? '…' : 'Confirmar'}
            </button>
            <button className={table.actionBtn} onClick={() => setConfirm(null)}>Cancelar</button>
          </>
        ) : (
          <>
            <button className={table.actionBtn} onClick={() => setConfirm('UNPUBLISH')} disabled={!canUnpublish}>Despublicar</button>
            <button className={`${table.actionBtn} ${table.actionDanger}`} onClick={() => setConfirm('CANCEL')} disabled={!canCancel}>Remover</button>
          </>
        )}
      </span>
    </div>
  );
}

export function Pager({ page, totalPages, total, limit, onPage }: {
  page: number; totalPages: number; total: number; limit: number; onPage: (p: number) => void;
}) {
  return (
    <div className={table.pager}>
      <span className={table.pagerInfo}>{(page - 1) * limit + 1}–{Math.min(page * limit, total)} de {total}</span>
      <div className={table.pagerBtns}>
        <button className={table.pagerBtn} onClick={() => onPage(Math.max(1, page - 1))} disabled={page <= 1}>← Anterior</button>
        <button className={table.pagerBtn} onClick={() => onPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages}>Próxima →</button>
      </div>
    </div>
  );
}
