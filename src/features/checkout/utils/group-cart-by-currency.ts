import type { CartLineView } from '@/features/cart';

export interface CartCurrencyGroup {
  currency: string;
  subtotal: number;
}

// A mixed-currency cart has no single valid total (backend charges one Stripe
// session per currency group already — see CartCheckoutSession). Group items
// by currency so the UI can show one subtotal per group instead of summing
// incompatible currencies into one number.
export function groupCartByCurrency(items: CartLineView[]): CartCurrencyGroup[] {
  const subtotalsByCurrency = new Map<string, number>();
  for (const item of items) {
    const currency = item.currency ?? 'BRL';
    subtotalsByCurrency.set(currency, (subtotalsByCurrency.get(currency) ?? 0) + item.price);
  }
  return Array.from(subtotalsByCurrency, ([currency, subtotal]) => ({ currency, subtotal }));
}
