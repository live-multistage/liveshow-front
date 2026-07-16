'use client';

import { useAuthCheck } from '@/features/account';
import { SuperAdminDashboard } from './SuperAdminDashboard';
import { AdminDashboard } from './AdminDashboard';
import { OrganizerDashboard } from './OrganizerDashboard';
import { ArtistDashboard } from './ArtistDashboard';
import { DashboardContentLoading } from './DashboardContentLoading';

export function RoleDashboardOverview() {
  // Super-admins hold ADMIN too, so manage_platform is also true for them —
  // check the super-admin permission FIRST to route them to the global panel.
  const { data: superCheck, isLoading: superLoading } = useAuthCheck('access_platform_admin');
  const { data: adminCheck, isLoading: adminLoading } = useAuthCheck('manage_platform');
  const { data: organizerCheck, isLoading: organizerLoading } = useAuthCheck('manage_organization');
  const { data: artistCheck, isLoading: artistLoading } = useAuthCheck('manage_artist_profile');

  if (superLoading || adminLoading || organizerLoading || artistLoading) return <DashboardContentLoading />;

  if (superCheck?.allowed) return <SuperAdminDashboard />;
  if (adminCheck?.allowed) return <AdminDashboard />;
  if (organizerCheck?.allowed) return <OrganizerDashboard />;
  if (artistCheck?.allowed) return <ArtistDashboard />;

  return null;
}
