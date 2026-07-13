'use client';

import { Wallet } from 'lucide-react';
import { useOrganizationLedger } from '../hooks/use-organization-ledger';
import { useStripeStatus } from '../hooks/use-stripe-status';
import type { OrganizationLedgerEntry } from '../types/organization.types';
import styles from './LedgerBalanceSection.module.scss';

interface Props {
  orgId: string;
}

const ENTRY_LABEL: Record<OrganizationLedgerEntry['type'], string> = {
  SALE: 'Venda',
  REFUND: 'Reembolso',
  PAYOUT: 'Repasse',
};

const MAX_ENTRIES = 5;

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function LedgerBalanceSection({ orgId }: Props) {
  const { data: ledger, isLoading, isError } = useOrganizationLedger(orgId);
  const { data: stripeStatus } = useStripeStatus(orgId);

  if (isLoading) {
    return <p className={styles.loading}>Carregando saldo retido...</p>;
  }

  if (isError || !ledger) {
    return <p className={styles.error}>Não foi possível carregar o saldo retido.</p>;
  }

  // Org sempre vendeu com Stripe conectado: nada retido, nada a mostrar.
  if (ledger.balance === 0 && ledger.entries.length === 0) {
    return null;
  }

  const stripeReady = Boolean(stripeStatus?.hasAccount && stripeStatus?.onboardingComplete);
  const hasBalance = ledger.balance > 0;
  const recentEntries = ledger.entries.slice(0, MAX_ENTRIES);

  return (
    <div className={styles.container}>
      <div className={styles.balanceRow}>
        <span className={styles.balanceIcon}>
          <Wallet size={18} aria-hidden />
        </span>
        <div className={styles.balanceInfo}>
          <span className={styles.balanceLabel}>Saldo retido</span>
          <span className={styles.balanceValue} data-negative={ledger.balance < 0 || undefined}>
            {formatBRL(ledger.balance)}
          </span>
        </div>
      </div>

      {hasBalance && (
        <p className={styles.notice} data-variant={stripeReady ? 'ready' : 'pending'}>
          {stripeReady
            ? 'Sua conta Stripe está conectada. Este valor será repassado pela equipe LiveShow.'
            : 'Vendas realizadas antes de conectar o Stripe ficam retidas. Conecte sua conta Stripe acima para receber este valor.'}
        </p>
      )}

      {ledger.balance < 0 && (
        <p className={styles.notice} data-variant="debt">
          Saldo negativo: reembolsos após repasse. O valor será abatido das próximas vendas.
        </p>
      )}

      {recentEntries.length > 0 && (
        <ul className={styles.entries}>
          {recentEntries.map((entry) => (
            <li key={entry.id} className={styles.entry}>
              <span className={styles.entryType} data-type={entry.type}>
                {ENTRY_LABEL[entry.type]}
              </span>
              <span className={styles.entryDate}>
                {new Date(entry.createdAt).toLocaleDateString('pt-BR')}
              </span>
              <span className={styles.entryAmount} data-negative={entry.amount < 0 || undefined}>
                {formatBRL(entry.amount)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
