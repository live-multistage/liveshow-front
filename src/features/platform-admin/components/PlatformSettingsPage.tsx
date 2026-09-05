'use client';

import { useTranslations } from 'next-intl';
import { Clock } from 'lucide-react';
import { PlatformPageShell } from './PlatformPageShell';
import { FeesSection } from './FeesSection';
import { FeatureFlagsSection } from './FeatureFlagsSection';
import { SettingsAuditRail } from './SettingsAuditRail';
import styles from './PlatformSettingsPage.module.scss';

// D7 — Configurações. Default fee (editable), buyer fee (read-only,
// CART_TAX_RATE) and every global feature flag, each change audited.
// Replaces the old overview PlatformSettingsCard and the standalone
// /dashboard/platform/feature-flags page (now a redirect here, #feature-flags).
export function PlatformSettingsPage() {
  const t = useTranslations('platformAdmin.settings');

  return (
    <PlatformPageShell
      group="CONFIG & GOVERNANÇA"
      title={t('title')}
      subtitle={t('subtitle')}
      actions={
        <>
          <span className={styles.envBadge}>
            <span className={styles.envDot} />
            {t('env', { env: (process.env.NODE_ENV ?? '').toUpperCase() })}
          </span>
          <a href="/dashboard/platform/audit" className={styles.btnOutline}>
            <Clock size={13} /> {t('auditLink')}
          </a>
        </>
      }
    >
      <div className={styles.grid}>
        <div className={styles.main}>
          <FeesSection />
          <FeatureFlagsSection />
        </div>
        <SettingsAuditRail />
      </div>
    </PlatformPageShell>
  );
}
