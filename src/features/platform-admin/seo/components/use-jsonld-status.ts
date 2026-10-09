import { useTranslations } from 'next-intl';
import type { JsonLdCheck } from '../utils/check-jsonld';

// Human text for a checkJsonLd result. `'reason' in` narrows reliably even without strictNullChecks.
export function useJsonLdStatusText(): (check: JsonLdCheck) => string {
  const t = useTranslations('platformAdmin.seo.editor.jsonld.status');
  return (check) => {
    if (!('reason' in check)) return t('ok');
    return check.reason === 'placeholder' ? t('placeholder', { name: check.detail ?? '' }) : t(check.reason);
  };
}
