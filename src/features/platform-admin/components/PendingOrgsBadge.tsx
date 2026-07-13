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
        fontFamily: "'Space Mono', monospace",
        fontWeight: 700,
        fontSize: '10px',
        padding: '2px 6px',
        lineHeight: '1',
        minWidth: '20px',
        textAlign: 'center',
      }}
    >
      {data.total}
    </span>
  );
}
