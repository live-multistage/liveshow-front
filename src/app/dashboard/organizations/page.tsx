import type { Metadata } from 'next';
import { Suspense } from 'react';
import { OrganizationListPage } from '@/features/organizations';

export const metadata: Metadata = { title: 'Organizações' };

// OrganizationListPage reads ?tab=&q=&page= with useSearchParams; without the
// Suspense boundary the build bails the whole page out to client rendering.
export default function DashboardOrganizationsPage() {
  return (
    <Suspense>
      <OrganizationListPage />
    </Suspense>
  );
}
