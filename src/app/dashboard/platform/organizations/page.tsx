import type { Metadata } from 'next';
import { OrganizationDirectoryPage } from '@/features/platform-admin';

export const metadata: Metadata = { title: 'Plataforma — Organizações' };

export default function PlatformOrganizationsPage() {
  return <OrganizationDirectoryPage />;
}
