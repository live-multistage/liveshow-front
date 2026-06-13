'use client';

import { Users, Calendar, Activity } from 'lucide-react';
import { OrganizationHeader } from '../components/OrganizationHeader';
import { OrganizationStatsCard } from '../components/OrganizationStatsCard';
import { RecentActivityCard } from '../components/RecentActivityCard';
import { useOrganization } from '../hooks/use-organizations';
import { useOrganizationMembers } from '../hooks/use-organization-members';
import styles from './OrganizationDashboardPage.module.scss';

interface Props {
  organizationId: string;
}

export function OrganizationDashboardPage({ organizationId }: Props) {
  const { data: org, isLoading: orgLoading, isError: orgError } = useOrganization(organizationId);
  const { data: members = [] } = useOrganizationMembers(organizationId);

  if (orgLoading) return <p className={styles.state}>Carregando...</p>;
  if (orgError || !org) {
    return <p className={`${styles.state} ${styles.stateError}`}>Organização não encontrada.</p>;
  }

  return (
    <div className={styles.page}>
      <OrganizationHeader organization={org} />

      <div className={styles.content}>
        <div className={styles.statsGrid}>
          <OrganizationStatsCard
            label="Membros"
            value={members.length}
            icon={<Users size={20} />}
          />
          <OrganizationStatsCard
            label="Eventos"
            value="—"
            icon={<Calendar size={20} />}
          />
          <OrganizationStatsCard
            label="Atividades"
            value="—"
            icon={<Activity size={20} />}
          />
        </div>

        <RecentActivityCard activities={[]} />
      </div>
    </div>
  );
}
