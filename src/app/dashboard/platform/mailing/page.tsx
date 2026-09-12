import type { Metadata } from 'next';
import { requireFeatureFlag } from '@/features/feature-flags';
import { MailingPage } from '@/features/platform-admin/mailing';

export const metadata: Metadata = { title: 'Plataforma — E-mails' };

export default async function Page() {
  await requireFeatureFlag('mailing');
  return <MailingPage />;
}
