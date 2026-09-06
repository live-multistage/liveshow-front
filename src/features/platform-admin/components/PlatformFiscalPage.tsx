'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@live-show/design-system';
import { formatCents } from '@/shared/utils/money';
import { useFiscalDocumentsQuery } from '../queries/get-fiscal-documents';
import { useRetryFiscalDocumentMutation } from '../mutations/retry-fiscal-document.mutation';
import type { FiscalDocumentAdminRow, FiscalDocumentStatus } from '../types/platform-admin.types';
import { PlatformPageShell } from './PlatformPageShell';
import { Pager } from './PlatformEventsPage';
import styles from './PlatformTable.module.scss';

const COLS = '1fr 1.2fr 0.9fr 0.9fr 0.9fr 1.3fr 1fr auto';

const STATUSES: FiscalDocumentStatus[] = [
  'PENDING',
  'PROCESSING',
  'AUTHORIZED',
  'REJECTED',
  'SKIPPED',
  'CANCELLING',
  'CANCELLED',
  'CANCEL_FAILED',
];

const RETRYABLE: FiscalDocumentStatus[] = ['REJECTED', 'CANCEL_FAILED'];
const LIMIT = 25;

export function PlatformFiscalPage() {
  const t = useTranslations('platformAdmin.fiscal');
  const tc = useTranslations('common');
  const [status, setStatus] = useState<FiscalDocumentStatus | ''>('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [retryTarget, setRetryTarget] = useState<FiscalDocumentAdminRow | null>(null);

  const { data, isLoading } = useFiscalDocumentsQuery({
    status: status || undefined,
    from: from || undefined,
    to: to || undefined,
    page,
    limit: LIMIT,
  });
  const retry = useRetryFiscalDocumentMutation();

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / (data?.limit ?? LIMIT)));

  function confirmRetry() {
    if (!retryTarget) return;
    retry.mutate(retryTarget.id, {
      onSuccess: () => {
        toast.success(t('retrySuccess'));
        setRetryTarget(null);
      },
      onError: () => {
        toast.error(t('retryError'));
        setRetryTarget(null);
      },
    });
  }

  return (
    <PlatformPageShell
      group="FINANCEIRO · FISCAL"
      title={t('title')}
      subtitle={t('subtitle')}
      actions={
        <div className={styles.filters}>
          <select
            className={styles.filter}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as FiscalDocumentStatus | '');
              setPage(1);
            }}
            aria-label={t('filters.status')}
          >
            <option value="">{t('filters.all')}</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`status.${s}`)}
              </option>
            ))}
          </select>
          <input
            type="date"
            className={styles.filter}
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(1);
            }}
            aria-label={t('filters.from')}
          />
          <input
            type="date"
            className={styles.filter}
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setPage(1);
            }}
            aria-label={t('filters.to')}
          />
        </div>
      }
    >
      <div className={styles.card}>
        <div className={styles.scroll}>
          <div className={styles.head} style={{ gridTemplateColumns: COLS }}>
            <span>{t('columns.order')}</span>
            <span>{t('columns.buyer')}</span>
            <span>{t('columns.amount')}</span>
            <span>{t('columns.status')}</span>
            <span>{t('columns.number')}</span>
            <span>{t('columns.error')}</span>
            <span>{t('columns.updated')}</span>
            <span className={styles.right}>{t('retry')}</span>
          </div>

          {isLoading && <div className={styles.empty}>{tc('loading')}</div>}
          {!isLoading && total === 0 && <div className={styles.empty}>{t('empty')}</div>}

          {data?.items.map((row) => (
            <div className={styles.row} key={row.id} style={{ gridTemplateColumns: COLS }}>
              <span className={styles.mono}>{row.orderId}</span>
              <span>{row.takerName}</span>
              <span className={styles.mono}>{formatCents(row.amountCents, row.currency)}</span>
              <span>{t(`status.${row.status}`)}</span>
              <span className={styles.mono}>{row.nfseNumber ?? '—'}</span>
              <span className={styles.sub}>{row.lastErrorMessage ?? '—'}</span>
              <span className={styles.mono}>{new Date(row.updatedAt).toLocaleString('pt-BR')}</span>
              <span className={styles.right}>
                {RETRYABLE.includes(row.status) && (
                  <Button variant="outline" size="sm" onClick={() => setRetryTarget(row)}>
                    {t('retry')}
                  </Button>
                )}
              </span>
            </div>
          ))}
        </div>

        {total > 0 && <Pager page={page} totalPages={totalPages} total={total} limit={data?.limit ?? LIMIT} onPage={setPage} />}
      </div>

      <Dialog open={retryTarget !== null} onOpenChange={(open) => !open && setRetryTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{retryTarget ? t('retryConfirm', { order: retryTarget.orderId }) : ''}</DialogTitle>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRetryTarget(null)} disabled={retry.isPending}>
              {tc('cancel')}
            </Button>
            <Button onClick={confirmRetry} disabled={retry.isPending}>
              {retry.isPending ? tc('loading') : tc('confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PlatformPageShell>
  );
}
