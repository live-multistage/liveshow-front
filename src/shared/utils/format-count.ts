const UNITS = [
  { value: 1_000_000_000, suffix: 'B' },
  { value: 1_000_000, suffix: 'M' },
  { value: 1_000, suffix: 'k' },
];

// Short count for stat cards: 5536 → "5,5k", 10000 → "10k", 1500000 → "1,5M".
// Truncated, never rounded up — a catalog of 999 999 must not read "1M".
export function formatCount(value: number, locale = 'pt-BR'): string {
  const unit = UNITS.find((u) => Math.abs(value) >= u.value);
  if (!unit) return value.toLocaleString(locale);
  const scaled = Math.trunc((value / unit.value) * 10) / 10;
  return `${scaled.toLocaleString(locale, { maximumFractionDigits: 1 })}${unit.suffix}`;
}
