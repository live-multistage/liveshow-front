'use client';

import { useOrganizationDirectoryQuery } from '../queries/get-organization-directory';

export function PendingOrgsBadge() {
  const { data } = useOrganizationDirectoryQuery({ status: 'PENDING', page: 1, limit: 1 });
  if (!data || data.total === 0) return null;

  return (
    <span
      style={{
        marginLeft: 'auto',
        background: 'var(--primary)',
        color: 'var(--primary-foreground)',
        borderRadius: '999px',
        fontSize: '0.7rem',
        padding: '0 6px',
        lineHeight: '1.4rem',
        minWidth: '1.4rem',
        textAlign: 'center',
      }}
    >
      {data.total}
    </span>
  );
}
