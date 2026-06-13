'use client';

import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { useAuth } from '@/features/account';
import { OrganizationHeader } from '../components/OrganizationHeader';
import { MembersTable } from '../components/MembersTable';
import { InviteMemberModal } from '../components/InviteMemberModal';
import { RemoveMemberDialog } from '../components/RemoveMemberDialog';
import { useOrganization } from '../hooks/use-organizations';
import { useOrganizationMembers } from '../hooks/use-organization-members';
import { useInviteMember } from '../hooks/use-invite-member';
import { useRemoveMember } from '../hooks/use-remove-member';
import { useUpdateMemberRole } from '../hooks/use-update-member-role';
import type { InviteMemberValues } from '../schemas/invite-member.schema';
import type { OrganizationRole } from '../types/organization.types';
import styles from './MembersPage.module.scss';

interface Props {
  organizationId: string;
}

export function MembersPage({ organizationId }: Props) {
  const { user } = useAuth();
  const { data: org, isLoading: orgLoading, isError: orgError } = useOrganization(organizationId);
  const { data: members = [], isLoading: membersLoading } = useOrganizationMembers(organizationId);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);

  const inviteMutation = useInviteMember(organizationId);
  const removeMutation = useRemoveMember(organizationId);
  const updateRoleMutation = useUpdateMemberRole(organizationId);

  const currentMember = members.find((m) => m.userId === user?.id);
  const canManage = currentMember?.role === 'OWNER' || currentMember?.role === 'ADMIN';

  const removingMember = removingMemberId
    ? members.find((m) => m.id === removingMemberId)
    : null;

  const handleInvite = (values: InviteMemberValues) => {
    setInviteError(null);
    inviteMutation.mutate(values, {
      onSuccess: () => setInviteOpen(false),
      onError: (e) => setInviteError(e.message),
    });
  };

  const handleRemove = () => {
    if (!removingMemberId) return;
    removeMutation.mutate(removingMemberId, {
      onSuccess: () => setRemovingMemberId(null),
    });
  };

  const handleRoleChange = (memberId: string, role: OrganizationRole) => {
    updateRoleMutation.mutate({ memberId, role });
  };

  if (orgLoading) return <p className={styles.state}>Carregando...</p>;
  if (orgError || !org) {
    return <p className={`${styles.state} ${styles.stateError}`}>Organização não encontrada.</p>;
  }

  return (
    <div className={styles.page}>
      <OrganizationHeader organization={org} />

      <div className={styles.content}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Membros ({members.length})</h2>
          {canManage && (
            <button className={styles.inviteBtn} onClick={() => setInviteOpen(true)}>
              <UserPlus size={14} />
              Convidar
            </button>
          )}
        </div>

        {membersLoading ? (
          <p className={styles.state}>Carregando membros...</p>
        ) : (
          <MembersTable
            members={members}
            currentUserId={user?.id ?? ''}
            canManage={canManage}
            onRemove={canManage ? setRemovingMemberId : undefined}
            onRoleChange={canManage ? handleRoleChange : undefined}
            isRemoving={removeMutation.isPending}
            isUpdatingRole={updateRoleMutation.isPending}
          />
        )}
      </div>

      <InviteMemberModal
        isOpen={inviteOpen}
        onClose={() => { setInviteOpen(false); setInviteError(null); }}
        onInvite={handleInvite}
        isPending={inviteMutation.isPending}
        error={inviteError}
      />

      <RemoveMemberDialog
        isOpen={!!removingMemberId}
        memberName={removingMember?.displayName ?? removingMember?.email ?? 'este membro'}
        onConfirm={handleRemove}
        onCancel={() => setRemovingMemberId(null)}
        isPending={removeMutation.isPending}
      />
    </div>
  );
}
