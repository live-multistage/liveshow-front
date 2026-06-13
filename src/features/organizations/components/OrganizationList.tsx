'use client';

import { Building2 } from 'lucide-react';
import type { OrganizationResponse } from '../types/organization.types';
import { OrganizationCard } from './OrganizationCard';
import styles from './OrganizationList.module.scss';

interface Props {
  organizations: OrganizationResponse[];
  emptySlot?: React.ReactNode;
}

export function OrganizationList({ organizations, emptySlot }: Props) {
  if (organizations.length === 0) {
    return (
      <div className={styles.empty}>
        <Building2 size={40} className={styles.emptyIcon} />
        <p className={styles.emptyText}>Nenhuma organização encontrada.</p>
        {emptySlot}
      </div>
    );
  }

  return (
    <div className={styles.list}>
      {organizations.map((org) => (
        <OrganizationCard key={org.id} organization={org} />
      ))}
    </div>
  );
}
