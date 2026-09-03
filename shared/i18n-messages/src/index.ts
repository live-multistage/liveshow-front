import pt from '../pt.json';
import en from '../en.json';
import es from '../es.json';

export const LOCALES = ['pt', 'en', 'es'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'pt';

export type Messages = typeof pt;

export const messages: Record<Locale, Messages> = { pt, en: en as Messages, es: es as Messages };

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}
