'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Search, ChevronDown, Check, Lock } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/shared/components/ui/dropdown-menu';
import { useAuth } from '@/features/account';
import { RolePill, ROLE_COLORS, hexToRgba } from './RolePill';
import { useSearchUsersQuery } from '../queries/search-users';
import { useChangeUserRoleMutation } from '../mutations/change-user-role.mutation';
import type { PlatformRole, PlatformUserResult } from '../types/platform-admin.types';
import styles from './UserRoleSearchPage.module.scss';

const ALL_ROLES: PlatformRole[] = ['USER', 'ARTIST', 'ORGANIZER', 'ADMIN', 'SUPER_ADMIN'];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '??';
}

function avatarColor(id: string): string {
  const palette = ['#ff2e9e', '#9b7bff', '#46d6d8', '#ff7a4d', '#ff8ec9'];
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return palette[hash % palette.length];
}

export function UserRoleSearchPage() {
  const [query, setQuery] = useState('');
  const { user: currentUser } = useAuth();
  const isCurrentUserSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

  const { data, isLoading, isError } = useSearchUsersQuery(query);
  const changeRole = useChangeUserRoleMutation();

  const handleChange = (result: PlatformUserResult, role: PlatformRole) => {
    if (role === result.role) return;
    changeRole.mutate(
      { userId: result.id, role },
      { onSuccess: () => toast.success(`${result.displayName} agora é ${role}.`) },
    );
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.breadcrumb}>
        <span>PLATAFORMA</span>
        <span className={styles.breadcrumbSep}>/</span>
        <span className={styles.breadcrumbCurrent}>USUÁRIOS &amp; PAPÉIS</span>
      </div>
      <h1 className={styles.title}>Usuários &amp; Papéis</h1>
      <div className={styles.subtitle}>Busque qualquer usuário da plataforma e ajuste seu papel de acesso.</div>

      <div className={styles.searchWrapper}>
        <Search size={18} className={styles.searchIcon} />
        <input
          className={styles.searchInput}
          placeholder="Buscar por nome ou e-mail…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {isLoading && <p>Buscando...</p>}
      {isError && <p>Erro ao buscar usuários.</p>}
      {!isLoading && query.trim().length > 0 && data?.length === 0 && (
        <div className={styles.empty}>Nenhum usuário encontrado para “{query}”. Tente outro nome ou e-mail.</div>
      )}

      {data && data.length > 0 && (
        <div className={styles.card}>
          <div className={styles.headRow}>
            <div>USUÁRIO</div>
            <div>PAPEL ATUAL</div>
            <div className={styles.headRowRight}>ALTERAR PAPEL</div>
          </div>
          {data.map((result) => (
            <div className={styles.row} key={result.id}>
              <div className={styles.userCell}>
                <div className={styles.avatar} style={{ background: avatarColor(result.id) }}>
                  {initials(result.displayName)}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div className={styles.name}>{result.displayName}</div>
                  <div className={styles.email}>{result.email}</div>
                </div>
              </div>
              <div>
                <RolePill role={result.role} />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className={styles.roleTrigger} disabled={changeRole.isPending}>
                    {result.role}
                    <ChevronDown size={14} color="#8f8f97" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {ALL_ROLES.map((role) => {
                    const disabled = role === 'SUPER_ADMIN' && !isCurrentUserSuperAdmin;
                    const color = ROLE_COLORS[role] ?? '#9a9aa2';
                    if (disabled) {
                      return (
                        <div key={role} title="Apenas Super Admins podem conceder esse papel" className={styles.disabledHint} style={{ padding: '9px 10px' }}>
                          <span className={styles.roleDot} style={{ background: hexToRgba(color, 0.5) }} />
                          <span style={{ flex: 1 }}>{role}</span>
                          <Lock size={13} />
                        </div>
                      );
                    }
                    return (
                      <DropdownMenuItem key={role} onClick={() => handleChange(result, role)}>
                        <span className={styles.roleDot} style={{ background: color }} />
                        <span style={{ flex: 1 }}>{role}</span>
                        {role === result.role && <Check size={15} color="#ff5fb4" />}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      )}

      {changeRole.error && <p style={{ color: 'var(--destructive)' }}>{changeRole.error.message}</p>}
    </div>
  );
}
