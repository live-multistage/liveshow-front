'use client';

import { Plus } from 'lucide-react';
import Link from 'next/link';
import styles from './CreateOrganizationButton.module.scss';

export function CreateOrganizationButton() {
  return (
    <Link href="/dashboard/organizations/new" className={styles.btn}>
      <Plus size={16} />
      Nova Organização
    </Link>
  );
}
