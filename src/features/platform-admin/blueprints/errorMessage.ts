import type { useTranslations } from 'next-intl';

// Backend codes this feature can receive: analyzer codes (BlueprintAnalysisCode,
// surfaced via the `errors.*` namespace already) plus the admin service's own
// codes (blueprint-admin.service.ts) — BLUEPRINT_NOT_FOUND, VERSION_NOT_FOUND,
// NOT_PUBLISHED, ANALYSIS_FAILED. Any other/unknown code falls back to GENERIC
// so the admin never sees a raw i18n key (next-intl has no getMessageFallback).
type BlueprintsTranslator = ReturnType<typeof useTranslations>;

export function blueprintErrorMessage(t: BlueprintsTranslator, code?: string | null): string {
  return code && t.has(`errors.${code}`) ? t(`errors.${code}`) : t('errors.GENERIC');
}
