'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/shared/components/ui/table';
import { Button } from '@/shared/components/ui/button';
import { OrganizationStatusBadge } from './OrganizationStatusBadge';
import { CreateOrganizationDialog } from './CreateOrganizationDialog';
import { useOrganizationDirectoryQuery } from '../queries/get-organization-directory';
import type { OrganizationStatus } from '../types/platform-admin.types';
import styles from './OrganizationDirectoryPage.module.scss';

const STATUS_TABS: { value: OrganizationStatus | 'ALL'; label: string }[] = [
  { value: 'PENDING', label: 'Pendentes' },
  { value: 'ALL', label: 'Todas' },
  { value: 'ACTIVE', label: 'Ativas' },
  { value: 'SUSPENDED', label: 'Suspensas' },
  { value: 'ARCHIVED', label: 'Arquivadas' },
  { value: 'REJECTED', label: 'Rejeitadas' },
];

const PAGE_SIZE = 20;

export function OrganizationDirectoryPage() {
  const [statusTab, setStatusTab] = useState<OrganizationStatus | 'ALL'>('PENDING');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading, isError } = useOrganizationDirectoryQuery({
    status: statusTab === 'ALL' ? undefined : statusTab,
    search: search.trim() || undefined,
    page,
    limit: PAGE_SIZE,
  });

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <h1>Organizações</h1>
        <Button onClick={() => setCreateOpen(true)}>+ Nova organização</Button>
      </div>

      <div className={styles.filters}>
        <Tabs
          value={statusTab}
          onValueChange={(value) => {
            setStatusTab(value as OrganizationStatus | 'ALL');
            setPage(1);
          }}
        >
          <TabsList>
            {STATUS_TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <input
          className={styles.searchInput}
          placeholder="Buscar por nome ou slug..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </div>

      {isLoading && <p>Carregando...</p>}
      {isError && <p>Erro ao carregar organizações.</p>}

      {data && data.items.length === 0 && (
        <p className={styles.empty}>Nenhuma organização encontrada.</p>
      )}

      {data && data.items.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Criada em</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.map((org) => (
              <TableRow key={org.id}>
                <TableCell>
                  <Link href={`/dashboard/platform/organizations/${org.id}`}>{org.name}</Link>
                </TableCell>
                <TableCell>{org.slug}</TableCell>
                <TableCell>
                  <OrganizationStatusBadge status={org.status} />
                </TableCell>
                <TableCell>{new Date(org.createdAt).toLocaleDateString('pt-BR')}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {data && data.total > PAGE_SIZE && (
        <div className={styles.pagination}>
          <Button variant="outline" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            Anterior
          </Button>
          <span>
            Página {page} de {Math.ceil(data.total / PAGE_SIZE)}
          </span>
          <Button
            variant="outline"
            disabled={page >= Math.ceil(data.total / PAGE_SIZE)}
            onClick={() => setPage((p) => p + 1)}
          >
            Próxima
          </Button>
        </div>
      )}

      <CreateOrganizationDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
