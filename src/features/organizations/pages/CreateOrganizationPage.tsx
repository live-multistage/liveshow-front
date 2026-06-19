'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { OrganizationForm } from '../components/OrganizationForm';
import { useCreateOrganization } from '../hooks/use-create-organization';
import styles from './CreateOrganizationPage.module.scss';

export function CreateOrganizationPage() {
  const router = useRouter();
  const mutation = useCreateOrganization((org) => {
    router.push(`/dashboard/organizations/${org.id}`);
  });

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.back} onClick={() => router.push('/dashboard/organizations')}>
          <ArrowLeft size={16} />
          Organizações
        </button>
        <div>
          <h1 className={styles.heading}>Nova Organização</h1>
          <p className={styles.subheading}>Crie uma organização e adicione membros</p>
        </div>
      </div>

      <div className={styles.body}>
        <OrganizationForm
          onSubmit={(values) => mutation.mutate({ name: values.name, slug: values.slug, description: values.description })}
          isPending={mutation.isPending}
          error={mutation.error?.message}
          submitLabel="Criar Organização"
        />
      </div>
    </div>
  );
}
