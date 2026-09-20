'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { toast } from 'sonner';
import { Copy, Check, Clock, ArrowLeft } from 'lucide-react';
import { useCountdown } from '../hooks/use-countdown';
import { formatCents } from '@/shared/utils/money';
import type { PixQrAction } from '../types/checkout.types';
import styles from './PixPaymentPanel.module.scss';

interface Props {
  // Optional so the CARREGANDO state can render before the action has
  // arrived — see `isLoading`.
  action?: PixQrAction;
  amount: number;
  currency: string;
  /** Shows the shimmer skeleton (design's "CARREGANDO" artboard) instead of the QR/button. */
  isLoading?: boolean;
}

export function PixPaymentPanel({ action, amount, currency, isLoading = false }: Props) {
  const t = useTranslations('checkout');
  const [copied, setCopied] = useState(false);
  const { label, isExpired } = useCountdown(action?.expiresAt);

  async function handleCopy() {
    if (!action) return;
    try {
      await navigator.clipboard.writeText(action.copyPaste);
      setCopied(true);
    } catch {
      toast.error(t('pix.copyError'));
    }
  }

  if (isLoading || !action) {
    return (
      <div className={styles.card}>
        <div className={styles.eyebrow}>{t('pix.payWithPix')}</div>
        <div className={styles.totalLabel}>{t('pix.totalLabel')}</div>
        <div className={styles.totalValue}>{formatCents(amount, currency)}</div>
        <div className={styles.skeletonQr} />
        <div className={styles.skeletonButton} />
        <div className={styles.loadingRow}>
          <span className={styles.loadingDot} />
          {t('pix.generating')}
        </div>
      </div>
    );
  }

  if (isExpired) {
    return (
      <div className={styles.card}>
        <div className={`${styles.eyebrow} ${styles.muted}`}>{t('pix.payWithPix')}</div>
        <div className={styles.totalLabel}>{t('pix.totalLabel')}</div>
        <div className={`${styles.totalValue} ${styles.muted}`}>{formatCents(amount, currency)}</div>
        <div className={styles.qrBox}>
          <img
            className={`${styles.qrImage} ${styles.dimmed}`}
            src={`data:image/png;base64,${action.qrCodeImage}`}
            alt={t('pix.qrAlt')}
          />
          <div className={styles.expiredOverlay}>
            <span className={styles.expiredBadge}>{t('pix.expiredBadge')}</span>
          </div>
        </div>
        <div className={styles.expiredTitle}>{t('pix.expiredTitle')}</div>
        <div className={styles.expiredDesc}>{t('pix.expiredDesc')}</div>
        <Link href="/checkout" className={styles.backButton}>
          <ArrowLeft size={17} />
          {t('pix.backToCheckout')}
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <div className={styles.eyebrow}>{t('pix.payWithPix')}</div>
      <div className={styles.totalLabel}>{t('pix.totalLabel')}</div>
      <div className={styles.totalValue}>{formatCents(amount, currency)}</div>
      <div className={styles.qrBox}>
        <img
          className={styles.qrImage}
          src={`data:image/png;base64,${action.qrCodeImage}`}
          alt={t('pix.qrAlt')}
        />
      </div>
      <div className={styles.actionArea}>
        {copied ? (
          <button type="button" className={styles.copiedButton} onClick={handleCopy}>
            <Check size={18} />
            {t('pix.copied')}
          </button>
        ) : (
          <button type="button" className={styles.copyButton} onClick={handleCopy}>
            <Copy size={17} />
            {t('pix.copyButton')}
          </button>
        )}
      </div>
      <div className={styles.expiry}>
        <Clock size={13} />
        <span>{t('pix.expiresIn')}</span>
        <span>{label}</span>
      </div>
      <div className={styles.waiting}>
        <span className={styles.waitingDot} />
        {t('pix.waiting')}
      </div>
      {!copied && (
        <>
          <div className={styles.divider} />
          <ol className={styles.steps}>
            <li className={styles.step}>
              <span className={styles.stepNumber}>1</span>
              {t('pix.step1')}
            </li>
            <li className={styles.step}>
              <span className={styles.stepNumber}>2</span>
              {t('pix.step2')}
            </li>
            <li className={styles.step}>
              <span className={styles.stepNumber}>3</span>
              {t('pix.step3')}
            </li>
          </ol>
        </>
      )}
      <div className={styles.backLink}>
        <Link href="/checkout">{t('pix.backToCheckout')}</Link>
      </div>
    </div>
  );
}
