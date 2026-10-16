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
import type { OrganizationLedgerEntryType, OrganizationPayoutResult } from '../types/organization.types';
import type { AppError } from '@/lib/http/errors';
import styles from './LedgerBalanceSection.module.scss';

interface Props {
  orgId: string;
}

const LEDGER_TYPES: readonly string[] = [
  'SALE',
  'REFUND',
  'PAYOUT',
  'CLAWBACK',
  'AD_REVENUE',
  'DISPUTE',
  'ASAAS_SPLIT',
  'ASAAS_SPLIT_REVERSAL',
] satisfies OrganizationLedgerEntryType[];

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
  const balances = ledger.balances.length > 0 ? ledger.balances : [{ currency: 'BRL', balance: 0, available: 0, pending: 0 }];
  const hasBalance = ledger.balances.some((b) => b.balance > 0);
  const hasPending = ledger.balances.some((b) => b.pending > 0);
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
        if (result.pendingBalances?.some((p) => p.currency === currency)) {
          toast.error(t('withdrawErrorPending'));
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
            <span className={styles.balanceValue} data-negative={b.available < 0 || undefined}>
              {formatPrice(b.available, b.currency)}
            </span>
            {b.pending > 0 && (
              <span className={styles.pendingValue}>
                {t('ledgerPendingLabel', { amount: formatPrice(b.pending, b.currency) })}
              </span>
            )}
          </div>
          {b.available > 0 && (
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

      {hasPending && (
        <p className={styles.notice} data-variant="pending">
          {t('ledgerPendingHint')}
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
                {t(LEDGER_TYPES.includes(entry.type) ? `ledger${entry.type}` : 'ledgerOTHER')}
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

      {ledger.sales && (
        <section className={styles.sales}>
          <h3 className={styles.salesTitle}>{t('ledgerSalesTitle')}</h3>
          {ledger.sales.length === 0 ? (
            <p className={styles.zeroHint}>{t('ledgerSalesEmpty')}</p>
          ) : (
            <ul className={styles.entries}>
              {ledger.sales.map((sale) => (
                <li key={sale.paymentId} className={styles.sale}>
                  <span className={styles.entryDate}>{new Date(sale.soldAt).toLocaleDateString('pt-BR')}</span>
                  <span className={styles.entryType} data-type={sale.status === 'PAID' ? 'SALE' : undefined}>
                    {t(sale.status === 'PAID' ? 'ledgerSalePaid' : 'ledgerSaleRefunded')}
                  </span>
                  <span className={styles.saleSettlement}>
                    {t(sale.settlement === 'PAID_AT_SOURCE' ? 'ledgerSalePaidAtSource' : 'ledgerSalePlatformBalance')}
                  </span>
                  <span className={styles.saleAmounts}>
                    {sale.storeFee
                      ? t('ledgerSaleAmountsWithStoreFee', {
                          gross: formatPrice(sale.gross, sale.currency),
                          fee: formatPrice(sale.fee, sale.currency),
                          storeFee: formatPrice(sale.storeFee, sale.currency),
                          net: formatPrice(sale.net, sale.currency),
                        })
                      : t('ledgerSaleAmounts', {
                          gross: formatPrice(sale.gross, sale.currency),
                          fee: formatPrice(sale.fee, sale.currency),
                          net: formatPrice(sale.net, sale.currency),
                        })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <Dialog open={withdrawCurrency !== null} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('withdrawConfirmTitle')}</DialogTitle>
            <DialogDescription>
              {dialogBalance
                ? t('withdrawConfirmBody', { amount: formatPrice(dialogBalance.available, dialogBalance.currency) })
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
