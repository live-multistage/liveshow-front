'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ExternalLink } from 'lucide-react';
import type { SeoPathOverride } from '@live-show/api-contracts';
import { Tabs } from '@live-show/design-system';
import { PlatformPageShell } from '../../components/PlatformPageShell';
import { SettingsAuditRail } from '../../components/SettingsAuditRail';
import { useSeoOverridesQuery } from '../queries/use-seo-admin';
import { SEO_PAGE_KEYS } from '@live-show/api-contracts';
import { GlobalTab } from './GlobalTab';
import { OverridesTab } from './OverridesTab';
import { PagesTab } from './PagesTab';
import { SeoEditorDrawer, type EditorTarget } from './SeoEditorDrawer';
import styles from './SeoAdminPage.module.scss';

// SUPER_ADMIN: page-type templates, per-URL overrides and site-wide SEO settings.
export function SeoAdminPage() {
  const t = useTranslations('platformAdmin.seo');
  const overrides = useSeoOverridesQuery();
  const [editing, setEditing] = useState<EditorTarget | null>(null);

  const actions = (
    <>
      <a href="/robots.txt" target="_blank" rel="noopener noreferrer" className={styles.action}>
        <ExternalLink size={14} /> {t('actions.robots')}
      </a>
      <Link href="/dashboard/platform/audit" className={styles.action}>{t('actions.audit')}</Link>
    </>
  );

  return (
    <PlatformPageShell group="CONFIG & GOVERNANÇA" title={t('title')} subtitle={t('subtitle')} actions={actions}>
      <div className={styles.grid}>
        <Tabs
          label={t('tabsLabel')}
          className={styles.main}
          items={[
            { value: 'pages', label: t('tabs.pages'), count: SEO_PAGE_KEYS.length },
            { value: 'urls', label: t('tabs.urls'), count: overrides.data?.length },
            { value: 'global', label: t('tabs.global') },
          ]}
        >
          {(tab) => (
            <div className={styles.panel}>
              {tab === 'pages' && <PagesTab onOpen={(pageKey) => setEditing({ kind: 'template', pageKey })} />}
              {tab === 'urls' && <OverridesTab onEdit={(override: SeoPathOverride | null) => setEditing({ kind: 'override', override })} />}
              {tab === 'global' && <GlobalTab />}
            </div>
          )}
        </Tabs>
        <SettingsAuditRail />
      </div>
      <SeoEditorDrawer
        target={editing}
        onClose={() => setEditing(null)}
        onOpenOverride={(override) => setEditing({ kind: 'override', override })}
      />
    </PlatformPageShell>
  );
}
