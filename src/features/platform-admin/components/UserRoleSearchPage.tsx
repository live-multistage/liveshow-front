'use client';

import { useState } from 'react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/shared/components/ui/table';
import { Badge } from '@/shared/components/ui/badge';
import { useAuth } from '@/features/account';
import { useSearchUsersQuery } from '../queries/search-users';
import { useChangeUserRoleMutation } from '../mutations/change-user-role.mutation';
import type { PlatformRole } from '../types/platform-admin.types';
import styles from './UserRoleSearchPage.module.scss';

const ALL_ROLES: PlatformRole[] = ['USER', 'ARTIST', 'ORGANIZER', 'ADMIN', 'SUPER_ADMIN'];

export function UserRoleSearchPage() {
  const [query, setQuery] = useState('');
  const { user: currentUser } = useAuth();
  const isCurrentUserSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

  const { data, isLoading, isError } = useSearchUsersQuery(query);
  const changeRole = useChangeUserRoleMutation();

  return (
    <div className={styles.wrapper}>
      <h1>Usuários & Papéis</h1>

      <input
        className={styles.searchInput}
        placeholder="Buscar por nome ou e-mail..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {isLoading && <p>Buscando...</p>}
      {isError && <p>Erro ao buscar usuários.</p>}
      {!isLoading && query.trim().length > 0 && data?.length === 0 && (
        <p className={styles.empty}>Nenhum usuário encontrado.</p>
      )}

      {data && data.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Papel atual</TableHead>
              <TableHead>Alterar para</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((result) => (
              <TableRow key={result.id}>
                <TableCell>{result.displayName}</TableCell>
                <TableCell>{result.email}</TableCell>
                <TableCell>
                  <Badge variant={result.role === 'SUPER_ADMIN' ? 'default' : 'secondary'}>{result.role}</Badge>
                </TableCell>
                <TableCell>
                  <select
                    className={styles.roleSelect}
                    value={result.role}
                    disabled={changeRole.isPending}
                    onChange={(e) =>
                      changeRole.mutate({ userId: result.id, role: e.target.value as PlatformRole })
                    }
                  >
                    {ALL_ROLES.map((role) => (
                      <option key={role} value={role} disabled={role === 'SUPER_ADMIN' && !isCurrentUserSuperAdmin}>
                        {role}
                      </option>
                    ))}
                  </select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {changeRole.error && <p style={{ color: 'var(--destructive)' }}>{changeRole.error.message}</p>}
    </div>
  );
}
