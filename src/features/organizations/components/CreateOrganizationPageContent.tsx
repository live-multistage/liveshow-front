'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { CreateOrganizationForm } from './CreateOrganizationForm';
import { MY_ORGANIZATIONS_KEY } from '../queries/get-my-organizations';
import styles from './CreateOrganizationPageContent.module.scss';

export function CreateOrganizationPageContent() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.back} onClick={() => router.back()}>
          <ArrowLeft size={16} />
          Organizações
        </button>
        <div>
          <h1 className={styles.heading}>Nova Organização</h1>
          <p className={styles.subheading}>Crie uma organização e adicione membros</p>
        </div>
      </div>

      <div className={styles.body}>
        <CreateOrganizationForm
          onSuccess={(org) => {
            queryClient.invalidateQueries({ queryKey: MY_ORGANIZATIONS_KEY });
            router.push(`/dashboard/organizations/${org.id}`);
          }}
        />
      </div>
    </div>
  );
}
