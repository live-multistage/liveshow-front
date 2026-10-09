import type { LegalDocumentContent } from '@live-show/api-contracts';

export function pickLocaleContent(content: LegalDocumentContent, locale: string): string {
  const localized = locale === 'en' || locale === 'es' ? content[locale] : undefined;
  return localized?.trim() ? localized : content.pt;
}
