'use client';

import { useState } from 'react';
import { Tag, X, Loader2 } from 'lucide-react';
import { formatPrice } from '@/features/events';
import { useCouponPreviewMutation } from '../mutations/checkout.mutations';
import styles from './CouponInput.module.scss';

interface AppliedCoupon {
  code: string;
  discountAmount: number;
}

interface Props {
  eventId: string;
  orderAmount: number;
  applied: AppliedCoupon | null;
  onApply: (coupon: AppliedCoupon) => void;
  onRemove: () => void;
  disabled?: boolean;
}

export function CouponInput({ eventId, orderAmount, applied, onApply, onRemove, disabled }: Props) {
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const preview = useCouponPreviewMutation();

  const handleApply = () => {
    const code = input.trim().toUpperCase();
    if (!code) return;
    setError(null);
    preview.mutate(
      { code, eventId, orderAmount },
      {
        onSuccess: (result) => {
          onApply({ code, discountAmount: result.discountAmount });
          setInput('');
        },
        onError: (err: any) => {
          setError(err?.response?.data?.message ?? 'Cupom inválido ou expirado');
        },
      },
    );
  };

  if (applied) {
    return (
      <div className={styles.applied}>
        <Tag size={13} className={styles.tagIcon} />
        <span className={styles.appliedCode}>{applied.code}</span>
        <span className={styles.appliedDiscount}>−{formatPrice(applied.discountAmount)}</span>
        <button
          className={styles.removeBtn}
          onClick={onRemove}
          aria-label="Remover cupom"
          type="button"
        >
          <X size={13} />
        </button>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.row}>
        <input
          className={styles.input}
          placeholder="Código do cupom"
          value={input}
          onChange={(e) => {
            setInput(e.target.value.toUpperCase());
            setError(null);
          }}
          onKeyDown={(e) => e.key === 'Enter' && handleApply()}
          disabled={disabled || preview.isPending}
          maxLength={50}
          autoComplete="off"
          spellCheck={false}
        />
        <button
          className={styles.applyBtn}
          onClick={handleApply}
          disabled={disabled || !input.trim() || preview.isPending}
          type="button"
        >
          {preview.isPending ? <Loader2 size={14} className={styles.spin} /> : 'Aplicar'}
        </button>
      </div>
      {error && <p className={styles.errorMsg}>{error}</p>}
    </div>
  );
}
