'use client';

import { isCpfOrCnpj } from '@live-show/api-contracts';
import styles from './CartCheckoutPageContent.module.scss';

interface Props {
  value: string;
  onChange: (next: { value: string; valid: boolean }) => void;
  labels: { label: string; hint: string; invalid: string };
}

// Controlled + stateless: the page owns the value so it can PATCH /auth/me
// right before placing the order.
export function BuyerDocumentField({ value, onChange, labels }: Props) {
  const valid = value === '' || isCpfOrCnpj(value);
  return (
    <div className={styles.buyerDoc}>
      <label htmlFor="buyer-document" className={styles.buyerDocLabel}>
        {labels.label}
      </label>
      <input
        id="buyer-document"
        className={styles.buyerDocInput}
        inputMode="numeric"
        autoComplete="off"
        value={value}
        onChange={(e) => onChange({ value: e.target.value, valid: e.target.value === '' || isCpfOrCnpj(e.target.value) })}
      />
      <span className={valid ? styles.buyerDocHint : styles.buyerDocError}>{valid ? labels.hint : labels.invalid}</span>
    </div>
  );
}
