import type { Metadata } from 'next';
import { AccountPageContent } from '@/features/account';

export const metadata: Metadata = { title: 'Minha conta' };

export default function AccountPage() {
  return <AccountPageContent />;
}
