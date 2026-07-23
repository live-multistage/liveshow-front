'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { usePlatformEventsQuery, useApproveAccessibilityMutation } from '../queries/get-platform-directory';
import type { PlatformEventRow } from '../types/platform-admin.types';
import { PlatformPageShell } from './PlatformPageShell';
import { EventDetailDrawer } from './EventDetailDrawer';
import table from './PlatformTable.module.scss';

// Filter chips (mirrors the organization directory). Each maps to a status or
// a moderation-seal filter; TODOS clears both.
const FILTERS: { key: string; label: string; status?: string; moderation?: string }[] = [
  { key: 'ALL', label: 'Todos' },
  { key: 'DRAFT', label: 'Rascunho', status: 'DRAFT' },
  { key: 'PUBLISHED', label: 'Publicados', status: 'PUBLISHED' },
  { key: 'SCHEDULED', label: 'Agendados', status: 'SCHEDULED' },
  { key: 'LIVE', label: 'Ao vivo', status: 'LIVE' },
  { key: 'FINISHED', label: 'Finalizados', status: 'FINISHED' },
  { key: 'CANCELLED', label: 'Cancelados', status: 'CANCELLED' },
  { key: 'REJECTED', label: 'Rejeitados', moderation: 'REJECTED' },
];
const COLS = '1.8fr 1.1fr 0.7fr 0.8fr 1.05fr 0.85fr auto';

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
  const t = useTranslations('platformAdmin');
  const [filterKey, setFilterKey] = useState('ALL');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [detailId, setDetailId] = useState<string | null>(null);

  const active = FILTERS.find((f) => f.key === filterKey) ?? FILTERS[0];
  const { data, isLoading } = usePlatformEventsQuery({
    status: active.status,
    moderation: active.moderation,
    q: q || undefined,
    page,
  });
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / (data?.limit ?? 20)));
  // Derive the open row from the live query so a moderation/accessibility
  // action (which invalidates & refetches the list) updates the drawer too —
  // a captured row object would stay stale.
  const detailRow = detailId ? data?.items.find((e) => e.id === detailId) ?? null : null;

  return (
    <PlatformPageShell
      group="PLATAFORMA · MODERAÇÃO"
      title="Diretório de eventos"
      subtitle="Todos os eventos da plataforma. Publique, despublique, aprove ou rejeite; abra um evento para ver todos os detalhes."
      actions={
        <div className={table.filters}>
          <input
            className={table.search}
            placeholder={t('eventSearchPlaceholder')}
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
            aria-label={t('searchEvents')}
          />
        </div>
      }
    >
      <div className={table.chips}>
        {FILTERS.map((f) => {
          const on = f.key === filterKey;
          return (
            <button
              key={f.key}
              className={on ? `${table.chip} ${table.chipActive}` : table.chip}
              onClick={() => { setFilterKey(f.key); setPage(1); }}
            >
              {f.label.toUpperCase()}
              {on && data && <span className={`${table.chipCount} ${table.chipCountActive}`}>{total}</span>}
            </button>
          );
        })}
      </div>

      <div className={table.card}>
        <div className={table.scroll}>
          <div className={table.head} style={{ gridTemplateColumns: COLS }}>
            <span>Evento</span><span>Organização</span><span>Status</span><span>Data</span><span>Acessibilidade</span><span>Moderação</span><span className={table.right}>Ações</span>
          </div>
          {isLoading && <div className={table.empty}>Carregando…</div>}
          {!isLoading && total === 0 && <div className={table.empty}>Nenhum evento para este filtro.</div>}
          {data?.items.map((e) => <EventRow key={e.id} e={e} onOpen={() => setDetailId(e.id)} />)}
        </div>
        {total > 0 && (
          <Pager page={page} totalPages={totalPages} total={total} limit={data?.limit ?? 20} onPage={setPage} />
        )}
      </div>

      {detailRow && <EventDetailDrawer event={detailRow} onClose={() => setDetailId(null)} />}
    </PlatformPageShell>
  );
}

function AccessibilityCell({ e }: { e: PlatformEventRow }) {
  const approve = useApproveAccessibilityMutation();
  if (!e.publiclyFunded) return <span className={table.mono}>—</span>;
  if (e.accessibilityApproved) return <span className={`${table.badge} ${table.badgeGreen}`}>Aprovado</span>;
  if (!e.hasLibrasCamera) return <span className={table.badge} title="Organizador ainda não marcou a Janela de Libras">Sem Libras</span>;
  return (
    <button
      className={table.actionBtn}
      onClick={() => approve.mutate(e.id)}
      disabled={approve.isPending}
      title="Aprovar acessibilidade (NBR 15290)"
    >
      {approve.isPending ? '…' : 'Aprovar Libras'}
    </button>
  );
}

function ModerationSeal({ e }: { e: PlatformEventRow }) {
  if (e.moderationStatus === 'APPROVED') {
    return <span className={`${table.badge} ${table.badgeGreen}`}>Aprovado</span>;
  }
  if (e.moderationStatus === 'REJECTED') {
    return (
      <span className={`${table.badge} ${table.badgeRed}`} title={e.moderationReason ?? 'Rejeitado'}>
        Rejeitado
      </span>
    );
  }
  return <span className={table.mono}>—</span>;
}

function EventRow({ e, onOpen }: { e: PlatformEventRow; onOpen: () => void }) {
  return (
    <div className={table.row} style={{ gridTemplateColumns: COLS }}>
      <span className={table.primary}>
        <button className={table.primaryLink} onClick={onOpen}>{e.title}</button>
      </span>
      <span className={table.mono}>{e.orgName}</span>
      <span><span className={`${table.badge} ${statusBadge(e.status)}`}>{e.status}</span></span>
      <span className={table.mono}>{fmtDate(e.startsAt)}</span>
      <span><AccessibilityCell e={e} /></span>
      <span><ModerationSeal e={e} /></span>
      <span className={table.actions}>
        <button className={table.actionBtn} onClick={onOpen}>Detalhes</button>
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
