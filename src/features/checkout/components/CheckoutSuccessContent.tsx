'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CheckCircle2, Ticket, ArrowRight, Compass } from 'lucide-react';
import { formatPrice } from '@/features/events';
import { AdBanner } from '@/features/advertisements';
import type { CartCheckoutSession } from '../types/checkout.types';
import styles from './CheckoutSuccessContent.module.scss';

interface Props {
  eventId?: string;
}

export function CheckoutSuccessContent(_: Props) {
  const params = useSearchParams();

  const orderId = params.get('orderId');
  const name = params.get('name');
  const ticket = params.get('ticket');
  const totalRaw = params.get('total');
  const qty = params.get('qty') ? Number(params.get('qty')) : null;
  const currency = params.get('currency') ?? 'BRL';

  const formattedTotal = totalRaw != null ? formatPrice(Number(totalRaw), currency) : null;
  const hasOrderSummary = name || ticket || formattedTotal;

  if (nextCurrency) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.confirmSection}>
            <p className={styles.desc}>Redirecionando para o próximo pagamento ({nextCurrency})…</p>
          </div>
        </div>
      </div>
    );
  }

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
          {orderId && <p className={styles.desc}>Pedido {orderId}</p>}
        </div>

        {/* Order Summary */}
        {hasOrderSummary && (
          <div className={styles.summaryCard}>
            <div className={styles.summaryHeader}>
              <Ticket size={14} />
              <span>RESUMO DO PEDIDO</span>
            </div>
            {name && <p className={styles.eventName}>{name}</p>}
            {(ticket || (qty && qty > 1)) && (
              <div className={styles.ticketRow}>
                {ticket && <span className={styles.ticketName}>{ticket}</span>}
                {qty && qty > 1 && <span className={styles.qty}>× {qty}</span>}
              </div>
            )}
            {formattedTotal && (
              <>
                <div className={styles.divider} />
                <div className={styles.totalRow}>
                  <span className={styles.totalLabel}>TOTAL PAGO</span>
                  <span className={styles.totalValue}>{formattedTotal}</span>
                </div>
              </>
            )}
          </div>
        )}

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
