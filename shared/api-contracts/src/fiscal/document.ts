export function normalizeTaxDocument(raw: string): string {
  return raw.replace(/\D/g, '');
}

function checksum(digits: string, weights: number[]): number {
  const sum = weights.reduce((acc, w, i) => acc + Number(digits[i]) * w, 0);
  const mod = sum % 11;
  return mod < 2 ? 0 : 11 - mod;
}

function isCpf(d: string): boolean {
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const d1 = checksum(d, [10, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = checksum(d, [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]);
  return d1 === Number(d[9]) && d2 === Number(d[10]);
}

function isCnpj(d: string): boolean {
  if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false;
  const d1 = checksum(d, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = checksum(d, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return d1 === Number(d[12]) && d2 === Number(d[13]);
}

/** CPF (11 digits) or CNPJ (14 digits) with valid check digits. Mask-tolerant. */
export function isCpfOrCnpj(raw: string): boolean {
  const d = normalizeTaxDocument(raw);
  return isCpf(d) || isCnpj(d);
}
