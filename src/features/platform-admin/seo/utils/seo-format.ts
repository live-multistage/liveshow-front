const INTL_LOCALE: Record<string, string> = { pt: 'pt-BR', en: 'en-US', es: 'es-ES' };

export const formatSeoDate = (iso: string, locale: string): string =>
  new Intl.DateTimeFormat(INTL_LOCALE[locale] ?? 'pt-BR', { dateStyle: 'short' }).format(new Date(iso));
