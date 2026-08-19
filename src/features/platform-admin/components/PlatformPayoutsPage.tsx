'use client';

import { OrgBalancesCard } from '@/features/dashboard/components/OrgBalancesCard';
import { PlatformPageShell } from './PlatformPageShell';

// D3 — Payouts & saldos. Reuses the overview's fully-functional OrgBalancesCard
// (confirm-gated PAGAR + inline fee override, both audited); the page adds the
// header. Per-org ledger drawer is a follow-up.
export function PlatformPayoutsPage() {
  return (
    <PlatformPageShell
      group="FINANCEIRO · PAYOUTS"
      title="Payouts & saldos"
      subtitle="Saldos a pagar por organização. Pagamentos e overrides de taxa são auditados."
    >
      <OrgBalancesCard />
    </PlatformPageShell>
  );
}
