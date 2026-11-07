// "14", "14,00", "1.400,50" -> centavos. Vazio, negativo ou lixo -> null.
export function reaisInputToCents(input: string): number | null {
  const cleaned = input.replace(/R\$/gi, '').replace(/\s/g, '');
  if (cleaned === '') return null;
  const normalized = cleaned.includes(',') ? cleaned.replace(/\./g, '').replace(',', '.') : cleaned;
  if (!/^\d+(\.\d+)?$/.test(normalized)) return null;
  const cents = Math.round(Number(normalized) * 100);
  return Number.isFinite(cents) ? cents : null;
}

export function centsToReaisInput(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
