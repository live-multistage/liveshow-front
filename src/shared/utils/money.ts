// Order amounts are integer cents (see @live-show/api-contracts OrderView).
export function formatCents(cents: number, currency = 'BRL', locale = 'pt-BR'): string {
  return (cents / 100).toLocaleString(locale, { style: 'currency', currency });
}
