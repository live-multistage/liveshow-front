import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { AccountShell, NotificationPreferencesPanel } from '@/features/account';
import { AccountNotificationsContent } from '@/features/notifications';

export const metadata: Metadata = { title: 'Notificações' };

export default async function AccountNotificationsPage() {
  const t = await getTranslations('account.notificationsCenter');

  return (
    <AccountShell activeNav="notifications" sectionScroll={false}>
      <AccountNotificationsContent />
      <NotificationPreferencesPanel labelKey={t('prefsEyebrow')} titleKey={t('prefsTitle')} />
    </AccountShell>
  );
}
