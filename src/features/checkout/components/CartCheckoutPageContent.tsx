'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, AlertCircle, Clock, Check, Ticket } from 'lucide-react';
import { formatPrice } from '@/features/events';
import { useAuth } from '@/features/account';
import { useCartQuery, CAPABILITY_LABELS, type CartLineView } from '@/features/cart';
import { checkoutService } from '../services/checkout.service';
import { usePaymentMethodsQuery } from '../mutations/checkout.mutations';
import type { CheckoutSession, PaymentProvider } from '../types/checkout.types';
import { PaymentMethodSelector } from './PaymentMethodSelector';
import styles from './CheckoutPageContent.module.scss';
import cartStyles from './CartCheckoutPageContent.module.scss';

export function CartCheckoutPageContent() {
  const router = useRouter();
  const { isLoggedIn, isLoading: authLoading } = useAuth();
  const { data: cart, isLoading: cartLoading } = useCartQuery();

  const items = cart?.items ?? [];

  const [sessions, setSessions] = useState<CheckoutSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState(false);
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);

  const paymentMethods = usePaymentMethodsQuery();

  useEffect(() => {
    if (paymentMethods.data?.length && !selectedMethodId) {
      setSelectedMethodId(paymentMethods.data[0].id);
    }
  }, [paymentMethods.data]);

  useEffect(() => {
    if (!isLoggedIn && !authLoading) {
      router.replace('/login?next=/checkout');
    }
  }, [isLoggedIn, authLoading, router]);

  useEffect(() => {
    if (!isLoggedIn || items.length === 0 || sessions.length > 0 || sessionsLoading) return;
    setSessionsLoading(true);
    Promise.all(
      items.map((item) =>
        checkoutService.createSession({ ticketProductId: item.ticketProductId }),
      ),
    )
      .then((result) => {
        setSessions(result);
        setSessionsLoading(false);
      })
      .catch(() => {
        setSessionsError(true);
        setSessionsLoading(false);
      });
  }, [isLoggedIn, items.length]);

  const selectedMethod = paymentMethods.data?.find((m) => m.id === selectedMethodId);

  const handlePay = async () => {
    if (sessions.length === 0 || !selectedMethod) return;
    setPaying(true);
    try {
      const results = await Promise.all(
        sessions.map((s) =>
          checkoutService.processPayment({
            sessionId: s.sessionId,
            provider: selectedMethod.provider as PaymentProvider,
          }),
        ),
      );
      const redirect = results.find((r) => r.action.type === 'REDIRECT');
      if (redirect && redirect.action.type === 'REDIRECT') {
        window.location.href = redirect.action.url;
        return;
      }
      router.push(`/events/${sessions[0].orderId}/checkout/success`);
    } catch {
      router.push('/');
    } finally {
      setPaying(false);
    }
  };

  const totalAmount = sessions.reduce((sum, s) => sum + s.totalAmount, 0);
  const isLoading = authLoading || cartLoading || sessionsLoading || paymentMethods.isLoading;

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

  if (sessionsError) {
    return (
      <div className={styles.page}>
        <div className={styles.error}>
          <AlertCircle size={32} />
          <p>Erro ao iniciar checkout. Tente novamente.</p>
          <button
            onClick={() => { setSessionsError(false); setSessions([]); }}
            className={styles.backBtn}
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  const earliestExpiry =
    sessions.length > 0
      ? new Date(Math.min(...sessions.map((s) => new Date(s.expiresAt).getTime())))
      : null;

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <h1 className={styles.title}>Finalizar compra</h1>

        {earliestExpiry && (
          <div className={styles.expiry}>
            <Clock size={13} />
            Sessão expira às{' '}
            {earliestExpiry.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
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
              disabled={sessions.length === 0 || !selectedMethodId || paying}
              aria-busy={paying}
            >
              {paying
                ? 'Processando…'
                : sessions.length > 0
                  ? `Pagar ${formatPrice(totalAmount)}`
                  : 'Aguardando sessão…'}
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

            {sessions.length > 0 && (
              <div className={cartStyles.totals}>
                <div className={cartStyles.totalRow}>
                  <span>Total</span>
                  <span className={cartStyles.totalValue}>{formatPrice(totalAmount)}</span>
                </div>
              </div>
            )}
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
