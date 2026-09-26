// Symbol per ISO currency for the compact financial cards. Falls back to the
// code itself (e.g. "COP 12,3k") for anything not listed — no FX conversion,
// figures are always shown in their own currency.
const CURRENCY_SYMBOL: Record<string, string> = { BRL: 'R$', USD: 'US$', EUR: '€', GBP: '£' };

// Compact money in a given currency (R$ 84,2k / US$ 3.67M-style, pt-BR digits).
export function moneyCompact(n: number, currency = 'BRL'): string {
  const sym = CURRENCY_SYMBOL[currency] ?? currency;
  if (Math.abs(n) < 1000) return `${sym} ${Math.round(n)}`;
  if (Math.abs(n) < 1_000_000) return `${sym} ${(n / 1000).toFixed(1).replace('.', ',').replace(',0', '')}k`;
  return `${sym} ${(n / 1_000_000).toFixed(2).replace('.', ',')}M`;
}

// Exact money, for surfaces where the rounding of moneyCompact would hide the
// figure being inspected (a chart tooltip: "R$ 36,8k" is the bar you already
// see, "R$ 36.842,17" is why you hovered it).
export function moneyExact(n: number, currency = 'BRL'): string {
  const sym = CURRENCY_SYMBOL[currency] ?? currency;
  const digits = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
  return `${sym} ${digits}`;
}

// Compact BRL — kept for genuinely BRL-only surfaces.
export function brlCompact(n: number): string {
  return moneyCompact(n, 'BRL');
}

// 0.035 → "3,5%"
export function ratePct(rate: number): string {
  return `${(rate * 100).toFixed(1).replace('.', ',').replace(',0', '')}%`;
}

// next-intl locale code → Intl locale used for audit-log timestamps.
const AUDIT_LOCALE_MAP: Record<string, string> = { pt: 'pt-BR', en: 'en-US', es: 'es-419' };

// "2026-08-12T14:02:00.000Z" + "pt" → "12 ago, 14:02"
export function formatAuditWhen(iso: string, locale: string): string {
  const intlLocale = AUDIT_LOCALE_MAP[locale] ?? 'pt-BR';
  return new Intl.DateTimeFormat(intlLocale, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}
