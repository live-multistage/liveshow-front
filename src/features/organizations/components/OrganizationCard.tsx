'use client';

import { Building2, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { OrganizationResponse } from '../types/organization.types';
import styles from './OrganizationCard.module.scss';

interface Props {
  organization: OrganizationResponse;
}

export function OrganizationCard({ organization }: Props) {
  const router = useRouter();

  return (
    <button
      className={styles.card}
      onClick={() => router.push(`/dashboard/organizations/${organization.id}`)}
    >
      <div className={styles.icon}>
        {organization.logoUrl ? (
          <img src={organization.logoUrl} alt={organization.name} className={styles.logo} />
        ) : (
          <Building2 size={24} />
        )}
      </div>
      <div className={styles.info}>
        <h3 className={styles.name}>{organization.name}</h3>
        <p className={styles.slug}>@{organization.slug}</p>
        {organization.description && (
          <p className={styles.description}>{organization.description}</p>
        )}
      </div>
      <ChevronRight size={16} className={styles.arrow} />
    </button>
  );
}
