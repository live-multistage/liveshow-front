'use client';

import { useRouter } from 'next/navigation';
import { Plus, Building2, Users } from 'lucide-react';
import { useAuth } from '@/features/account';
import { useMyOrganizationsQuery } from '../queries/get-my-organizations';
import styles from './OrganizationsPageContent.module.scss';

export function OrganizationsPageContent() {
  const router = useRouter();
  const { user } = useAuth();
  const { data: orgs = [], isLoading, isError } = useMyOrganizationsQuery();
  const isAdmin = user?.role === 'ADMIN';

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.heading}>Organizações</h1>
          <p className={styles.subheading}>Gerencie suas organizações e equipes</p>
        </div>
        {isAdmin && (
          <button className={styles.createBtn} onClick={() => router.push('/dashboard/organizations/new')}>
            <Plus size={16} />
            Nova Organização
          </button>
        )}
      </div>

      {isLoading && <p className={styles.state}>Carregando organizações...</p>}
      {isError && <p className={`${styles.state} ${styles.stateError}`}>Erro ao carregar organizações.</p>}

      {!isLoading && !isError && orgs.length === 0 && (
        <div className={styles.empty}>
          <Building2 size={40} className={styles.emptyIcon} />
          <p>Nenhuma organização encontrada.</p>
          {isAdmin && (
            <button className={styles.createBtn} onClick={() => router.push('/dashboard/organizations/new')}>
              <Plus size={14} /> Criar primeira organização
            </button>
          )}
        </div>
      )}

      {!isLoading && orgs.length > 0 && (
        <div className={styles.grid}>
          {orgs.map((org) => (
            <div
              key={org.id}
              className={styles.orgCard}
              onClick={() => router.push(`/dashboard/organizations/${org.id}`)}
            >
              <div className={styles.orgIcon}>
                <Building2 size={24} />
              </div>
              <div className={styles.orgInfo}>
                <h3 className={styles.orgName}>{org.name}</h3>
                <p className={styles.orgSlug}>@{org.slug}</p>
              </div>
              <div className={styles.orgMeta}>
                <Users size={14} />
                <span>Gerenciar membros</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
