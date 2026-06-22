'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useNavigate } from '@/shared/hooks/use-navigate';
import { useCartQuery } from '../queries/cart.queries';
import { useRemoveFromCartMutation } from '../mutations/cart.mutations';
import type { CartView } from '../services/cart.service';
import styles from './CartPageContent.module.scss';

interface Props {
  initialCart?: CartView;
}

const brl = (cents: number) =>
  'R$ ' + (cents / 100).toFixed(2).replace('.', ',');

const SERVICE_FEE = 499;

export function CartPageContent({ initialCart }: Props) {
  const { data } = useCartQuery(initialCart);
  const removeItem = useRemoveFromCartMutation();
  const navigate = useNavigate();

  const [promoCode, setPromoCode] = useState('');
  const [promoState, setPromoState] = useState<'idle' | 'ok' | 'error'>('idle');
  const [discount, setDiscount] = useState(0);

  const items = data?.items ?? [];

  const applyPromo = () => {
    const code = promoCode.trim().toUpperCase();
    const sub = items.reduce((a, it) => a + it.price, 0);
    if (code === 'LIVE10') {
      setDiscount(Math.round(sub * 0.1));
      setPromoState('ok');
    } else {
      setDiscount(0);
      setPromoState('error');
    }
  };

  const subtotal = items.reduce((a, it) => a + it.price, 0);
  const fees = items.length > 0 ? SERVICE_FEE : 0;
  const total = Math.max(0, subtotal - discount) + fees;
  const itemCount = items.length;
  const itemWord = itemCount === 1 ? 'item' : 'itens';

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <p className={styles.eyebrow}>CHECKOUT · ETAPA 1 DE 2</p>

        <div className={styles.pageHeader}>
          <h1 className={styles.heading}>Seu carrinho</h1>
          <Link href="/events" className={styles.continueLink}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M11 18l-6-6 6-6" />
            </svg>
            CONTINUAR COMPRANDO
          </Link>
        </div>

        <div className={styles.grid}>
          {/* ── Items column ───────────────────────────────── */}
          <div>
            <div className={styles.colHeader}>
              <span className={styles.colTitle}>ITENS NO CARRINHO</span>
              <span className={styles.colCount}>{itemCount} {itemWord}</span>
            </div>

            {items.length === 0 ? (
              <div className={styles.empty}>
                <p className={styles.emptyTitle}>Seu carrinho está vazio</p>
                <p className={styles.emptySubtitle}>Explore a programação e adicione um show.</p>
                <Link href="/events" className={styles.emptyCta}>Ver programação</Link>
              </div>
            ) : (
              <div className={styles.itemsList}>
                {items.map((item) => {
                  const isLive = item.capabilities.includes('LIVE_VIEW');
                  const hasReprise = item.capabilities.includes('REPLAY_VIEW');

                  return (
                    <div key={item.eventId} className={styles.itemCard}>
                      <div className={styles.itemGlow} />

                      {/* Thumb */}
                      <div className={styles.thumbWrap}>
                        {item.eventImage ? (
                          <div
                            className={styles.thumbArt}
                            style={{ backgroundImage: `url(${item.eventImage})` }}
                          />
                        ) : (
                          <div className={styles.thumbArtPlaceholder} />
                        )}
                        <div className={styles.thumbScrim} />
                        {isLive && (
                          <span className={styles.liveBadge}>
                            <span className={styles.liveDot} />
                            AO VIVO
                          </span>
                        )}
                      </div>

                      {/* Body */}
                      <div className={styles.itemBody}>
                        <div className={styles.itemTopRow}>
                          <div className={styles.itemMeta}>
                            <p className={styles.itemTitle}>{item.eventTitle}</p>
                            <p className={styles.itemKind}>Ingresso · {item.ticketName}</p>
                          </div>
                          <button
                            className={styles.removeBtn}
                            onClick={() => removeItem.mutate(item.eventId)}
                            disabled={removeItem.isPending}
                            aria-label={`Remover ${item.eventTitle}`}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
                            </svg>
                          </button>
                        </div>

                        {(isLive || hasReprise) && (
                          <div className={styles.chips}>
                            {isLive && <span className={styles.chipLive}>AO VIVO</span>}
                            {hasReprise && <span className={styles.chipReprise}>REPRISE</span>}
                          </div>
                        )}

                        <div className={styles.itemFooter}>
                          <div className={styles.priceBlock}>
                            <p className={styles.linePrice}>{brl(item.price)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Reassurance strip */}
            {items.length > 0 && (
              <div className={styles.reassurance}>
                <div className={styles.reassItem}>
                  <span className={styles.reassIcon}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ff5fb4" strokeWidth="2">
                      <path d="M13 2L4.5 13H11l-1 9 8.5-11H12l1-9Z" />
                    </svg>
                  </span>
                  Acesso imediato após a compra
                </div>
                <div className={styles.reassItem}>
                  <span className={styles.reassIcon}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ff5fb4" strokeWidth="2">
                      <path d="M3 12a9 9 0 1 1 3 6.7M3 21v-5h5" />
                    </svg>
                  </span>
                  Reprise disponível por 30 dias
                </div>
                <div className={styles.reassItem}>
                  <span className={styles.reassIcon}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ff5fb4" strokeWidth="2">
                      <path d="M4 12a8 8 0 1 1 8 8M4 12v-4M4 12h4" />
                    </svg>
                  </span>
                  Reembolso até 24h antes
                </div>
              </div>
            )}
          </div>

          {/* ── Summary card ───────────────────────────────── */}
          <div className={styles.summary}>
            <div className={styles.summaryGlow} />
            <div className={styles.summaryInner}>
              <p className={styles.summaryTitle}>Resumo do pedido</p>

              {/* Promo */}
              <div className={styles.promoWrap}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#7d7d85" strokeWidth="2">
                  <path d="M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0l-7.2-7.2a2 2 0 0 1-.6-1.4V5a2 2 0 0 1 2-2h7a2 2 0 0 1 1.4.6l7.4 7.4a2 2 0 0 1 0 2.8Z" />
                  <circle cx="7.5" cy="7.5" r="1.3" />
                </svg>
                <input
                  className={styles.promoInput}
                  placeholder="Inserir código promocional"
                  value={promoCode}
                  onChange={(e) => {
                    setPromoCode(e.target.value);
                    setPromoState('idle');
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && applyPromo()}
                />
                <button className={styles.promoApply} onClick={applyPromo}>APLICAR</button>
              </div>

              {promoState === 'ok' && (
                <div className={`${styles.promoFeedback} ${styles.promoSuccess}`}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  Código aplicado — 10% de desconto
                </div>
              )}
              {promoState === 'error' && (
                <div className={`${styles.promoFeedback} ${styles.promoError}`}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                  Código inválido ou expirado
                </div>
              )}
              {promoState === 'idle' && <div className={styles.promoSpacer} />}

              {/* Lines */}
              <div className={styles.summaryLines}>
                <div className={styles.summaryLine}>
                  <span className={styles.summaryLineLabel}>
                    Subtotal{' '}
                    <span className={styles.summaryLineMuted}>({itemCount} {itemWord})</span>
                  </span>
                  <span className={styles.summaryLineValue}>{brl(subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className={styles.summaryLine}>
                    <span className={styles.summaryLineLabel}>Desconto</span>
                    <span className={`${styles.summaryLineValue} ${styles.summaryLineDiscount}`}>
                      −{brl(discount)}
                    </span>
                  </div>
                )}
                <div className={styles.summaryLine}>
                  <span className={styles.summaryLineLabel}>Taxas de serviço</span>
                  <span className={styles.summaryLineValue}>{brl(fees)}</span>
                </div>
              </div>

              <div className={styles.summaryDivider} />

              <div className={styles.totalRow}>
                <span className={styles.totalLabel}>Total</span>
                <div className={styles.totalAmountBlock}>
                  <p className={styles.totalCurrency}>BRL</p>
                  <p className={styles.totalValue}>{brl(total)}</p>
                </div>
              </div>

              <button
                className={styles.checkoutBtn}
                onClick={() => navigate.push('/checkout')}
                disabled={items.length === 0}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                  <rect x="2" y="5" width="20" height="14" rx="2" />
                  <path d="M2 10h20" />
                </svg>
                Ir para o pagamento
              </button>

              <Link href="/events" className={styles.continueBtn}>
                Continuar explorando eventos
              </Link>

              <div className={styles.securePayment}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="4" y="10" width="16" height="11" rx="2" />
                  <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                </svg>
                PAGAMENTO SEGURO E CRIPTOGRAFADO
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
