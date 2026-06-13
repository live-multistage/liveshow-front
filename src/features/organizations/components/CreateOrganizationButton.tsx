'use client';

import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import styles from './CreateOrganizationButton.module.scss';

export function CreateOrganizationButton() {
  const router = useRouter();

  return (
    <button
      className={styles.btn}
      onClick={() => router.push('/dashboard/organizations/new')}
    >
      <Plus size={16} />
      Nova Organização
    </button>
  );
}
