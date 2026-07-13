'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useNavigate } from '@/shared/hooks/use-navigate';
import { useCartQuery } from '../queries/cart.queries';
import { useRemoveFromCartMutation } from '../mutations/cart.mutations';
import { trackCartRemove } from '../hooks/use-track-cart';
import { useAuth } from '@/features/account/hooks/use-auth';
import { checkoutService } from '@/features/checkout/services/checkout.service';
import type { CartLineView, CartView } from '../services/cart.service';
import styles from './CartPageContent.module.scss';

interface Props {
  initialCart?: CartView;
}

const brl = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

interface AppliedCoupon {
  code: string;
  discountAmount: number;
  scopeOrgIds: string[];
  eligibleEventIds: string[];
}

interface OrgGroup {
  orgId: string;
  orgName: string;
  items: CartLineView[];
}

function groupByOrg(items: CartLineView[]): OrgGroup[] {
  const map = new Map<string, OrgGroup>();
  for (const item of items) {
    if (!map.has(item.organizationId)) {
      map.set(item.organizationId, { orgId: item.organizationId, orgName: item.organizationName, items: [] });
    }
    map.get(item.organizationId)!.items.push(item);
  }
  return Array.from(map.values());
}

export function CartPageContent({ initialCart }: Props) {
  const { data } = useCartQuery(initialCart);
  const removeItem = useRemoveFromCartMutation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [promoCode, setPromoCode] = useState('');
  const [promoState, setPromoState] = useState<'idle' | 'ok' | 'error'>('idle');
  const [promoError, setPromoError] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);

  const items = data?.items ?? [];
  const orgGroups = useMemo(() => groupByOrg(items), [items]);
  const subtotal = data?.totals.subtotal ?? 0;
  const taxAmount = data?.totals.lines.find((l) => l.key === 'tax')?.amount ?? 0;
  const discount = appliedCoupon?.discountAmount ?? 0;

  const applyPromo = async () => {
    const code = promoCode.trim().toUpperCase();
    if (!code || items.length === 0) return;
    setIsApplying(true);
    setPromoError('');
    try {
      // Server-side scoped validation: discount computed only on eligible items
      const result = await checkoutService.previewCartCoupon({
        code,
        items: items.map((i) => ({ eventId: i.eventId, amount: i.price })),
      });
      setAppliedCoupon({
        code,
        discountAmount: result.discountAmount,
        scopeOrgIds: result.orgIds,
        eligibleEventIds: result.eligibleEventIds,
      });
      sessionStorage.setItem('cart:coupon', JSON.stringify({ code }));
      setPromoState('ok');
      setPromoCode('');
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      setPromoError(e?.response?.data?.message ?? 'Cupom inválido ou expirado');
      setPromoState('error');
    } finally {
      setIsApplying(false);
    }
  };

  const removePromo = () => {
    setAppliedCoupon(null);
    sessionStorage.removeItem('cart:coupon');
    setPromoState('idle');
    setPromoError('');
  };

  const total = Math.max(0, subtotal + taxAmount - discount);
  const itemCount = items.length;
  const itemWord = itemCount === 1 ? 'item' : 'itens';
  const multiOrg = orgGroups.length > 1;

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
                {orgGroups.map((group) => (
                  <div key={group.orgId} className={styles.orgSection}>
                    {multiOrg && (
                      <div className={styles.orgHeader}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 21h18M3 7v14M21 7v14M6 11h4M14 11h4M6 15h4M14 15h4M9 21v-6h6v6" />
                        </svg>
                        <span>{group.orgName}</span>
                        {group.items.some((i) => appliedCoupon?.eligibleEventIds.includes(i.eventId)) && (
                          <span className={styles.orgDiscountBadge}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path d="M20 6L9 17l-5-5" />
                            </svg>
                            Desconto aplicado
                          </span>
                        )}
                      </div>
                    )}

                    <div className={styles.orgItems}>
                      {group.items.map((item) => {
                        const isLive = item.capabilities.includes('LIVE_VIEW');
                        const hasReprise = item.capabilities.includes('REPLAY_VIEW');
                        return (
                          <div key={item.eventId} className={styles.itemCard}>
                            <div className={styles.itemGlow} />

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

                            <div className={styles.itemBody}>
                              <div className={styles.itemTopRow}>
                                <div className={styles.itemMeta}>
                                  <p className={styles.itemTitle}>{item.eventTitle}</p>
                                  <p className={styles.itemKind}>Ingresso · {item.ticketName}</p>
                                </div>
                                <button
                                  className={styles.removeBtn}
                                  onClick={() => {
                                    removeItem.mutate(item.eventId, {
                                      onSuccess: () => trackCartRemove(item.eventId, user?.id),
                                    });
                                  }}
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
                  </div>
                ))}
              </div>
            )}

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

              {/* Promo — hidden once a coupon is applied */}
              {appliedCoupon ? (
                <div className={`${styles.promoFeedback} ${styles.promoSuccess}`}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  <span>
                    {appliedCoupon.code}
                    {appliedCoupon.scopeOrgIds.length === 1 && ` · ${orgGroups.find(g => g.orgId === appliedCoupon.scopeOrgIds[0])?.orgName ?? ''}`}
                    {appliedCoupon.scopeOrgIds.length > 1 && ' · várias organizações'}
                    {' '}— {brl(appliedCoupon.discountAmount)} de desconto
                  </span>
                  <button className={styles.promoRemove} onClick={removePromo} aria-label="Remover cupom">×</button>
                </div>
              ) : (
                <>
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
                        setPromoCode(e.target.value.toUpperCase());
                        setPromoState('idle');
                        setPromoError('');
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && applyPromo()}
                      disabled={isApplying}
                    />
                    <button
                      className={styles.promoApply}
                      onClick={applyPromo}
                      disabled={isApplying || !promoCode.trim() || items.length === 0}
                    >
                      {isApplying ? '...' : 'APLICAR'}
                    </button>
                  </div>
                  {promoState === 'error' && (
                    <div className={`${styles.promoFeedback} ${styles.promoError}`}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                      {promoError || 'Cupom inválido ou expirado'}
                    </div>
                  )}
                  {promoState === 'idle' && <div className={styles.promoSpacer} />}
                </>
              )}

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
                    <span className={styles.summaryLineLabel}>
                      Desconto
                      {appliedCoupon && appliedCoupon.scopeOrgIds.length === 1 && (
                        <span className={styles.summaryLineMuted}> · {orgGroups.find(g => g.orgId === appliedCoupon.scopeOrgIds[0])?.orgName ?? ''}</span>
                      )}
                      {appliedCoupon && appliedCoupon.scopeOrgIds.length > 1 && (
                        <span className={styles.summaryLineMuted}> · várias organizações</span>
                      )}
                    </span>
                    <span className={`${styles.summaryLineValue} ${styles.summaryLineDiscount}`}>
                      −{brl(discount)}
                    </span>
                  </div>
                )}
                {taxAmount > 0 && (
                  <div className={styles.summaryLine}>
                    <span className={styles.summaryLineLabel}>Taxas de serviço</span>
                    <span className={styles.summaryLineValue}>{brl(taxAmount)}</span>
                  </div>
                )}
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
