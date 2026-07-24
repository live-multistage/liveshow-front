export interface CurrencyOption {
  code: string;
  label: string;
}

// ponytail: static list covers the currencies this platform actually supports;
// swap for Intl.supportedValuesOf('currency') if the team wants the full
// ISO-4217 set with zero maintenance.
export const ISO_CURRENCIES: CurrencyOption[] = [
  { code: 'BRL', label: 'Real brasileiro (BRL)' },
  { code: 'USD', label: 'US Dollar (USD)' },
  { code: 'EUR', label: 'Euro (EUR)' },
  { code: 'GBP', label: 'British Pound (GBP)' },
  { code: 'JPY', label: 'Japanese Yen (JPY)' },
  { code: 'ARS', label: 'Peso argentino (ARS)' },
  { code: 'MXN', label: 'Peso mexicano (MXN)' },
  { code: 'CAD', label: 'Canadian Dollar (CAD)' },
  { code: 'AUD', label: 'Australian Dollar (AUD)' },
  { code: 'CHF', label: 'Swiss Franc (CHF)' },
  { code: 'CNY', label: 'Chinese Yuan (CNY)' },
  { code: 'PYG', label: 'Guaraní paraguayo (PYG)' },
  { code: 'UYU', label: 'Peso uruguayo (UYU)' },
  { code: 'CLP', label: 'Peso chileno (CLP)' },
  { code: 'COP', label: 'Peso colombiano (COP)' },
];

export const DEFAULT_CURRENCY = 'BRL';
