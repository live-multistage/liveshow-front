export interface CurrencySale {
  currency: string;
  amount: number;
}

// The single currency bucket with the largest amount ("dominant"), or null.
export function dominantSale(sales?: CurrencySale[]): CurrencySale | null {
  if (!sales || sales.length === 0) return null;
  return sales.reduce((best, s) => (s.amount > best.amount ? s : best));
}

// Sum a single currency's buckets across many orgs (header KPI — no FX mixing).
export function sumByCurrency(orgs: { salesThisMonth?: CurrencySale[] }[], currency = 'BRL'): number {
  return orgs.reduce(
    (sum, o) =>
      sum + (o.salesThisMonth?.filter((s) => s.currency === currency).reduce((a, s) => a + s.amount, 0) ?? 0),
    0,
  );
}

export function formatMoney(amount: number, currency: string): string {
  return amount.toLocaleString('pt-BR', { style: 'currency', currency });
}
