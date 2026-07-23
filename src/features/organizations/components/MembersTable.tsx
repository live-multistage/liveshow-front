'use client';

import { useTranslations } from 'next-intl';
import { Crown, Shield, Calendar, Eye, ScanLine } from 'lucide-react';
import type { OrganizationMemberResponse, OrganizationRole } from '../types/organization.types';
import { MemberRoleSelector } from './MemberRoleSelector';
import styles from './MembersTable.module.scss';

const ROLE_ICONS: Record<OrganizationRole, React.ReactNode> = {
  OWNER: <Crown size={13} />,
  ADMIN: <Shield size={13} />,
  EVENT_MANAGER: <Calendar size={13} />,
  CONTENT_MANAGER: <Calendar size={13} />,
  OPERATOR: <Calendar size={13} />,
  STAFF: <ScanLine size={13} />,
  VIEWER: <Eye size={13} />,
};

const ROLE_LABEL_KEYS = ['OWNER','ADMIN','EVENT_MANAGER','CONTENT_MANAGER','OPERATOR','STAFF','VIEWER'];

interface Props {
  members: OrganizationMemberResponse[];
  currentUserId: string;
  canManage: boolean;
  onRemove?: (memberId: string) => void;
  onRoleChange?: (memberId: string, role: OrganizationRole) => void;
  isRemoving?: boolean;
  isUpdatingRole?: boolean;
}

export function MembersTable({
  members,
  currentUserId,
  canManage,
  onRemove,
  onRoleChange,
  isRemoving,
  isUpdatingRole,
}: Props) {
  const t = useTranslations('organizations');
  if (members.length === 0) {
    return <p className={styles.empty}>Nenhum membro encontrado.</p>;
  }

  return (
    <div className={styles.table}>
      {members.map((member) => {
        const isCurrentUser = member.userId === currentUserId;
        const isOwner = member.role === 'OWNER';

        return (
          <div key={member.id} className={styles.row}>
            <div className={styles.roleCell}>
              <span className={styles.roleIcon} data-role={member.role}>
                {ROLE_ICONS[member.role]}
              </span>
              <span className={styles.roleBadge} data-role={member.role}>
                {(ROLE_LABEL_KEYS.includes(member.role) ? t(`role${member.role}`) : member.role)}
              </span>
            </div>

            <div className={styles.memberInfo}>
              <span className={styles.name}>
                {member.displayName ?? member.userId}
                {isCurrentUser && <span className={styles.you}> (você)</span>}
              </span>
              {member.email && <span className={styles.email}>{member.email}</span>}
            </div>

            <span className={styles.date}>
              {new Date(member.joinedAt).toLocaleDateString('pt-BR')}
            </span>

            {canManage && !isOwner && !isCurrentUser && (
              <div className={styles.actions}>
                {onRoleChange && (
                  <MemberRoleSelector
                    value={member.role}
                    onChange={(role) => onRoleChange(member.id, role)}
                    disabled={isUpdatingRole}
                  />
                )}
                {onRemove && (
                  <button
                    className={styles.removeBtn}
                    onClick={() => onRemove(member.id)}
                    disabled={isRemoving}
                  >
                    Remover
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
