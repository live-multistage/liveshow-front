'use client';

import { useTranslations } from 'next-intl';
import { Download, FileText } from 'lucide-react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@live-show/design-system';
import type { OrderStatus } from '@live-show/api-contracts';
import { useOrderFiscalDocumentQuery } from '../queries/get-order-fiscal-document';
import styles from './OrderFiscalDocumentButton.module.scss';

interface Props {
  orderId: string;
  orderStatus: OrderStatus;
}

export function OrderFiscalDocumentButton({ orderId, orderStatus }: Props) {
  const t = useTranslations('purchases.fiscal');
  const enabled = orderStatus === 'PAID' || orderStatus === 'REFUNDED';
  const { data, isLoading, isError, refetch } = useOrderFiscalDocumentQuery(orderId, enabled);

  if (!enabled) return <span className={styles.muted} />;
  if (isError) return <span className={styles.muted}>{t('failed')}</span>;
  if (isLoading || data === undefined) return <span className={styles.muted} aria-busy={isLoading} />;
  if (data === null || data.status === 'SKIPPED') return <span className={styles.muted}>{t('notIssued')}</span>;
  if (data.status === 'PENDING' || data.status === 'PROCESSING') return <span className={styles.muted}>{t('processing')}</span>;
  if (data.status === 'CANCELLED' || data.status === 'CANCELLING') return <span className={styles.muted}>{t('cancelled')}</span>;
  if (data.status !== 'AUTHORIZED') return <span className={styles.muted}>{t('failed')}</span>;

  return (
    <DropdownMenu onOpenChange={(open) => { if (open) void refetch(); }}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={styles.download}
          aria-label={t('download')}
          title={data.nfseNumber ? t('number', { number: data.nfseNumber }) : t('label')}
        >
          <Download size={15} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <a href={data.pdfUrl ?? '#'} target="_blank" rel="noreferrer">
            <FileText size={13} /> {t('pdf')}
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={data.xmlUrl ?? '#'} target="_blank" rel="noreferrer">
            <FileText size={13} /> {t('xml')}
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
