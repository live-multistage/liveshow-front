import type { Metadata } from 'next';
import { OrganizationListPage } from '@/features/organizations';

export const metadata: Metadata = { title: 'Organizações' };

export default function OrganizationsPage() {
  return <OrganizationListPage />;
}
