import { CreditCard, QrCode, Wallet, Smartphone } from 'lucide-react';
import type { PaymentMethod, PaymentMethodType } from '../types/checkout.types';
import styles from './PaymentMethodSelector.module.scss';

const METHOD_ICONS: Record<PaymentMethodType, React.ReactNode> = {
  PIX: <QrCode size={19} />,
  CREDIT_CARD: <CreditCard size={19} />,
  DEBIT_CARD: <CreditCard size={19} />,
  GOOGLE_PAY: <Smartphone size={19} />,
  APPLE_PAY: <Smartphone size={19} />,
  STRIPE: <Wallet size={19} />,
};

interface Props {
  methods: PaymentMethod[];
  selected: string | null;
  onChange: (id: string) => void;
  isLoading?: boolean;
}

export function PaymentMethodSelector({ methods, selected, onChange, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className={styles.wrap}>
        <p className={styles.label}>Forma de Pagamento</p>
        <div className={styles.skeleton} />
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <p className={styles.label}>Forma de Pagamento</p>
      <div className={styles.list} role="radiogroup" aria-label="Forma de pagamento">
        {methods.map((method) => {
          const isSelected = selected === method.id;
          return (
            <button
              key={method.id}
              role="radio"
              aria-checked={isSelected}
              onClick={() => onChange(method.id)}
              className={`${styles.method} ${isSelected ? styles.methodSelected : ''}`}
            >
              {isSelected && <span className={styles.selectedGlow} aria-hidden />}
              <span className={`${styles.methodIcon} ${isSelected ? styles.methodIconSelected : ''}`}>
                {METHOD_ICONS[method.type]}
              </span>
              <span className={`${styles.methodName} ${isSelected ? styles.methodNameSelected : ''}`}>
                {method.displayName}
              </span>
              <span className={`${styles.radio} ${isSelected ? styles.radioActive : ''}`} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
