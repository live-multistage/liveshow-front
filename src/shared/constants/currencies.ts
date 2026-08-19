export interface CurrencyOption {
  code: string;
  label: string;
}

const displayNames = new Intl.DisplayNames(['pt-BR'], { type: 'currency' });

export const ISO_CURRENCIES: CurrencyOption[] = Intl.supportedValuesOf('currency')
  .map((code) => ({ code, label: `${displayNames.of(code)} (${code})` }))
  .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));

export const DEFAULT_CURRENCY = 'BRL';
