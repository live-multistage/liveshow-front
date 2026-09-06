'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Wallet } from 'lucide-react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@live-show/design-system';
import { useOrganizationLedger } from '../hooks/use-organization-ledger';
import { useStripeStatus } from '../hooks/use-stripe-status';
import { useWithdrawLedgerBalance, classifyWithdrawError } from '../hooks/use-withdraw-ledger-balance';
import { formatPrice } from '@/features/events/utils/event-formatters';
import type { OrganizationPayoutResult } from '../types/organization.types';
import type { AppError } from '@/lib/http/errors';
import styles from './LedgerBalanceSection.module.scss';

interface Props {
  orgId: string;
}

const LEDGER_TYPE_KEYS = ['SALE', 'REFUND', 'PAYOUT'];

const MAX_ENTRIES = 5;

export function LedgerBalanceSection({ orgId }: Props) {
  const t = useTranslations('organizations');
  const { data: ledger, isLoading, isError } = useOrganizationLedger(orgId);
  const { data: stripeStatus } = useStripeStatus(orgId);
  const withdraw = useWithdrawLedgerBalance(orgId);
  const [withdrawCurrency, setWithdrawCurrency] = useState<string | null>(null);

  if (isLoading) {
    return <p className={styles.loading}>{t('ledgerLoading')}</p>;
  }

  if (isError || !ledger) {
    return <p className={styles.error}>{t('ledgerError')}</p>;
  }

  const stripeReady = Boolean(stripeStatus?.hasAccount && stripeStatus?.onboardingComplete);
  const balances = ledger.balances.length > 0 ? ledger.balances : [{ currency: 'BRL', balance: 0 }];
  const hasBalance = ledger.balances.some((b) => b.balance > 0);
  const hasDebt = ledger.balances.some((b) => b.balance < 0);
  const recentEntries = ledger.entries.slice(0, MAX_ENTRIES);
  const pendingRow = withdraw.isPending ? withdrawCurrency : null;

  function closeDialog() {
    if (withdraw.isPending) return;
    setWithdrawCurrency(null);
  }

  function confirmWithdraw() {
    const currency = withdrawCurrency;
    if (!currency) return;
    withdraw.mutate(undefined, {
      onSuccess: (result: OrganizationPayoutResult) => {
        setWithdrawCurrency(null);
        const paid = result.payouts.find((p) => p.currency === currency);
        if (paid) {
          toast.success(t('withdrawSuccess', { amount: formatPrice(paid.amount, paid.currency) }));
          return;
        }
        const failedEntry = result.failed.find((f) => f.currency === currency);
        if (failedEntry) {
          toast.error(t('withdrawErrorUnexpected'));
          return;
        }
        const held = result.heldCurrencies?.find((h) => h.currency === currency);
        if (held) {
          toast.error(t('withdrawErrorHeld'));
          return;
        }
        toast.error(t('withdrawErrorUnexpected'));
      },
      onError: (error: AppError) => {
        setWithdrawCurrency(null);
        const reason = classifyWithdrawError(error);
        toast.error(t(`withdrawError${reason.charAt(0).toUpperCase()}${reason.slice(1)}`));
      },
    });
  }

  const dialogBalance = withdrawCurrency
    ? balances.find((b) => b.currency === withdrawCurrency)
    : undefined;

  return (
    <div className={styles.container}>
      {balances.map((b) => (
        <div className={styles.balanceRow} key={b.currency}>
          <span className={styles.balanceIcon}>
            <Wallet size={18} aria-hidden />
          </span>
          <div className={styles.balanceInfo}>
            <span className={styles.balanceLabel}>{t('ledgerBalanceLabel', { currency: b.currency })}</span>
            <span className={styles.balanceValue} data-negative={b.balance < 0 || undefined}>
              {formatPrice(b.balance, b.currency)}
            </span>
          </div>
          {b.balance > 0 && (
            <Button
              variant="outline"
              size="sm"
              className={styles.withdrawButton}
              onClick={() => setWithdrawCurrency(b.currency)}
              disabled={withdraw.isPending}
            >
              {pendingRow === b.currency ? t('withdrawing') : t('withdrawButton')}
            </Button>
          )}
        </div>
      ))}

      {ledger.balances.length === 0 && <p className={styles.zeroHint}>{t('ledgerZeroHint')}</p>}

      {hasBalance && (
        <p className={styles.notice} data-variant={stripeReady ? 'ready' : 'pending'}>
          {stripeReady ? t('ledgerStripeOk') : t('ledgerStripePending')}
        </p>
      )}

      {hasDebt && (
        <p className={styles.notice} data-variant="debt">
          {t('ledgerDebtNotice')}
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

      <Dialog open={withdrawCurrency !== null} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('withdrawConfirmTitle')}</DialogTitle>
            <DialogDescription>
              {dialogBalance
                ? t('withdrawConfirmBody', { amount: formatPrice(dialogBalance.balance, dialogBalance.currency) })
                : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={withdraw.isPending}>
              {t('withdrawConfirmCancel')}
            </Button>
            <Button onClick={confirmWithdraw} disabled={withdraw.isPending}>
              {withdraw.isPending ? t('withdrawing') : t('withdrawConfirmAction')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
