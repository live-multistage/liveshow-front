'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Tv2, RotateCcw, X, CreditCard, Ticket, Check } from 'lucide-react';
import { formatPrice } from '../../utils/event-formatters';
import type { EventResponse, TicketProductResponse } from '../../types/event.types';
import styles from './TicketPanel.module.scss';

type PurchaseStep = 'select' | 'checkout' | 'success';

interface Props {
  event: EventResponse;
  tickets: TicketProductResponse[];
}

export function TicketPanel({ event, tickets }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(tickets[0]?.id ?? null);
  const [step, setStep] = useState<PurchaseStep>('select');
  const [card, setCard] = useState({ name: '', number: '', expiry: '', cvv: '' });
  const [processing, setProcessing] = useState(false);

  const ticket = tickets.find((t) => t.id === selected) ?? tickets[0];
  const isLive = event.status === 'LIVE';
  const isFinished = event.status === 'FINISHED';

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

  const handlePurchase = async () => {
    setProcessing(true);
    await new Promise((res) => setTimeout(res, 1500));
    setProcessing(false);
    setStep('success');
  };

  if (step === 'success') {
    return (
      <div className={styles.successPanel}>
        <div className={styles.successIcon}><Check size={28} color="white" /></div>
        <h3 className={styles.successTitle}>Ingresso Confirmado!</h3>
        <p className={styles.successShow}>{event.title}</p>
        <p className={styles.successPlan}>{ticket?.name} · {formatPrice(ticket?.price ?? 0)}</p>
        {isLive && (
          <button onClick={() => router.push(`/live/${event.id}`)} className={styles.btnPrimary}>
            <Tv2 size={18} /> Assistir Agora
          </button>
        )}
        {isFinished && (
          <button onClick={() => router.push(`/replay/${event.id}`)} className={styles.btnPrimary}>
            <RotateCcw size={18} /> Ver Reprise
          </button>
        )}
        <button onClick={() => router.push('/tickets')} className={styles.btnOutline}>
          Ver Meus Ingressos →
        </button>
      </div>
    );
  }

  if (step === 'checkout') {
    return (
      <div className={styles.panel}>
        <div className={styles.checkoutHeader}>
          <h3 className={styles.panelTitle}>Pagamento</h3>
          <button onClick={() => setStep('select')} className={styles.closeBtn}><X size={16} /></button>
        </div>
        <div className={styles.checkoutSummary}>
          <div>
            <p className={styles.checkoutSummaryTitle}>{event.title}</p>
            <p className={styles.checkoutSummaryPlan}>{ticket?.name}</p>
          </div>
          <p className={styles.checkoutSummaryPrice}>{formatPrice(ticket?.price ?? 0)}</p>
        </div>
        <div className={styles.checkoutFields}>
          {[
            { label: 'Nome no Cartão', field: 'name', placeholder: 'FULANO DA SILVA', mono: false },
            { label: 'Número do Cartão', field: 'number', placeholder: '0000 0000 0000 0000', mono: true },
          ].map(({ label, field, placeholder, mono }) => (
            <div key={field} className={styles.checkoutField}>
              <label className={styles.checkoutLabel}>{label}</label>
              <input
                type="text"
                value={card[field as keyof typeof card]}
                onChange={(e) => setCard({ ...card, [field]: e.target.value })}
                placeholder={placeholder}
                className={`${styles.checkoutInput} ${mono ? styles.mono : ''}`}
              />
            </div>
          ))}
          <div className={styles.checkoutRow}>
            <div className={styles.checkoutField}>
              <label className={styles.checkoutLabel}>Validade</label>
              <input type="text" value={card.expiry} onChange={(e) => setCard({ ...card, expiry: e.target.value })}
                placeholder="MM/AA" maxLength={5} className={`${styles.checkoutInput} ${styles.mono}`} />
            </div>
            <div className={styles.checkoutField}>
              <label className={styles.checkoutLabel}>CVV</label>
              <input type="text" value={card.cvv} onChange={(e) => setCard({ ...card, cvv: e.target.value })}
                placeholder="123" maxLength={3} className={`${styles.checkoutInput} ${styles.mono}`} />
            </div>
          </div>
        </div>
        <button onClick={handlePurchase} disabled={processing} className={styles.btnPrimary}>
          {processing
            ? <><span className={styles.spinner} /> Processando...</>
            : <><CreditCard size={16} /> Pagar {formatPrice(ticket?.price ?? 0)}</>}
        </button>
        <p className={styles.secureNote}>🔒 Pagamento simulado — sem dados reais</p>
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
      <button onClick={() => setStep('checkout')} className={styles.btnPrimary}>
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
