import { useTranslations } from 'next-intl';

// Fictional values for previewing {{variables}}; the copy lives in i18n so each locale gets its own sample.
export function useSampleValue(): (name: string) => string {
  const t = useTranslations('platformAdmin.seo.sampleData');
  return (name) => t(name);
}
