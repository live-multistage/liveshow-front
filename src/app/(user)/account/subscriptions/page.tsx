import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { SubscriptionList } from '@/features/subscriptions';
import styles from './page.module.scss';

export const metadata: Metadata = { title: 'Minhas assinaturas' };

export default async function AccountSubscriptionsPage() {
  const t = await getTranslations('account.subscriptions');

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{t('title')}</h1>
      <SubscriptionList />
    </div>
  );
}
