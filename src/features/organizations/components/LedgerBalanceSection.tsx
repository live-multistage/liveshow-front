'use client';

import { useTranslations } from 'next-intl';
import { Wallet } from 'lucide-react';
import { useOrganizationLedger } from '../hooks/use-organization-ledger';
import { useStripeStatus } from '../hooks/use-stripe-status';
import { formatPrice } from '@/features/events/utils/event-formatters';
import styles from './LedgerBalanceSection.module.scss';

interface Props {
  orgId: string;
}

const LEDGER_TYPE_KEYS = ['SALE','REFUND','PAYOUT'];

const MAX_ENTRIES = 5;

export function LedgerBalanceSection({ orgId }: Props) {
  const t = useTranslations('organizations');
  const { data: ledger, isLoading, isError } = useOrganizationLedger(orgId);
  const { data: stripeStatus } = useStripeStatus(orgId);

  if (isLoading) {
    return <p className={styles.loading}>Carregando saldo retido...</p>;
  }

  if (isError || !ledger) {
    return <p className={styles.error}>Não foi possível carregar o saldo retido.</p>;
  }

  // Org sempre vendeu com Stripe conectado: nada retido, nada a mostrar.
  if (ledger.balances.length === 0 && ledger.entries.length === 0) {
    return null;
  }

  const stripeReady = Boolean(stripeStatus?.hasAccount && stripeStatus?.onboardingComplete);
  const hasBalance = ledger.balances.some((b) => b.balance > 0);
  const hasDebt = ledger.balances.some((b) => b.balance < 0);
  const recentEntries = ledger.entries.slice(0, MAX_ENTRIES);

  return (
    <div className={styles.container}>
      {ledger.balances.map((b) => (
        <div className={styles.balanceRow} key={b.currency}>
          <span className={styles.balanceIcon}>
            <Wallet size={18} aria-hidden />
          </span>
          <div className={styles.balanceInfo}>
            <span className={styles.balanceLabel}>Saldo retido ({b.currency})</span>
            <span className={styles.balanceValue} data-negative={b.balance < 0 || undefined}>
              {formatPrice(b.balance, b.currency)}
            </span>
          </div>
        </div>
      ))}

      {hasBalance && (
        <p className={styles.notice} data-variant={stripeReady ? 'ready' : 'pending'}>
          {stripeReady
            ? t('ledgerStripeOk')
            : t('ledgerStripePending')}
        </p>
      )}

      {hasDebt && (
        <p className={styles.notice} data-variant="debt">
          Saldo negativo: reembolsos após repasse. O valor será abatido das próximas vendas.
        </p>
      )}

      {recentEntries.length > 0 && (
        <ul className={styles.entries}>
          {recentEntries.map((entry) => (
            <li key={entry.id} className={styles.entry}>
              <span className={styles.entryType} data-type={entry.type}>
                {LEDGER_TYPE_KEYS.includes(entry.type) ? t(`ledger${entry.type}`) : entry.type}
              </span>
              <span className={styles.entryDate}>
                {new Date(entry.createdAt).toLocaleDateString('pt-BR')}
              </span>
              <span className={styles.entryAmount} data-negative={entry.amount < 0 || undefined}>
                {formatPrice(entry.amount, entry.currency)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
