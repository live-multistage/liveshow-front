'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Shield, AlertCircle, Check, Ticket } from 'lucide-react';
import { formatPrice } from '@/features/events';
import { useAuth, useUpdateProfileMutation } from '@/features/account';
import { useCartQuery, CAPABILITY_LABELS, type CartLineView } from '@/features/cart';
import { checkoutService } from '../services/checkout.service';
import { cartIdempotencyKey } from '../utils/idempotency-key';
import { usePaymentMethodsQuery, usePlaceOrderMutation } from '../mutations/checkout.mutations';
import { normalizeError, type AppError } from '@/lib/http/errors';
import { PaymentMethodSelector } from './PaymentMethodSelector';
import { BuyerDocumentField } from './BuyerDocumentField';
import { AdBanner } from '@/features/advertisements';
import { useAnalytics } from '@/lib/analytics/tracking';
import { TrackFeature } from '@live-show/analytics-sdk/react';
import styles from './CheckoutPageContent.module.scss';
import cartStyles from './CartCheckoutPageContent.module.scss';

// Three different 409s now reach this screen, and "this event is not
// purchasable" is the wrong sentence for two of them — so the machine-readable
// `code` is consulted before the status.
const PAY_ERROR_KEYS: Record<string, string> = {
  ALREADY_OWNED: 'errors.ALREADY_OWNED',
  ORDER_REQUEST_IN_PROGRESS: 'errors.ORDER_REQUEST_IN_PROGRESS',
  EVENT_NOT_PURCHASABLE: 'errors.EVENT_NOT_PURCHASABLE',
  TICKET_SOLD_OUT: 'errors.EVENT_NOT_PURCHASABLE',
};

// The tracking plan's payment_method_selected/payment_submitted only cover the
// methods the web actually offers (Stripe-collected card/PIX); GOOGLE_PAY,
// APPLE_PAY and STRIPE itself never reach here as a *selected* method.
type TrackedPaymentMethod = 'PIX' | 'CREDIT_CARD' | 'DEBIT_CARD';
function isTrackedPaymentMethod(type: string): type is TrackedPaymentMethod {
  return type === 'PIX' || type === 'CREDIT_CARD' || type === 'DEBIT_CARD';
}

function payErrorMessage(err: AppError, t: ReturnType<typeof useTranslations>): string {
  const byCode = err.code ? PAY_ERROR_KEYS[err.code] : undefined;
  if (byCode) return t(byCode);
  if (err.status === 400) return t('emptyCart');
  if (err.status === 422) return t('couponInvalid');
  if (err.status === 409) return t('errors.EVENT_NOT_PURCHASABLE');
  return t('errors.GENERIC');
}

interface Props {
  couponsEnabled?: boolean;
  fiscalEnabled?: boolean;
}

export function CartCheckoutPageContent({ couponsEnabled = true, fiscalEnabled = false }: Props) {
  const t = useTranslations('checkout');
  const { isLoggedIn, isLoading: authLoading, user } = useAuth();
  const { data: cart, isLoading: cartLoading } = useCartQuery();
  const router = useRouter();
  const { track } = useAnalytics();

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

  // checkout_started once per page open, as soon as the cart has loaded.
  // totalCents here is pre-coupon by design (the buyer hasn't confirmed one
  // yet at this point) — contrast payment_submitted's totalCents below, which
  // is post-discount.
  const trackedCheckoutStarted = useRef(false);
  useEffect(() => {
    if (trackedCheckoutStarted.current || !cart) return;
    trackedCheckoutStarted.current = true;
    track('checkout_started', {
      itemCount: items.length,
      totalCents: Math.round(totalAmount * 100),
      isFree: totalAmount === 0,
    });
  }, [cart, items.length, totalAmount, track]);

  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);
  const [payErrorMsg, setPayErrorMsg] = useState<string | null>(null);
  const [coupon, setCoupon] = useState<{ code: string; discountAmount: number } | null>(null);
  const [doc, setDoc] = useState({ value: user?.taxDocument ?? '', valid: true });

  const paymentMethods = usePaymentMethodsQuery();
  const placeOrder = usePlaceOrderMutation();
  const updateProfile = useUpdateProfileMutation();

  // `user` hydrates asynchronously after first render; seed the field from it
  // exactly once so it doesn't clobber whatever the buyer has already typed.
  const seededDoc = useRef(false);
  useEffect(() => {
    if (seededDoc.current || !user) return;
    seededDoc.current = true;
    setDoc({ value: user.taxDocument ?? '', valid: true });
  }, [user]);

  // buyer_info_completed the first time the document field becomes non-empty and valid.
  const trackedBuyerInfo = useRef(false);
  useEffect(() => {
    if (trackedBuyerInfo.current || !fiscalEnabled || !doc.valid || !doc.value) return;
    trackedBuyerInfo.current = true;
    track('buyer_info_completed', {});
  }, [fiscalEnabled, doc, track]);

  // Coupon applied on the cart page travels here via sessionStorage;
  // re-validate against the server so a stale/expired code is dropped silently.
  useEffect(() => {
    if (!couponsEnabled) return;
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
  }, [items.length, couponsEnabled]);

  const selectedMethod = paymentMethods.data?.find((m) => m.id === selectedMethodId);
  const submitting = updateProfile.isPending || placeOrder.isPending;

  // `submitting` (mutation isPending) only flips true after the first `await`
  // below, so a fast second click in that window would sail past it — this
  // ref is set synchronously, before any await, and is the real re-entry guard.
  const submittingRef = useRef(false);

  const handlePay = async () => {
    if (!selectedMethod || items.length === 0 || submitting || submittingRef.current) return;
    submittingRef.current = true;
    setPayErrorMsg(null);

    if (fiscalEnabled && doc.value && doc.value !== user?.taxDocument) {
      try {
        await updateProfile.mutateAsync({ taxDocument: doc.value });
      } catch {
        submittingRef.current = false;
        setPayErrorMsg(t('buyerDocument.saveError'));
        return;
      }
    }

    // Derived from the cart, so a second click, a back out of Stripe or a
    // second tab all produce this same key and replay the first order instead
    // of opening a second checkout for the same items.
    const idempotencyKey = await cartIdempotencyKey({
      ticketProductIds: items.map((i) => i.ticketProductId),
      couponCode: coupon?.code,
      provider: 'STRIPE',
    });

    if (isTrackedPaymentMethod(selectedMethod.type)) {
      // Post-discount: the coupon (if any) is already confirmed by this point,
      // unlike checkout_started.totalCents below which is pre-coupon by design.
      track('payment_submitted', {
        method: selectedMethod.type,
        totalCents: Math.round(Math.max(0, totalAmount - (coupon?.discountAmount ?? 0)) * 100),
      });
    }

    placeOrder.mutate(
      // PlaceOrderRequest.provider is now 'STRIPE' | 'GOOGLE_PLAY'. The web
      // stays on STRIPE unconditionally: a browser cannot complete a
      // PLAY_BILLING action, and the backend's Play gate refuses anything that
      // is not the Android app anyway. The selected payment method still
      // decides how Stripe collects (card, PIX…).
      { payload: { provider: 'STRIPE', couponCode: coupon?.code }, idempotencyKey },
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
            router.push(`/checkout/pending?orderId=${order.id}&method=${selectedMethod.type}`);
          }
        },
        onError: (e) => setPayErrorMsg(payErrorMessage(normalizeError(e), t)),
        onSettled: () => {
          submittingRef.current = false;
        },
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
    <TrackFeature name="checkout">
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
            {fiscalEnabled && (
              <BuyerDocumentField
                value={doc.value}
                onChange={setDoc}
                labels={{
                  label: t('buyerDocument.label'),
                  hint: t('buyerDocument.hint'),
                  invalid: t('buyerDocument.invalid'),
                }}
              />
            )}

            <PaymentMethodSelector
              methods={paymentMethods.data ?? []}
              selected={selectedMethodId}
              onChange={(id) => {
                setSelectedMethodId(id);
                const method = paymentMethods.data?.find((m) => m.id === id);
                if (method && isTrackedPaymentMethod(method.type)) {
                  track('payment_method_selected', { method: method.type });
                }
              }}
              isLoading={paymentMethods.isLoading}
            />

            <button
              className={styles.payBtn}
              onClick={handlePay}
              disabled={
                !selectedMethodId ||
                submitting ||
                items.length === 0 ||
                (fiscalEnabled && !doc.valid)
              }
              aria-busy={submitting}
            >
              {submitting
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
            </div>
          </aside>
        </div>
      </div>
    </div>
    </TrackFeature>
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
