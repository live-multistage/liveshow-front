'use client';

import type { OrganizationRole } from '../types/organization.types';
import styles from './MemberRoleSelector.module.scss';

const ROLE_OPTIONS: { value: OrganizationRole; label: string }[] = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'EVENT_MANAGER', label: 'Gestor de Eventos' },
  { value: 'VIEWER', label: 'Visualizador' },
];

interface Props {
  value: OrganizationRole;
  onChange: (role: OrganizationRole) => void;
  disabled?: boolean;
  excludeOwner?: boolean;
}

export function MemberRoleSelector({ value, onChange, disabled, excludeOwner = true }: Props) {
  const options = excludeOwner ? ROLE_OPTIONS : [{ value: 'OWNER' as OrganizationRole, label: 'Owner' }, ...ROLE_OPTIONS];

  return (
    <select
      className={styles.select}
      value={value}
      onChange={(e) => onChange(e.target.value as OrganizationRole)}
      disabled={disabled}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
