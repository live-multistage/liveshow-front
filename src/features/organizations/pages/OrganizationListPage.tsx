'use client';

import { OrganizationList } from '../components/OrganizationList';
import { CreateOrganizationButton } from '../components/CreateOrganizationButton';
import { useOrganizations } from '../hooks/use-organizations';
import styles from './OrganizationListPage.module.scss';

export function OrganizationListPage() {
  const { data: organizations = [], isLoading, isError } = useOrganizations();

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.heading}>Organizações</h1>
          <p className={styles.subheading}>Gerencie suas organizações e equipes</p>
        </div>
        <CreateOrganizationButton />
      </div>

      {isLoading && <p className={styles.state}>Carregando organizações...</p>}

      {isError && (
        <p className={`${styles.state} ${styles.stateError}`}>
          Erro ao carregar organizações. Tente novamente.
        </p>
      )}

      {!isLoading && !isError && (
        <OrganizationList
          organizations={organizations}
          emptySlot={<CreateOrganizationButton />}
        />
      )}
    </div>
  );
}
