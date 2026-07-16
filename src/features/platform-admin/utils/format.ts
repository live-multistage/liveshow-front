// Compact BRL for the super-admin financial cards (R$ 84,2k / R$ 3,67M).
export function brlCompact(n: number): string {
  if (Math.abs(n) < 1000) return `R$ ${Math.round(n)}`;
  if (Math.abs(n) < 1_000_000) return `R$ ${(n / 1000).toFixed(1).replace('.', ',').replace(',0', '')}k`;
  return `R$ ${(n / 1_000_000).toFixed(2).replace('.', ',')}M`;
}

// 0.035 → "3,5%"
export function ratePct(rate: number): string {
  return `${(rate * 100).toFixed(1).replace('.', ',').replace(',0', '')}%`;
}
