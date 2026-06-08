'use client';

import { useAuthCheck } from '@/features/account';
import { AdminDashboard } from './AdminDashboard';
import { OrganizerDashboard } from './OrganizerDashboard';
import { ArtistDashboard } from './ArtistDashboard';

export function RoleDashboardOverview() {
  const { data: adminCheck, isLoading: adminLoading } = useAuthCheck('manage_platform');
  const { data: organizerCheck, isLoading: organizerLoading } = useAuthCheck('manage_organization');
  const { data: artistCheck, isLoading: artistLoading } = useAuthCheck('manage_artist_profile');

  if (adminLoading || organizerLoading || artistLoading) return null;

  if (adminCheck?.allowed) return <AdminDashboard />;
  if (organizerCheck?.allowed) return <OrganizerDashboard />;
  if (artistCheck?.allowed) return <ArtistDashboard />;

  return null;
}
