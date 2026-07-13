'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { UserPlus, ChevronDown, Check } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/shared/components/ui/dropdown-menu';
import { RolePill, ROLE_COLORS } from './RolePill';
import { AddOrgMemberDialog } from './AddOrgMemberDialog';
import { useOrganizationMembersQuery } from '../queries/get-organization-members';
import { useChangeOrgMemberRoleMutation } from '../mutations/change-org-member-role.mutation';
import type { PlatformOrganizationRole } from '../types/platform-admin.types';
import styles from './OrgMembersPanel.module.scss';

const CHANGEABLE_ROLES: PlatformOrganizationRole[] = ['ADMIN', 'CONTENT_MANAGER', 'OPERATOR'];

function initials(name: string | null): string {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '??';
}

function avatarColor(id: string): string {
  const palette = ['#ff2e9e', '#9b7bff', '#46d6d8', '#ff7a4d', '#ff8ec9'];
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return palette[hash % palette.length];
}

export function OrgMembersPanel({ organizationId }: { organizationId: string }) {
  const { data, isLoading, isError } = useOrganizationMembersQuery(organizationId);
  const changeRole = useChangeOrgMemberRoleMutation(organizationId);
  const [addOpen, setAddOpen] = useState(false);

  return (
    <div className={styles.panel}>
      <div className={styles.toolbar}>
        <button className={styles.addButton} onClick={() => setAddOpen(true)}>
          <UserPlus size={15} /> Adicionar membro
        </button>
      </div>

      {isLoading && <div className={styles.empty}>Carregando membros...</div>}
      {isError && <div className={styles.empty}>Erro ao carregar membros.</div>}
      {data && data.length === 0 && <div className={styles.empty}>Nenhum membro nesta organização.</div>}

      {data && data.length > 0 && (
        <div className={styles.card}>
          <div className={styles.headRow}>
            <div>MEMBRO</div>
            <div>E-MAIL</div>
            <div>PAPEL</div>
          </div>
          {data.map((member) => (
            <div className={styles.row} key={member.id}>
              <div className={styles.memberCell}>
                <div className={styles.avatar} style={{ background: avatarColor(member.id) }}>
                  {initials(member.displayName)}
                </div>
                <div className={styles.name}>{member.displayName ?? '—'}</div>
              </div>
              <div className={styles.email}>{member.email ?? '—'}</div>
              <div>
                {member.role === 'OWNER' ? (
                  <RolePill role={member.role} />
                ) : (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className={styles.roleTrigger} disabled={changeRole.isPending}>
                        <span className={styles.roleDot} style={{ background: ROLE_COLORS[member.role] ?? '#9a9aa2' }} />
                        {member.role}
                        <ChevronDown size={12} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      {CHANGEABLE_ROLES.map((role) => (
                        <DropdownMenuItem
                          key={role}
                          onClick={() => {
                            if (role === member.role) return;
                            changeRole.mutate(
                              { memberId: member.id, role },
                              { onSuccess: () => toast.success(`${member.displayName ?? 'Membro'} agora é ${role}.`) },
                            );
                          }}
                        >
                          <span className={styles.roleDot} style={{ background: ROLE_COLORS[role] ?? '#9a9aa2' }} />
                          <span style={{ flex: 1 }}>{role}</span>
                          {role === member.role && <Check size={15} color="#ff5fb4" />}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {changeRole.error && <p className={styles.email} style={{ color: 'var(--destructive)' }}>{changeRole.error.message}</p>}

      <AddOrgMemberDialog open={addOpen} onOpenChange={setAddOpen} organizationId={organizationId} />
    </div>
  );
}
