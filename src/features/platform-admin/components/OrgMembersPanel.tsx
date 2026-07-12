'use client';

import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/shared/components/ui/table';
import { useOrganizationMembersQuery } from '../queries/get-organization-members';

export function OrgMembersPanel({ organizationId }: { organizationId: string }) {
  const { data, isLoading, isError } = useOrganizationMembersQuery(organizationId);

  if (isLoading) return <p>Carregando membros...</p>;
  if (isError) return <p>Erro ao carregar membros.</p>;
  if (!data || data.length === 0) return <p>Nenhum membro nesta organização.</p>;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>E-mail</TableHead>
          <TableHead>Papel</TableHead>
          <TableHead>Desde</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((member) => (
          <TableRow key={member.id}>
            <TableCell>{member.displayName ?? '—'}</TableCell>
            <TableCell>{member.email ?? '—'}</TableCell>
            <TableCell>{member.role}</TableCell>
            <TableCell>{new Date(member.joinedAt).toLocaleDateString('pt-BR')}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
