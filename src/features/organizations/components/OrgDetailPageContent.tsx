'use client';

import { useState } from 'react';
import { UserPlus, Trash2, Crown, Shield, User, Music, ArrowLeft, Search } from 'lucide-react';
import Link from 'next/link';
import { useOrgMembersQuery } from '../queries/get-members';
import { useAddMemberMutation } from '../mutations/add-member.mutation';
import { useRemoveMemberMutation } from '../mutations/remove-member.mutation';
import { organizationsService } from '../api/organizations.service';
import type { OrganizationResponse, OrganizationRole, UserSearchResult } from '../types/organization.types';
import styles from './OrgDetailPageContent.module.scss';

const ROLE_ICONS: Record<OrganizationRole, React.ReactNode> = {
  OWNER: <Crown size={14} />,
  ADMIN: <Shield size={14} />,
  EVENT_MANAGER: <Music size={14} />,
  CONTENT_MANAGER: <Music size={14} />,
  OPERATOR: <Music size={14} />,
  VIEWER: <User size={14} />,
};

const ROLE_LABEL: Record<OrganizationRole, string> = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  EVENT_MANAGER: 'Gestor de Eventos',
  CONTENT_MANAGER: 'Gestor de Conteúdo',
  OPERATOR: 'Operador',
  VIEWER: 'Visualizador',
};

interface Props {
  org: OrganizationResponse;
  currentUserId: string;
}

export function OrgDetailPageContent({ org, currentUserId }: Props) {
  const [searchEmail, setSearchEmail] = useState('');
  const [searchResult, setSearchResult] = useState<UserSearchResult | null>(null);
  const [searchError, setSearchError] = useState('');
  const [searching, setSearching] = useState(false);

  const [addRole, setAddRole] = useState<OrganizationRole>('VIEWER');
  const [addError, setAddError] = useState('');

  const { data: members = [], isLoading } = useOrgMembersQuery(org.id);
  const addMutation = useAddMemberMutation(org.id);
  const removeMutation = useRemoveMemberMutation(org.id);

  const currentMember = members.find((m) => m.userId === currentUserId);
  const canManage = currentMember?.role === 'OWNER' || currentMember?.role === 'ADMIN';

  const handleSearch = async () => {
    if (!searchEmail.trim()) { setSearchError('Informe o e-mail'); return; }
    setSearchError('');
    setSearchResult(null);
    setSearching(true);
    try {
      const result = await organizationsService.searchUser(searchEmail.trim());
      setSearchResult(result);
    } catch {
      setSearchError('Usuário não encontrado');
    } finally {
      setSearching(false);
    }
  };

  const handleAdd = () => {
    if (!searchResult) return;
    setAddError('');
    addMutation.mutate(
      { userId: searchResult.id, role: addRole },
      {
        onSuccess: () => {
          setSearchEmail('');
          setSearchResult(null);
          setAddRole('VIEWER');
        },
        onError: (e) => setAddError(e.message),
      },
    );
  };

  return (
    <div className={styles.page}>
      <Link href="/dashboard/organizations" className={styles.back}>
        <ArrowLeft size={16} /> Organizações
      </Link>

      <div className={styles.header}>
        <div>
          <h1 className={styles.heading}>{org.name}</h1>
          <p className={styles.slug}>@{org.slug}</p>
        </div>
      </div>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Membros ({members.length})</h2>

        {isLoading && <p className={styles.state}>Carregando membros...</p>}

        <div className={styles.memberList}>
          {members.map((member) => (
            <div key={member.id} className={styles.memberRow}>
              <div className={styles.memberRole}>
                {ROLE_ICONS[member.role]}
                <span className={styles.roleBadge} data-role={member.role}>
                  {ROLE_LABEL[member.role]}
                </span>
              </div>
              <div className={styles.memberInfo}>
                <span className={styles.memberName}>
                  {member.displayName ?? member.userId}
                </span>
                {member.email && (
                  <span className={styles.memberEmail}>{member.email}</span>
                )}
              </div>
              <span className={styles.memberDate}>
                {new Date(member.joinedAt).toLocaleDateString('pt-BR')}
              </span>
              {canManage && member.role !== 'OWNER' && (
                <button
                  className={styles.removeBtn}
                  onClick={() => removeMutation.mutate(member.userId)}
                  disabled={removeMutation.isPending}
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>

        {canManage && (
          <div className={styles.addMember}>
            <h3 className={styles.addTitle}>Adicionar Membro</h3>

            <div className={styles.searchRow}>
              <input
                className={styles.input}
                type="email"
                placeholder="E-mail do usuário"
                value={searchEmail}
                onChange={(e) => { setSearchEmail(e.target.value); setSearchResult(null); setSearchError(''); }}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <button className={styles.searchBtn} onClick={handleSearch} disabled={searching}>
                <Search size={14} />
                {searching ? 'Buscando...' : 'Buscar'}
              </button>
            </div>

            {searchError && <p className={styles.error}>{searchError}</p>}

            {searchResult && (
              <div className={styles.foundUser}>
                <div className={styles.foundUserInfo}>
                  <span className={styles.foundUserName}>{searchResult.displayName}</span>
                  <span className={styles.foundUserEmail}>{searchResult.email}</span>
                </div>
                <div className={styles.addRow}>
                  <select
                    className={styles.select}
                    value={addRole}
                    onChange={(e) => setAddRole(e.target.value as OrganizationRole)}
                  >
                    <option value="CONTENT_MANAGER">Gestor de Conteúdo</option>
                    <option value="EVENT_MANAGER">Gestor de Eventos</option>
                    <option value="OPERATOR">Operador</option>
                    <option value="VIEWER">Visualizador</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                  <button
                    className={styles.addBtn}
                    onClick={handleAdd}
                    disabled={addMutation.isPending}
                  >
                    <UserPlus size={14} />
                    {addMutation.isPending ? 'Adicionando...' : 'Adicionar'}
                  </button>
                </div>
                {addError && <p className={styles.error}>{addError}</p>}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
