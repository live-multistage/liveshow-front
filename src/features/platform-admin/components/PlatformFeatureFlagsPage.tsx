'use client';

import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { Switch } from '@live-show/design-system';
import { useGlobalFlagsQuery, useSetGlobalFlagMutation } from '../queries/get-settings';
import { PlatformPageShell } from './PlatformPageShell';
import styles from './PlatformFeatureFlagsPage.module.scss';

// D7 companion — every global flag from GET /feature-flags with a name +
// description (i18n'd per key, unknown keys fall back to the raw key) and a
// PATCH toggle. Same data source as PlatformSettingsCard's flags list; this
// page is the dedicated, documented view of it.
export function PlatformFeatureFlagsPage() {
  const t = useTranslations('platformAdmin.featureFlags');
  const { data: flags, isLoading, isError } = useGlobalFlagsQuery();
  const setFlag = useSetGlobalFlagMutation();

  return (
    <PlatformPageShell group="CONFIG & GOVERNANÇA" title={t('title')} subtitle={t('subtitle')}>
      {isLoading && <div className={styles.empty}>{t('loading')}</div>}
      {isError && <div className={styles.empty}>{t('error')}</div>}

      {flags && (
        <div className={styles.list}>
          {Object.entries(flags).map(([key, enabled]) => (
            <div className={styles.card} key={key}>
              <div>
                <div className={styles.label}>{t.has(`${key}.name`) ? t(`${key}.name`) : key}</div>
                {t.has(`${key}.description`) && <div className={styles.sub}>{t(`${key}.description`)}</div>}
              </div>
              <Switch
                checked={enabled}
                disabled={setFlag.isPending}
                onCheckedChange={(checked) =>
                  setFlag.mutate(
                    { key, enabled: checked },
                    {
                      onSuccess: () => toast.success(t('toggleSuccess', { key, state: checked ? t('on') : t('off') })),
                      onError: () => toast.error(t('toggleError')),
                    },
                  )
                }
              />
            </div>
          ))}
        </div>
      )}
    </PlatformPageShell>
  );
}
