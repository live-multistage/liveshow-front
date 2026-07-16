'use client';

import { useState } from 'react';
import { usePlatformCouponsQuery, useDeactivateCouponMutation } from '../queries/get-platform-directory';
import type { PlatformCouponRow } from '../types/platform-admin.types';
import { PlatformPageShell } from './PlatformPageShell';
import { Pager } from './PlatformEventsPage';
import table from './PlatformTable.module.scss';

const COLS = '1.4fr 1fr 0.9fr 1fr 1fr auto';
const SCOPE_LABEL: Record<PlatformCouponRow['scope'], string> = { global: 'Global', org: 'Por org', event: 'Por evento' };

function statusBadge(s: PlatformCouponRow['status']): string {
  if (s === 'ACTIVE') return table.badgeGreen;
  if (s === 'EXPIRED' || s === 'EXHAUSTED') return table.badgeAmber;
  return table.badge; // INACTIVE
}

function fmtDiscount(c: PlatformCouponRow): string {
  return c.discountType === 'PERCENT' || c.discountType === 'PERCENTAGE'
    ? `${c.discountValue.toString().replace('.', ',')}%`
    : `R$ ${c.discountValue.toFixed(2).replace('.', ',')}`;
}

function fmtExpiry(iso: string | null): string {
  if (!iso) return 'Sem validade';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

// D6 — Cupons (visão global de todas as orgs + kill switch anti-abuso).
export function PlatformCouponsPage() {
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const { data, isLoading } = usePlatformCouponsQuery({ status: status || undefined, q: q || undefined, page });
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / (data?.limit ?? 20)));

  return (
    <PlatformPageShell
      group="OPERACIONAL · CUPONS"
      title="Cupons"
      subtitle="Cupons de todas as organizações. Desativar é um kill switch anti-abuso, auditado."
      actions={
        <div className={table.filters}>
          <input className={table.search} placeholder="Buscar por código…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} aria-label="Buscar cupons" />
          <select className={table.filter} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} aria-label="Status">
            <option value="">Todos</option>
            <option value="active">Ativos</option>
            <option value="expired">Expirados</option>
            <option value="inactive">Desativados</option>
          </select>
        </div>
      }
    >
      <div className={table.card}>
        <div className={table.scroll}>
          <div className={table.head} style={{ gridTemplateColumns: COLS }}>
            <span>Código</span><span>Desconto</span><span>Escopo</span><span className={table.right}>Usos</span><span>Validade</span><span className={table.right}>Ações</span>
          </div>
          {isLoading && <div className={table.empty}>Carregando…</div>}
          {!isLoading && total === 0 && <div className={table.empty}>Nenhum cupom para este filtro.</div>}
          {data?.items.map((c) => <CouponRow key={c.id} c={c} />)}
        </div>
        {total > 0 && <Pager page={page} totalPages={totalPages} total={total} limit={data?.limit ?? 20} onPage={setPage} />}
      </div>
    </PlatformPageShell>
  );
}

function CouponRow({ c }: { c: PlatformCouponRow }) {
  const [confirm, setConfirm] = useState(false);
  const deactivate = useDeactivateCouponMutation(() => setConfirm(false));

  return (
    <div className={table.row} style={{ gridTemplateColumns: COLS }}>
      <span className={table.primary} style={{ fontFamily: "'Space Mono', monospace" }}>{c.code}</span>
      <span className={table.mono}>{fmtDiscount(c)}</span>
      <span className={table.mono}>{SCOPE_LABEL[c.scope]}</span>
      <span className={`${table.mono} ${table.right}`}>{c.usesCount}{c.maxUses != null ? `/${c.maxUses}` : ''}</span>
      <span className={table.mono}>
        {fmtExpiry(c.expiresAt)} <span className={`${table.badge} ${statusBadge(c.status)}`} style={{ marginLeft: 6 }}>{c.status}</span>
      </span>
      <span className={table.actions}>
        {c.isActive ? (
          confirm ? (
            <>
              <button className={`${table.actionBtn} ${table.actionDanger}`} onClick={() => deactivate.mutate(c.id)} disabled={deactivate.isPending}>{deactivate.isPending ? '…' : 'Confirmar'}</button>
              <button className={table.actionBtn} onClick={() => setConfirm(false)}>Não</button>
            </>
          ) : (
            <button className={`${table.actionBtn} ${table.actionDanger}`} onClick={() => setConfirm(true)}>Desativar</button>
          )
        ) : (
          <span className={table.sub}>—</span>
        )}
      </span>
    </div>
  );
}
