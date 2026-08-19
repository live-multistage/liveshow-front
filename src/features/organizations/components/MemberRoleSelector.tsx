'use client';

import { useTranslations } from 'next-intl';
import type { OrganizationRole } from '../types/organization.types';
import styles from './MemberRoleSelector.module.scss';

const ROLE_OPTIONS: { value: OrganizationRole; labelKey: string }[] = [
  { value: 'ADMIN', labelKey: 'roleADMIN' },
  { value: 'CONTENT_MANAGER', labelKey: 'roleCONTENT_MANAGER' },
  { value: 'EVENT_MANAGER', labelKey: 'roleEVENT_MANAGER' },
  { value: 'OPERATOR', labelKey: 'roleOPERATOR' },
  { value: 'STAFF', labelKey: 'roleSTAFFCheckin' },
  { value: 'VIEWER', labelKey: 'roleVIEWER' },
];

interface Props {
  value: OrganizationRole;
  onChange: (role: OrganizationRole) => void;
  disabled?: boolean;
  excludeOwner?: boolean;
}

export function MemberRoleSelector({ value, onChange, disabled, excludeOwner = true }: Props) {
  const t = useTranslations('organizations');
  const options = excludeOwner ? ROLE_OPTIONS : [{ value: 'OWNER' as OrganizationRole, labelKey: 'roleOWNER' }, ...ROLE_OPTIONS];

  return (
    <select
      className={styles.select}
      value={value}
      onChange={(e) => onChange(e.target.value as OrganizationRole)}
      disabled={disabled}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {t(opt.labelKey)}
        </option>
      ))}
    </select>
  );
}
