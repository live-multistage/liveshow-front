export const SEO_LIMITS = {
  title: 200,
  description: 350,
  keywords: 500,
  keywordTerms: 30,
  keywordTermLength: 100,
  jsonLdBytes: 65536,
  jsonLdBlocks: 5,
} as const;

// Recommended display ranges (min, max) shown as hints in the admin; not enforced.
export const SEO_OPTIMAL = { title: [50, 60], description: [120, 160] } as const;

export const OG_LOCALE: Record<'pt-BR' | 'en' | 'es', string> = { 'pt-BR': 'pt_BR', en: 'en_US', es: 'es_ES' };
