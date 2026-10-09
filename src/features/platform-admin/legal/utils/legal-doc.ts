import type { LegalDocumentContent, LegalDocumentKind } from '@live-show/api-contracts';

export const LEGAL_KINDS: LegalDocumentKind[] = ['terms', 'privacy'];
export const LEGAL_LOCALES = ['pt', 'en', 'es'] as const;
export type LegalLocale = (typeof LEGAL_LOCALES)[number];
export type LegalTexts = Record<LegalLocale, string>;

export const PUBLIC_PATH: Record<LegalDocumentKind, string> = { terms: '/termos', privacy: '/privacidade' };

export const versionUrl = (kind: LegalDocumentKind, version: number) => `${PUBLIC_PATH[kind]}/versoes/${version}`;

export const EMPTY_TEXTS: LegalTexts = { pt: '', en: '', es: '' };

export const toTexts = (content: LegalDocumentContent): LegalTexts => ({
  pt: content.pt,
  en: content.en ?? '',
  es: content.es ?? '',
});

// Blank EN/ES are omitted so the public page falls back to PT.
export const toContent = (texts: LegalTexts): LegalDocumentContent => ({
  pt: texts.pt,
  ...(texts.en.trim() ? { en: texts.en } : {}),
  ...(texts.es.trim() ? { es: texts.es } : {}),
});

export const changedLocales = (texts: LegalTexts, base: LegalTexts): LegalLocale[] =>
  LEGAL_LOCALES.filter((l) => texts[l] !== base[l]);

export const includedLocales = (texts: LegalTexts): LegalLocale[] =>
  LEGAL_LOCALES.filter((l) => l === 'pt' || texts[l].trim() !== '');

const draftKey = (kind: LegalDocumentKind) => `showon-legal-draft-${kind}`;

// Local draft is a convenience: storage may be unavailable, never let it break the editor.
export function loadDraft(kind: LegalDocumentKind): LegalTexts | null {
  try {
    const raw = localStorage.getItem(draftKey(kind));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LegalTexts>;
    return { ...EMPTY_TEXTS, ...parsed };
  } catch {
    return null;
  }
}

export function saveDraft(kind: LegalDocumentKind, texts: LegalTexts | null) {
  try {
    if (texts) localStorage.setItem(draftKey(kind), JSON.stringify(texts));
    else localStorage.removeItem(draftKey(kind));
  } catch {
    /* storage unavailable */
  }
}

const INTL_LOCALE: Record<string, string> = { pt: 'pt-BR', en: 'en-US', es: 'es-ES' };

export function formatLegalDate(iso: string, locale: string, withTime = false): string {
  return new Intl.DateTimeFormat(INTL_LOCALE[locale] ?? 'pt-BR', {
    dateStyle: 'short',
    ...(withTime ? { timeStyle: 'short' } : {}),
  }).format(new Date(iso));
}
