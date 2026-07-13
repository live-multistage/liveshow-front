'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Shield, AlertCircle, Clock } from 'lucide-react';
import { useGetEventQuery, useListTicketProductsQuery, formatPrice } from '@/features/events';
import { useAuth } from '@/features/account';
import {
  useCreateCheckoutSessionMutation,
  useProcessPaymentMutation,
  usePaymentMethodsQuery,
} from '../mutations/checkout.mutations';
import type { CheckoutSession } from '../types/checkout.types';
import { TicketSummaryCard } from './TicketSummaryCard';
import { OrderSummaryCard } from './OrderSummaryCard';
import { PaymentMethodSelector } from './PaymentMethodSelector';
import { CouponInput } from './CouponInput';
import styles from './CheckoutPageContent.module.scss';

interface Props {
  eventId: string;
  ticketProductId: string;
  quantity?: number;
}

interface SuccessSummary {
  name: string;
  ticket: string;
  total: number;
  qty: number;
}

interface AppliedCoupon {
  code: string;
  discountAmount: number;
}

function handlePaymentAction(
  action: { type: string; url?: string },
  router: ReturnType<typeof useRouter>,
  eventId: string,
  summary?: SuccessSummary,
) {
  if (action.type === 'REDIRECT' && action.url) {
    window.location.href = action.url;
  } else if (action.type === 'COMPLETED') {
    const base = `/events/${eventId}/checkout/success`;
    if (summary) {
      const q = new URLSearchParams({
        name: summary.name,
        ticket: summary.ticket,
        total: String(summary.total),
        qty: String(summary.qty),
      });
      router.push(`${base}?${q}`);
    } else {
      router.push(base);
    }
  } else {
    router.push(`/events/${eventId}/checkout/pending`);
  }
}

export function CheckoutPageContent({ eventId, ticketProductId, quantity = 1 }: Props) {
  const router = useRouter();
  const { isLoggedIn, isLoading: authLoading } = useAuth();

  const event = useGetEventQuery(eventId);
  const tickets = useListTicketProductsQuery(eventId);
  const ticket = tickets.data?.find((t) => t.id === ticketProductId);

  const [session, setSession] = useState<CheckoutSession | null>(null);
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);

  const paymentMethods = usePaymentMethodsQuery();
  const createSession = useCreateCheckoutSessionMutation();
  const processPayment = useProcessPaymentMutation();

  useEffect(() => {
    if (paymentMethods.data?.length && !selectedMethodId) {
      setSelectedMethodId(paymentMethods.data[0].id);
    }
  }, [paymentMethods.data]);

  useEffect(() => {
    if (!isLoggedIn && !authLoading) {
      router.replace(`/login?next=/events/${eventId}/checkout?ticketId=${ticketProductId}&qty=${quantity}`);
    }
  }, [isLoggedIn, authLoading, eventId, ticketProductId, quantity, router]);

  useEffect(() => {
    if (!isLoggedIn || !ticketProductId || session) return;
    createSession.mutate(
      { ticketProductId, couponCode: appliedCoupon?.code },
      { onSuccess: (s) => setSession(s) },
    );
  }, [isLoggedIn, ticketProductId, session]);

  const selectedMethod = paymentMethods.data?.find((m) => m.id === selectedMethodId);

  const handleCouponApply = (coupon: AppliedCoupon) => {
    setAppliedCoupon(coupon);
    setSession(null);
  };

  const handleCouponRemove = () => {
    setAppliedCoupon(null);
    setSession(null);
  };

  const handlePay = () => {
    if (!session || !selectedMethod) return;
    processPayment.mutate(
      { sessionId: session.sessionId, provider: selectedMethod.provider },
      {
        onSuccess: ({ action }) => handlePaymentAction(
          action as any,
          router,
          eventId,
          event.data && ticket && session
            ? { name: event.data.title, ticket: ticket.name, total: session.totalAmount, qty: quantity }
            : undefined,
        ),
        onError: () => router.push(`/events/${eventId}/checkout/failed`),
      },
    );
  };

  if (authLoading || !isLoggedIn) return null;

  const isLoading = event.isLoading || tickets.isLoading || createSession.isPending || paymentMethods.isLoading;

  if (isLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.skeleton} />
          <div className={`${styles.skeleton} ${styles.skeletonMd}`} />
          <div className={`${styles.skeleton} ${styles.skeletonSm}`} />
        </div>
      </div>
    );
  }

  if (!event.data || !ticket) {
    return (
      <div className={styles.page}>
        <div className={styles.error}>
          <AlertCircle size={32} />
          <p>Ingresso não encontrado.</p>
          <Link href={`/events/${eventId}`} className={styles.backBtn}>
            Voltar ao evento
          </Link>
        </div>
      </div>
    );
  }

  if (createSession.isError && !session) {
    return (
      <div className={styles.page}>
        <div className={styles.error}>
          <AlertCircle size={32} />
          <p>Erro ao iniciar checkout. Tente novamente.</p>
          <button
            onClick={() => createSession.mutate({ ticketProductId }, { onSuccess: setSession })}
            className={styles.backBtn}
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  const sessionExpiry = session ? new Date(session.expiresAt) : null;

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.breadcrumb}>CHECKOUT · ETAPA 2 DE 2</div>
        <h1 className={styles.title}>Finalizar compra</h1>

        {sessionExpiry && (
          <div className={styles.expiry}>
            <Clock size={13} />
            SESSÃO EXPIRA ÀS {sessionExpiry.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
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

            <CouponInput
              eventId={eventId}
              orderAmount={session?.totalAmount ?? 0}
              applied={appliedCoupon
                ? { code: appliedCoupon.code, discountAmount: session?.discountAmount ?? appliedCoupon.discountAmount }
                : null}
              onApply={handleCouponApply}
              onRemove={handleCouponRemove}
              disabled={!session}
            />

            <button
              className={styles.payBtn}
              onClick={handlePay}
              disabled={!session || !selectedMethodId || processPayment.isPending}
              aria-busy={processPayment.isPending}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                <rect x="4" y="10" width="16" height="11" rx="2"/>
                <path d="M8 10V7a4 4 0 0 1 8 0v3"/>
              </svg>
              {processPayment.isPending
                ? 'Processando…'
                : session
                ? `Pagar ${formatPrice(session.totalAmount)}`
                : 'Aguardando sessão…'}
            </button>

            <div className={styles.secure}>
              <Shield size={13} />
              PAGAMENTO SEGURO — SEUS DADOS SÃO PROTEGIDOS
            </div>
          </div>

          <aside className={styles.right}>
            <TicketSummaryCard ticket={ticket} quantity={quantity} eventName={event.data.title} />
            {session && <OrderSummaryCard session={session} discountAmount={session.discountAmount} />}
          </aside>
        </div>
      </div>
    </div>
  );
}
