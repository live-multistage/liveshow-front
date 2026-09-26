'use client';

import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { Pagination } from '@live-show/design-system';
import { useOrgBalancesQuery } from '@/features/platform-admin/queries/get-finance';
import { usePayoutOrgMutation } from '@/features/platform-admin/mutations/payout-org.mutation';
import { useSetOrgFeeOverrideMutation } from '@/features/platform-admin/mutations/set-org-fee-override.mutation';
import { brlCompact, ratePct } from '@/features/platform-admin/utils/format';
import type { OrgBalance } from '@/features/platform-admin/types/platform-admin.types';
import styles from './SuperAdminDashboard.module.scss';

// Org ledger balances (design: "Saldos das organizações"). Financial F3:
// per-row payout (PAGAR, confirm-gated) and inline fee-rate override — both
// audited on the backend.

// ponytail: paged client-side. The endpoint returns every org with a ledger
// entry in one 30s-cached response (hundreds of rows, a small payload) already
// sorted by balance — the problem this fixes is the page-long scroll, not the
// transfer. Past a few thousand orgs this wants a server-side page instead.
const PAGE_SIZE = 10;

export function OrgBalancesCard() {
  const t = useTranslations('dashboard');
  const { data, isLoading } = useOrgBalancesQuery();
  const [page, setPage] = useState(1);

  const total = data?.length ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  // A refetch that shrinks the list must not strand the view on a page that no
  // longer exists.
  const current = Math.min(page, pageCount);
  const rows = useMemo(
    () => (data ?? []).slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE),
    [data, current],
  );

  return (
    <div className={styles.finCard}>
      <div className={styles.finHeader}>
        <div>
          <div className={styles.finEyebrow}>FINANCEIRO · PAYOUTS</div>
          <div className={styles.finTitle}>Saldos das organizações</div>
        </div>
      </div>

      <div className={styles.balHead}>
        <span>{t('organization')}</span>
        <span>{t('rate')}</span>
        <span className={styles.balRight}>A receber</span>
      </div>

      {isLoading && <div className={styles.balEmpty}>Carregando…</div>}
      {!isLoading && !data?.length && <div className={styles.balEmpty}>Nenhum saldo registrado.</div>}

      <div>
        {rows.map((b) => (
          <BalanceRow key={b.orgId} b={b} />
        ))}
      </div>

      {total > PAGE_SIZE && (
        <div className={styles.cardPager}>
          <span className={styles.cardPagerRange}>
            {t('pagination.range', {
              from: (current - 1) * PAGE_SIZE + 1,
              to: Math.min(current * PAGE_SIZE, total),
              total,
            })}
          </span>
          <Pagination
            page={current}
            pageCount={pageCount}
            onPageChange={setPage}
            labels={{
              prev: t('pagination.prev'),
              next: t('pagination.next'),
              nav: t('pagination.nav'),
              prevAria: t('pagination.prevAria'),
              nextAria: t('pagination.nextAria'),
            }}
          />
        </div>
      )}
    </div>
  );
}

function BalanceRow({ b }: { b: OrgBalance }) {
  const [editingRate, setEditingRate] = useState(false);
  const [rateInput, setRateInput] = useState(() => (b.rate * 100).toString().replace('.', ','));
  const [confirmPay, setConfirmPay] = useState(false);

  const payout = usePayoutOrgMutation(() => setConfirmPay(false));
  const setOverride = useSetOrgFeeOverrideMutation(() => setEditingRate(false));

  const canPay = b.balance > 0;

  function saveRate() {
    const parsed = Number(rateInput.replace(',', '.'));
    // Blank/invalid clears the override (back to platform default).
    const rate = rateInput.trim() === '' || Number.isNaN(parsed) ? null : parsed / 100;
    setOverride.mutate({ orgId: b.orgId, rate });
  }

  return (
    <div className={styles.balRow}>
      <span className={styles.balName}>{b.name}</span>

      <span className={styles.balRate}>
        {editingRate ? (
          <input
            className={styles.balRateInput}
            autoFocus
            value={rateInput}
            onChange={(e) => setRateInput(e.target.value)}
            onBlur={saveRate}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveRate();
              if (e.key === 'Escape') setEditingRate(false);
            }}
            disabled={setOverride.isPending}
            aria-label={`Taxa de ${b.name} (%)`}
          />
        ) : (
          <button type="button" className={styles.balRateBtn} onClick={() => setEditingRate(true)}>
            {ratePct(b.rate)}
            {b.override && <span className={styles.balOvr}>OVR</span>}
          </button>
        )}
      </span>

      <span className={styles.balPayCell}>
        <span className={styles.balValue}>{brlCompact(b.balance)}</span>
        {confirmPay ? (
          <button
            type="button"
            className={styles.balPayConfirm}
            onClick={() => payout.mutate(b.orgId)}
            disabled={payout.isPending}
          >
            {payout.isPending ? '…' : 'Confirmar'}
          </button>
        ) : (
          <button
            type="button"
            className={styles.balPayBtn}
            onClick={() => setConfirmPay(true)}
            disabled={!canPay}
          >
            PAGAR
          </button>
        )}
      </span>
    </div>
  );
}
