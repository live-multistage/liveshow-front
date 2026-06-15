import type { CartItem } from '../types/cart.types';

// A single line in the order summary (subtotal, tax, service fee, discount…).
export interface TotalLine {
  key: string;
  label: string;
  amount: number; // positive = adds to total, negative = discount
}

export interface CartTotals {
  subtotal: number;
  lines: TotalLine[];
  total: number;
}

// Computes the order summary. Structured so future charges (tax, service fee,
// discounts) are just additional `lines` folded into the total — the UI renders
// `lines` generically, so adding one needs no layout change.
export function computeCartTotals(items: CartItem[]): CartTotals {
  const subtotal = items.reduce((sum, i) => sum + i.price, 0);

  const lines: TotalLine[] = [
    // Future: push tax / service-fee / discount lines here, e.g.
    // { key: 'service_fee', label: 'Taxa de serviço', amount: subtotal * 0.1 },
  ];

  const total = subtotal + lines.reduce((sum, l) => sum + l.amount, 0);
  return { subtotal, lines, total };
}
