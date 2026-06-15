'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Ticket } from 'lucide-react';
import { formatPrice } from '../../utils/event-formatters';
import type { EventResponse, TicketProductResponse } from '../../types/event.types';
import { useCartStore } from '@/features/cart';
import styles from './TicketPanel.module.scss';

interface Props {
  event: EventResponse;
  tickets: TicketProductResponse[];
}

export function TicketPanel({ event, tickets }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(tickets[0]?.id ?? null);
  const setItem = useCartStore((s) => s.setItem);

  const ticket = tickets.find((t) => t.id === selected) ?? tickets[0];
  const isLive = event.status === 'LIVE';

  if (event.status === 'CANCELLED') {
    return (
      <div className={styles.panel}>
        <h3 className={styles.panelTitle}>Ingresso</h3>
        <p className={styles.empty}>Este evento foi cancelado.</p>
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className={styles.panel}>
        <h3 className={styles.panelTitle}>Ingresso</h3>
        <p className={styles.empty}>Nenhum ingresso disponível ainda.</p>
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      <h3 className={styles.panelTitle}>Comprar Ingresso</h3>
      <div className={styles.ticketOptions}>
        {tickets.map((t) => (
          <button key={t.id} onClick={() => setSelected(t.id)}
            className={`${styles.ticketOption} ${selected === t.id ? styles.ticketOptionSelected : ''}`}>
            <div className={styles.ticketOptionInner}>
              <div>
                <p className={`${styles.ticketOptionName} ${selected === t.id ? styles.ticketOptionNameSelected : ''}`}>
                  {t.name}
                </p>
                <p className={styles.ticketOptionDesc}>{t.description}</p>
              </div>
              <p className={styles.ticketOptionPrice}>{formatPrice(t.price)}</p>
            </div>
          </button>
        ))}
      </div>
      {ticket && (
        <div className={styles.totalRow}>
          <div className={styles.totalLine}>
            <span className={styles.totalLabel}>Total</span>
            <span className={styles.totalPrice}>{formatPrice(ticket.price)}</span>
          </div>
          <p className={styles.totalNote}>Acesso válido para uma pessoa</p>
        </div>
      )}
      <button
        onClick={() => {
          if (!ticket) return;
          setItem({
            eventId: event.id,
            eventTitle: event.title,
            ticketProductId: ticket.id,
            ticketName: ticket.name,
            price: ticket.price,
            capabilities: ticket.capabilities,
            camerasLimit: ticket.camerasLimit,
          });
          router.push('/cart');
        }}
        className={styles.btnPrimary}
      >
        <Ticket size={16} /> Comprar Ingresso
      </button>
      {isLive && (
        <div className={styles.demoLink}>
          <button onClick={() => router.push(`/live/${event.id}`)} className={styles.demoBtn}>
            Assistir demonstração gratuita →
          </button>
        </div>
      )}
    </div>
  );
}
