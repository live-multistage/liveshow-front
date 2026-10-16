'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, Clock, Ticket, ArrowRight, Compass, XCircle } from 'lucide-react';
import { formatPrice } from '@/features/events';
import { AdBanner } from '@/features/advertisements';
import { useAnalytics } from '@/lib/analytics/tracking';
import { useOrderQuery } from '../mutations/checkout.mutations';
import type { OrderStatus, OrderView } from '../types/checkout.types';
import styles from './CheckoutSuccessContent.module.scss';
import resultStyles from './CheckoutResultContent.module.scss';

const NOT_COMPLETED_COPY: Record<Exclude<OrderStatus, 'PAID' | 'PENDING'>, { title: string; desc: string }> = {
  EXPIRED: {
    title: 'Pagamento não concluído',
    desc: 'O prazo para pagar este pedido expirou e nenhuma cobrança foi confirmada. Seus ingressos continuam no carrinho.',
  },
  CANCELLED: {
    title: 'Pagamento não concluído',
    desc: 'Este pedido foi cancelado e nenhuma cobrança foi confirmada. Seus ingressos continuam no carrinho.',
  },
  REFUNDED: {
    title: 'Pedido reembolsado',
    desc: 'O pagamento deste pedido foi devolvido e os ingressos não estão mais ativos.',
  },
};

// Landing here (Stripe's success_url, or a COMPLETED action) does not mean the
// buyer paid — only the order the webhook settled says so.
export function CheckoutSuccessContent() {
  const params = useSearchParams();
  const orderId = params.get('orderId');
  const orderQuery = useOrderQuery(orderId);
  const order = orderQuery.data;

  if (!orderId || orderQuery.isError) return <OrderUnverifiable />;
  if (!order || order.status === 'PENDING') {
    return <ConfirmingPayment pollingExpired={orderQuery.pollingExpired} />;
  }
  if (order.status === 'PAID') return <PaidOrder order={order} />;
  return <PaymentNotCompleted {...NOT_COMPLETED_COPY[order.status]} />;
}

function ResultCard({
  icon,
  iconClass,
  title,
  children,
}: {
  icon: ReactNode;
  iconClass: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className={resultStyles.page}>
      <div className={resultStyles.card}>
        <div className={`${resultStyles.icon} ${iconClass}`}>{icon}</div>
        <h1 className={resultStyles.title}>{title}</h1>
        {children}
      </div>
    </div>
  );
}

function ConfirmingPayment({ pollingExpired }: { pollingExpired: boolean }) {
  return (
    <ResultCard icon={<Clock size={40} />} iconClass={resultStyles.iconPending} title="Confirmando pagamento">
      {pollingExpired ? (
        <p className={resultStyles.desc}>
          A confirmação está demorando mais que o normal. Seus ingressos aparecem em Meus ingressos assim que o
          pagamento for aprovado.
        </p>
      ) : (
        <>
          <p className={resultStyles.desc}>Estamos aguardando a confirmação do pagamento. Isso leva poucos segundos.</p>
          <div className={resultStyles.pendingNote}>
            <span className={resultStyles.pendingDot} />
            Verificando pagamento…
          </div>
        </>
      )}
      <div className={resultStyles.actions}>
        <Link href="/tickets" className={resultStyles.secondary}>
          Ver meus ingressos
        </Link>
      </div>
    </ResultCard>
  );
}

function PaymentNotCompleted({ title, desc }: { title: string; desc: string }) {
  return (
    <ResultCard icon={<XCircle size={40} />} iconClass={resultStyles.iconFailed} title={title}>
      <p className={resultStyles.desc}>{desc}</p>
      <div className={resultStyles.actions}>
        <Link href="/checkout" className={resultStyles.primary}>
          Voltar ao checkout
        </Link>
        <Link href="/events" className={resultStyles.secondary}>
          Explorar eventos
        </Link>
      </div>
    </ResultCard>
  );
}

function OrderUnverifiable() {
  return (
    <ResultCard icon={<Clock size={40} />} iconClass={resultStyles.iconPending} title="Não foi possível verificar o pedido">
      <p className={resultStyles.desc}>
        Confira em Meus ingressos se a compra foi concluída. Se o pagamento foi aprovado, seus ingressos estarão lá.
      </p>
      <div className={resultStyles.actions}>
        <Link href="/tickets" className={resultStyles.primary}>
          Ver meus ingressos
        </Link>
        <Link href="/checkout" className={resultStyles.secondary}>
          Voltar ao checkout
        </Link>
      </div>
    </ResultCard>
  );
}

function PaidOrder({ order }: { order: OrderView }) {
  const { track } = useAnalytics();

  const trackedSuccessView = useRef(false);
  useEffect(() => {
    if (trackedSuccessView.current) return;
    trackedSuccessView.current = true;
    track('checkout_success_viewed', { orderId: order.id });
  }, [order.id, track]);

  const eventNames = [...new Set(order.lines.flatMap((line) => (line.event ? [line.event.title] : [])))];

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* Confirmation */}
        <div className={styles.confirmSection}>
          <div className={styles.iconCircle}>
            <CheckCircle2 size={36} />
          </div>
          <span className={styles.badge}>
            <span className={styles.badgeDot} />
            PAGAMENTO CONFIRMADO
          </span>
          <h1 className={styles.title}>Seu ingresso foi gerado!</h1>
          <p className={styles.desc}>Acesse seus ingressos a qualquer momento pela sua conta.</p>
          <p className={styles.desc}>Pedido {order.code}</p>
        </div>

        {/* Order Summary */}
        <div className={styles.summaryCard}>
          <div className={styles.summaryHeader}>
            <Ticket size={14} />
            <span>RESUMO DO PEDIDO</span>
          </div>
          {eventNames.map((name) => (
            <p key={name} className={styles.eventName}>
              {name}
            </p>
          ))}
          {order.lines.map((line) => (
            <div key={line.id} className={styles.ticketRow}>
              <span className={styles.ticketName}>{line.productName}</span>
            </div>
          ))}
          <div className={styles.divider} />
          <div className={styles.totalRow}>
            <span className={styles.totalLabel}>TOTAL PAGO</span>
            <span className={styles.totalValue}>{formatPrice(order.totalAmount, order.currency)}</span>
          </div>
        </div>

        {/* Post-purchase ad */}
        <AdBanner placement="POST_PURCHASE" />

        {/* Next Steps */}
        <div className={styles.stepsSection}>
          <p className={styles.stepsTitle}>O QUE FAZER AGORA?</p>
          <ol className={styles.stepsList}>
            <li className={styles.step}>
              <span>Acesse <strong>Meus ingressos</strong> para visualizar seu ingresso</span>
            </li>
          </ol>
        </div>

        {/* CTAs */}
        <div className={styles.actions}>
          <Link href="/tickets" className={styles.primaryBtn}>
            <Ticket size={15} />
            VER MEUS INGRESSOS
            <ArrowRight size={14} />
          </Link>
          <Link href="/events" className={styles.secondaryBtn}>
            <Compass size={14} />
            Explorar eventos
          </Link>
        </div>
      </div>
    </div>
  );
}
