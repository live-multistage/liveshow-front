'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, AlertCircle, Clock } from 'lucide-react';
import { useGetEventQuery, useListTicketProductsQuery, formatPrice } from '@/features/events';
import { useAuth } from '@/features/account';
import {
  useCreateCheckoutSessionMutation,
  useProcessPaymentMutation,
  usePaymentMethodsQuery,
} from '../mutations/checkout.mutations';
import type { CheckoutSession } from '../types/checkout.types';
import { EventSummaryCard } from './EventSummaryCard';
import { TicketSummaryCard } from './TicketSummaryCard';
import { OrderSummaryCard } from './OrderSummaryCard';
import { PaymentMethodSelector } from './PaymentMethodSelector';
import styles from './CheckoutPageContent.module.scss';

interface Props {
  eventId: string;
  ticketProductId: string;
  quantity?: number;
}

function handlePaymentAction(action: { type: string; url?: string }, router: ReturnType<typeof useRouter>, eventId: string) {
  if (action.type === 'REDIRECT' && action.url) {
    window.location.href = action.url;
  } else if (action.type === 'COMPLETED') {
    router.push(`/events/${eventId}/checkout/success`);
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
      { ticketProductId },
      { onSuccess: (s) => setSession(s) },
    );
  }, [isLoggedIn, ticketProductId]);

  const selectedMethod = paymentMethods.data?.find((m) => m.id === selectedMethodId);

  const handlePay = () => {
    if (!session || !selectedMethod) return;
    processPayment.mutate(
      { sessionId: session.sessionId, provider: selectedMethod.provider },
      {
        onSuccess: ({ action }) => handlePaymentAction(action as any, router, eventId),
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
          <div className={styles.skeleton} style={{ height: 120 }} />
          <div className={styles.skeleton} style={{ height: 80 }} />
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
          <button onClick={() => router.push(`/events/${eventId}`)} className={styles.backBtn}>
            Voltar ao evento
          </button>
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
        <h1 className={styles.title}>Finalizar compra</h1>

        {sessionExpiry && (
          <div className={styles.expiry}>
            <Clock size={13} />
            Sessão expira às {sessionExpiry.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
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
              disabled={!session || !selectedMethodId || processPayment.isPending}
              aria-busy={processPayment.isPending}
            >
              {processPayment.isPending
                ? 'Processando…'
                : session
                ? `Pagar ${formatPrice(session.totalAmount)}`
                : 'Aguardando sessão…'}
            </button>

            <div className={styles.secure}>
              <Shield size={13} />
              Pagamento seguro — seus dados são protegidos
            </div>
          </div>

          <aside className={styles.right}>
            <EventSummaryCard event={event.data} />
            <TicketSummaryCard ticket={ticket} quantity={quantity} />
            {session && <OrderSummaryCard session={session} />}
          </aside>
        </div>
      </div>
    </div>
  );
}
