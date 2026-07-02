'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, AlertCircle, Check, Ticket } from 'lucide-react';
import { formatPrice } from '@/features/events';
import { useAuth } from '@/features/account';
import { useCartQuery, CAPABILITY_LABELS, type CartLineView } from '@/features/cart';
import { checkoutService } from '../services/checkout.service';
import { usePaymentMethodsQuery } from '../mutations/checkout.mutations';
import type { PaymentProvider } from '../types/checkout.types';
import { PaymentMethodSelector } from './PaymentMethodSelector';
import { AdBanner } from '@/features/advertisements';
import styles from './CheckoutPageContent.module.scss';
import cartStyles from './CartCheckoutPageContent.module.scss';

export function CartCheckoutPageContent() {
  const router = useRouter();
  const { isLoggedIn, isLoading: authLoading } = useAuth();
  const { data: cart, isLoading: cartLoading } = useCartQuery();

  const items = cart?.items ?? [];
  const totalAmount = cart?.totals.total ?? 0;

  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState(false);

  const paymentMethods = usePaymentMethodsQuery();

  const selectedMethod = paymentMethods.data?.find((m) => m.id === selectedMethodId);

  const handlePay = async () => {
    if (!selectedMethod || items.length === 0) return;
    setPaying(true);
    setPayError(false);
    try {
      const result = await checkoutService.createCartSession({
        items: items.map((i) => ({ ticketProductId: i.ticketProductId, eventId: i.eventId })),
        provider: selectedMethod.provider as PaymentProvider,
      });
      window.location.href = result.url;
    } catch {
      setPayError(true);
      setPaying(false);
    }
  };

  const isLoading = authLoading || cartLoading || paymentMethods.isLoading;

  if (!isLoggedIn && !authLoading) return null;

  if (isLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.skeleton} />
          <div className={styles.skeleton} style={{ height: 120 }} />
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className={styles.page}>
        <div className={styles.error}>
          <AlertCircle size={32} />
          <p>Seu carrinho está vazio.</p>
          <button onClick={() => router.push('/events')} className={styles.backBtn}>
            Explorar eventos
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <h1 className={styles.title}>Finalizar compra</h1>

        {payError && (
          <div className={styles.error} style={{ marginBottom: '1rem' }}>
            <AlertCircle size={20} />
            <p>Erro ao iniciar pagamento. Tente novamente.</p>
          </div>
        )}

        <div className={styles.layout}>
          <div className={styles.left}>
            <PaymentMethodSelector
              methods={paymentMethods.data ?? []}
              selected={selectedMethodId}
              onChange={setSelectedMethodId}
              isLoading={paymentMethods.isLoading}
            />

            <button
              className={styles.payBtn}
              onClick={handlePay}
              disabled={!selectedMethodId || paying || items.length === 0}
              aria-busy={paying}
            >
              {paying ? 'Processando…' : `Pagar ${formatPrice(totalAmount)}`}
            </button>

            <div className={styles.secure}>
              <Shield size={13} />
              Pagamento seguro — seus dados são protegidos
            </div>
          </div>

          <aside className={styles.right}>
            {items.map((item) => (
              <CartItemCard key={item.eventId} item={item} />
            ))}

            <AdBanner placement="CHECKOUT" />

            <div className={cartStyles.totals}>
              {(cart?.totals.lines ?? []).map((line) => (
                <div key={line.key} className={cartStyles.totalRow}>
                  <span>{line.label}</span>
                  <span>{formatPrice(line.amount)}</span>
                </div>
              ))}
              <div className={cartStyles.totalRow}>
                <span>Total</span>
                <span className={cartStyles.totalValue}>{formatPrice(totalAmount)}</span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function CartItemCard({ item }: { item: CartLineView }) {
  return (
    <div className={cartStyles.itemCard}>
      <div className={cartStyles.itemHeader}>
        <Ticket size={14} className={cartStyles.itemIcon} />
        <p className={cartStyles.itemEvent}>{item.eventTitle}</p>
      </div>
      <div className={cartStyles.itemBody}>
        <p className={cartStyles.itemTicket}>{item.ticketName}</p>
        <span className={cartStyles.itemPrice}>{formatPrice(item.price)}</span>
      </div>
      {item.capabilities.length > 0 && (
        <ul className={cartStyles.itemCaps}>
          {item.capabilities.map((c) => (
            <li key={c} className={cartStyles.itemCap}>
              <Check size={11} />
              {CAPABILITY_LABELS[c]}
            </li>
          ))}
          {item.camerasLimit != null && (
            <li className={cartStyles.itemCap}>
              <Check size={11} />
              {item.camerasLimit} câmeras
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
