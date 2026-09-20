// Display-only masks for the Asaas onboarding form. None of these change
// what gets submitted: the schema's own `.transform()` already reduces
// cpfCnpj/mobilePhone/postalCode to digits, and incomeValue is stored as a
// plain reais number regardless of how it's displayed here.

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

/** "123.456.789-09" for an 11-digit CPF, "12.345.678/0001-95" for a 14-digit CNPJ. */
export function formatCpfCnpj(value: string): string {
  const d = digitsOnly(value).slice(0, 14);
  if (d.length <= 11) {
    return d
      .replace(/^(\d{3})(\d)/, '$1.$2')
      .replace(/^(\d{3}\.\d{3})(\d)/, '$1.$2')
      .replace(/^(\d{3}\.\d{3}\.\d{3})(\d{1,2})$/, '$1-$2');
  }
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2}\.\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{2}\.\d{3}\.\d{3})(\d)/, '$1/$2')
    .replace(/^(\d{2}\.\d{3}\.\d{3}\/\d{4})(\d{1,2})$/, '$1-$2');
}

/** "(11) 3333-4444" for a 10-digit landline, "(11) 98888-7777" for an 11-digit mobile. */
export function formatPhone(value: string): string {
  const d = digitsOnly(value).slice(0, 11);
  if (d.length <= 10) {
    return d.replace(/^(\d{2})(\d)/, '($1) $2').replace(/^(\(\d{2}\) \d{4})(\d{1,4})$/, '$1-$2');
  }
  return d.replace(/^(\d{2})(\d)/, '($1) $2').replace(/^(\(\d{2}\) \d{5})(\d{1,4})$/, '$1-$2');
}

/** "01310-100" for an 8-digit CEP. */
export function formatPostalCode(value: string): string {
  return digitsOnly(value).slice(0, 8).replace(/^(\d{5})(\d{1,3})$/, '$1-$2');
}

/** Reads every digit typed as cents (a standard money-input mask): "5000000" -> 5,000,000 cents = R$50.000,00. */
export function digitsToCents(value: string): number {
  const d = digitsOnly(value);
  return d ? Number(d) : 0;
}

export function formatBRLFromCents(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
