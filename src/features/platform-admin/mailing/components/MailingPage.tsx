'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { PlatformPageShell } from '../../components/PlatformPageShell';
import { TemplatesTab } from './TemplatesTab';
import { CampaignsTab } from './CampaignsTab';
import styles from './MailingPage.module.scss';

type Tab = 'templates' | 'campaigns';

export function MailingPage() {
  const t = useTranslations('platformAdmin.mailing');
  const router = useRouter();
  const pathname = usePathname();
  const tab: Tab = useSearchParams().get('tab') === 'campaigns' ? 'campaigns' : 'templates';
  const select = (next: Tab) => router.replace(next === 'campaigns' ? `${pathname}?tab=campaigns` : pathname);

  return (
    <PlatformPageShell
      group={t('page.group')}
      title={t('page.title')}
      subtitle={t('page.subtitle')}
      actions={
        tab === 'templates'
          ? <Link className={styles.primary} href="/dashboard/platform/mailing/templates/new">{t('templates.new')}</Link>
          : <Link className={styles.primary} href="/dashboard/platform/mailing/campaigns/new">{t('campaigns.new')}</Link>
      }
    >
      <div role="tablist" className={styles.tabs}>
        {(['templates', 'campaigns'] as const).map((key) => (
          <button key={key} role="tab" type="button" aria-selected={tab === key} className={styles.tab} onClick={() => select(key)}>
            {t(key === 'templates' ? 'page.tabTemplates' : 'page.tabCampaigns')}
          </button>
        ))}
      </div>
      <div role="tabpanel">{tab === 'templates' ? <TemplatesTab /> : <CampaignsTab />}</div>
    </PlatformPageShell>
  );
}
