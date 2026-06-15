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
// Placeholder tax rate — swap for real tax/fee rules (per-region, per-event) later.
const TAX_RATE = 0.125;

export function computeCartTotals(items: CartItem[]): CartTotals {
  const subtotal = items.reduce((sum, i) => sum + i.price, 0);

  const round = (n: number) => Math.round(n * 100) / 100;

  // Extensible summary lines. Add service fee / discount the same way.
  const lines: TotalLine[] = subtotal > 0
    ? [{ key: 'tax', label: 'Taxas', amount: round(subtotal * TAX_RATE) }]
    : [];

  const total = round(subtotal + lines.reduce((sum, l) => sum + l.amount, 0));
  return { subtotal, lines, total };
}
