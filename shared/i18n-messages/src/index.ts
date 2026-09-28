export const LOCALES = ['pt', 'en', 'es'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'pt';

// Type-only: the JSON never lands in the runtime bundle just for this shape.
export type Messages = typeof import('../pt.json');

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

// One dynamic import per locale (a switch, not a template literal) so
// bundlers split each catalog into its own chunk — a server render only
// pays for the locale it actually needs instead of all three.
export async function loadMessages(locale: Locale): Promise<Messages> {
  switch (locale) {
    case 'pt':
      return (await import('../pt.json')).default;
    case 'en':
      return (await import('../en.json')).default as Messages;
    case 'es':
      return (await import('../es.json')).default as Messages;
  }
}
