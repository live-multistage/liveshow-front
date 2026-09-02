'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Shield, AlertCircle, Check, Ticket } from 'lucide-react';
import { formatPrice } from '@/features/events';
import { useAuth } from '@/features/account';
import { useCartQuery, CAPABILITY_LABELS, type CartLineView } from '@/features/cart';
import { groupCartByCurrency } from '../utils/group-cart-by-currency';
import { checkoutService } from '../services/checkout.service';
import { usePaymentMethodsQuery, usePlaceOrderMutation } from '../mutations/checkout.mutations';
import { normalizeError, type AppError } from '@/lib/http/errors';
import { PaymentMethodSelector } from './PaymentMethodSelector';
import { AdBanner } from '@/features/advertisements';
import styles from './CheckoutPageContent.module.scss';
import cartStyles from './CartCheckoutPageContent.module.scss';

function payErrorMessage(err: AppError, t: ReturnType<typeof useTranslations>): string {
  if (err.status === 400) return t('emptyCart');
  if (err.status === 422) return t('couponInvalid');
  if (err.status === 409) return t('errors.EVENT_NOT_PURCHASABLE');
  return t('errors.GENERIC');
}

export function CartCheckoutPageContent() {
  const t = useTranslations('checkout');
  const { isLoggedIn, isLoading: authLoading } = useAuth();
  const { data: cart, isLoading: cartLoading } = useCartQuery();
  const router = useRouter();

  // Checkout requires auth. Instead of rendering a blank page, send guests to
  // login and bring them straight back here after they sign in.
  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      router.replace(`/login?redirect=${encodeURIComponent('/checkout')}`);
    }
  }, [authLoading, isLoggedIn, router]);

  const items = cart?.items ?? [];
  const totalAmount = cart?.totals.total ?? 0;
  // Cart is mono-currency (POST /cart/items rejects a mismatched currency),
  // so a single currency covers every line here.
  const currency = items[0]?.currency ?? 'BRL';

  // A mixed-currency cart has no single valid total — the backend already
  // charges one Stripe session per currency group (see handlePay below), so
  // the display groups the same way instead of summing incompatible amounts.
  const currencyGroups = groupCartByCurrency(items);
  const isMixedCurrency = currencyGroups.length > 1;
  const singleCurrency = currencyGroups[0]?.currency ?? 'BRL';

  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);
  const [payErrorMsg, setPayErrorMsg] = useState<string | null>(null);
  const [coupon, setCoupon] = useState<{ code: string; discountAmount: number } | null>(null);

  const paymentMethods = usePaymentMethodsQuery();
  const placeOrder = usePlaceOrderMutation();

  // Coupon applied on the cart page travels here via sessionStorage;
  // re-validate against the server so a stale/expired code is dropped silently.
  useEffect(() => {
    const raw = typeof window !== 'undefined' ? sessionStorage.getItem('cart:coupon') : null;
    if (!raw || items.length === 0) return;
    const { code } = JSON.parse(raw) as { code: string };
    checkoutService
      .previewCartCoupon({ code })
      .then((r) => setCoupon({ code, discountAmount: r.discountAmount }))
      .catch(() => {
        sessionStorage.removeItem('cart:coupon');
        setCoupon(null);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  // Which currency group the applied coupon's discount belongs to — the
  // backend only ever validates a coupon against one currency's events
  // (eligibleEventIds), so attribute the discount line to that group only.
  const couponCurrency = coupon
    ? (items.find((i) => coupon.eligibleEventIds.includes(i.eventId))?.currency ?? singleCurrency)
    : null;

  // Coupon applied on the cart page travels here via sessionStorage;
  // re-validate against the server so a stale/expired code is dropped silently.
  useEffect(() => {
    const raw = typeof window !== 'undefined' ? sessionStorage.getItem('cart:coupon') : null;
    if (!raw || items.length === 0) return;
    const { code } = JSON.parse(raw) as { code: string };
    checkoutService
      .previewCartCoupon({ code, items: items.map((i) => ({ eventId: i.eventId, amount: i.price })) })
      .then((r) => setCoupon({ code, discountAmount: r.discountAmount, eligibleEventIds: r.eligibleEventIds }))
      .catch(() => {
        sessionStorage.removeItem('cart:coupon');
        setCoupon(null);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  const selectedMethod = paymentMethods.data?.find((m) => m.id === selectedMethodId);

  const handlePay = () => {
    if (!selectedMethod || items.length === 0) return;
    setPayErrorMsg(null);
    placeOrder.mutate(
      // PlaceOrderRequest.provider is now 'STRIPE' | 'GOOGLE_PLAY'. The web
      // stays on STRIPE unconditionally: a browser cannot complete a
      // PLAY_BILLING action, and the backend's Play gate refuses anything that
      // is not the Android app anyway. The selected payment method still
      // decides how Stripe collects (card, PIX…).
      { provider: 'STRIPE', couponCode: coupon?.code },
      {
        onSuccess: ({ order, payment }) => {
          sessionStorage.removeItem('cart:coupon');
          if (payment.action.type === 'REDIRECT') {
            window.location.href = payment.action.url;
          } else if (payment.action.type === 'COMPLETED') {
            router.push(`/checkout/success?orderId=${order.id}`);
          } else {
            // PAYMENT_INTENT is the in-app sheet: the web never asks for it
            // (it sends no `flow`), and a browser cannot present it. Falling
            // through to pending is correct — the order exists, unpaid.
            router.push(`/checkout/pending?orderId=${order.id}`);
          }
        },
        onError: (e) => setPayErrorMsg(payErrorMessage(normalizeError(e), t)),
      },
    );
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
          <p>{t('emptyCart')}</p>
          <Link href="/events" className={styles.backBtn}>
            Explorar eventos
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <h1 className={styles.title}>Finalizar compra</h1>

        {payErrorMsg && (
          <div className={styles.error} style={{ marginBottom: '1rem' }} role="alert">
            <AlertCircle size={20} />
            <p>{payErrorMsg}</p>
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
              disabled={!selectedMethodId || placeOrder.isPending || items.length === 0}
              aria-busy={placeOrder.isPending}
            >
              {placeOrder.isPending
                ? 'Processando…'
                : `Pagar ${formatPrice(Math.max(0, totalAmount - (coupon?.discountAmount ?? 0)), currency)}`}
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
                  <span>{formatPrice(line.amount, currency)}</span>
                </div>
              ))}
              {coupon && (
                <div className={cartStyles.totalRow}>
                  <span>Cupom {coupon.code}</span>
                  <span>−{formatPrice(coupon.discountAmount, currency)}</span>
                </div>
              )}
              <div className={cartStyles.totalRow}>
                <span>Total</span>
                <span className={cartStyles.totalValue}>
                  {formatPrice(Math.max(0, totalAmount - (coupon?.discountAmount ?? 0)), currency)}
                </span>
              </div>
            ) : (
              <div className={cartStyles.totals}>
                {(cart?.totals.lines ?? []).map((line) => (
                  <div key={line.key} className={cartStyles.totalRow}>
                    <span>{line.label}</span>
                    <span>{formatPrice(line.amount, singleCurrency)}</span>
                  </div>
                ))}
                {coupon && (
                  <div className={cartStyles.totalRow}>
                    <span>Cupom {coupon.code}</span>
                    <span>−{formatPrice(coupon.discountAmount, singleCurrency)}</span>
                  </div>
                )}
                <div className={cartStyles.totalRow}>
                  <span>Total</span>
                  <span className={cartStyles.totalValue}>
                    {formatPrice(Math.max(0, totalAmount - (coupon?.discountAmount ?? 0)), singleCurrency)}
                  </span>
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
        <span className={cartStyles.itemPrice}>{formatPrice(item.price, item.currency)}</span>
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
