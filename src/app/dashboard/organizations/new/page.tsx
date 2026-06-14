import type { Metadata } from 'next';
import { CreateOrganizationPage } from '@/features/organizations';

export const metadata: Metadata = { title: 'Nova organização' };

export default function NewOrganizationPage() {
  return <CreateOrganizationPage />;
}
