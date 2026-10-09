import { useTranslations } from 'next-intl';
import { SEO_PAGE_VARIABLES } from '@live-show/api-contracts';

const KNOWN = new Set(Object.values(SEO_PAGE_VARIABLES).flat());

// Fictional values for previewing {{variables}}; the copy lives in i18n so each locale gets its own sample.
// Unknown names return undefined without touching t() (no MISSING_MESSAGE noise).
export function useSampleValue(): (name: string) => string | undefined {
  const t = useTranslations('platformAdmin.seo.sampleData');
  return (name) => (KNOWN.has(name) ? t(name) : undefined);
}
