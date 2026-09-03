export function formatPrice(price: number, currency = 'BRL', locale = 'pt-BR') {
  // ponytail: newer ICU renders a non-breaking space between symbol and
  // amount; normalize to a regular space so the string is consistent across
  // Node/browser/React Native ICU versions and matches simple string equality.
  return price.toLocaleString(locale, { style: 'currency', currency }).replace(/[\ \ ]/g, ' ');
}

export function formatPriceRangeCents(
  range: { fromCents: number; toCents: number } | null,
  opts: { freeLabel?: string; currency?: string; locale?: string } = {},
): string {
  const { freeLabel = 'Grátis', currency = 'BRL', locale = 'pt-BR' } = opts;
  if (!range) return freeLabel;
  const { fromCents, toCents } = range;
  if (fromCents === 0 && toCents === 0) return freeLabel;
  if (fromCents === toCents) return formatPrice(fromCents / 100, currency, locale);
  if (fromCents === 0) return `${freeLabel} – ${formatPrice(toCents / 100, currency, locale)}`;
  return `${formatPrice(fromCents / 100, currency, locale)} – ${formatPrice(toCents / 100, currency, locale)}`;
}

export function formatEventDate(iso: string, locale = 'pt-BR') {
  return new Date(iso).toLocaleDateString(locale, {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  });
}

export function formatEventDateShort(iso: string, locale = 'pt-BR') {
  return new Date(iso).toLocaleDateString(locale, {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
  });
}

export function formatEventTime(iso: string, locale = 'pt-BR') {
  return new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
}

export function formatDuration(startsAt: string, endsAt: string) {
  const ms = Math.max(0, new Date(endsAt).getTime() - new Date(startsAt).getTime());
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}
