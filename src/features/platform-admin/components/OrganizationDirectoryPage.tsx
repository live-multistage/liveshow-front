'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Search, Plus, MoreVertical, Check, X, Ban, Archive, RotateCcw, Eye, Building2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/shared/components/ui/dropdown-menu';
import { OrganizationStatusBadge } from './OrganizationStatusBadge';
import { CreateOrganizationDialog } from './CreateOrganizationDialog';
import { ApproveOrgDialog } from './ApproveOrgDialog';
import { RejectOrgDialog } from './RejectOrgDialog';
import { useOrganizationDirectoryQuery } from '../queries/get-organization-directory';
import { useSetOrganizationStatusMutation } from '../mutations/set-organization-status.mutation';
import type { OrganizationStatus, PlatformOrganization } from '../types/platform-admin.types';
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

function initials(name: string | null): string {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '??';
}

function ownerAvatarColor(id: string): string {
  const palette = ['#ff5fb4', '#9b7bff', '#46d6d8', '#ff7a4d', '#ff8ec9'];
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return palette[hash % palette.length];
}

export function OrganizationDirectoryPage() {
  const [statusTab, setStatusTab] = useState<OrganizationStatus | 'ALL'>('PENDING');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [reviewOrg, setReviewOrg] = useState<{ mode: 'approve' | 'reject'; org: PlatformOrganization } | null>(null);

  const { data, isLoading, isError } = useOrganizationDirectoryQuery({
    status: statusTab === 'ALL' ? undefined : statusTab,
    search: search.trim() || undefined,
    page,
    limit: PAGE_SIZE,
  });

  const setStatus = useSetOrganizationStatusMutation((org) => {
    toast.success(`${org.name} atualizada — agora ${org.status === 'ACTIVE' ? 'ativa' : org.status === 'SUSPENDED' ? 'suspensa' : 'arquivada'}.`);
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <div className={styles.wrapper}>
      <div className={styles.headerRow}>
        <div>
          <div className={styles.breadcrumb}>
            <span>PLATAFORMA</span>
            <span className={styles.breadcrumbSep}>/</span>
            <span className={styles.breadcrumbCurrent}>ORGANIZAÇÕES</span>
          </div>
          <h1 className={styles.title}>Diretório de Organizações</h1>
          <div className={styles.subtitle}>Aprove cadastros, gerencie status e supervisione toda a plataforma.</div>
        </div>
        <button className={styles.createButton} onClick={() => setCreateOpen(true)}>
          <Plus size={16} strokeWidth={2.6} />
          Nova organização
        </button>
      </div>

      <div className={styles.searchWrapper}>
        <Search size={18} className={styles.searchIcon} />
        <input
          className={styles.searchInput}
          placeholder="Buscar por nome ou slug…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </div>

      <div className={styles.chips}>
        {STATUS_TABS.map((tab) => {
          const active = tab.value === statusTab;
          return (
            <button
              key={tab.value}
              className={active ? `${styles.chip} ${styles.chipActive}` : styles.chip}
              onClick={() => {
                setStatusTab(tab.value);
                setPage(1);
              }}
            >
              {tab.label.toUpperCase()}
              {active && data && <span className={`${styles.chipCount} ${styles.chipCountActive}`}>{data.total}</span>}
            </button>
          );
        })}
      </div>

      <div className={styles.tableCard}>
        <div className={styles.tableHeadRow}>
          <div>ORGANIZAÇÃO</div>
          <div>STATUS</div>
          <div>OWNER</div>
          <div>CRIADA EM</div>
          <div />
        </div>

        {isLoading && (
          <div className={styles.empty}>
            <div className={styles.emptyDesc}>Carregando…</div>
          </div>
        )}
        {isError && (
          <div className={styles.empty}>
            <div className={styles.emptyDesc}>Erro ao carregar organizações.</div>
          </div>
        )}

        {data && data.items.length === 0 && (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>
              <Building2 size={26} strokeWidth={1.8} />
            </div>
            <div className={styles.emptyTitle}>Nenhuma organização encontrada</div>
            <div className={styles.emptyDesc}>
              {statusTab === 'PENDING' ? 'Não há cadastros pendentes de aprovação no momento. 🎉' : 'Tente outro filtro ou termo de busca.'}
            </div>
          </div>
        )}

        {data && data.items.length > 0 && (
          <div>
            {data.items.map((org) => (
              <div className={styles.row} key={org.id}>
                <div className={styles.orgCell}>
                  <div className={styles.orgAvatar} />
                  <div style={{ minWidth: 0 }}>
                    <Link href={`/dashboard/platform/organizations/${org.id}`} className={styles.orgName}>
                      {org.name}
                    </Link>
                    <div className={styles.orgSlug}>@{org.slug}</div>
                  </div>
                </div>

                <div>
                  <OrganizationStatusBadge status={org.status} />
                </div>

                <div className={styles.ownerCell}>
                  <div className={styles.ownerAvatar} style={{ background: ownerAvatarColor(org.ownerId) }}>
                    {initials(org.ownerDisplayName)}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div className={styles.ownerName}>{org.ownerDisplayName ?? '—'}</div>
                    <div className={styles.ownerEmail}>{org.ownerEmail ?? '—'}</div>
                  </div>
                </div>

                <div className={styles.created}>{new Date(org.createdAt).toLocaleDateString('pt-BR')}</div>

                <div className={styles.actionsCell}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className={styles.kebabButton}>
                        <MoreVertical size={16} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {org.status === 'PENDING' && (
                        <>
                          <DropdownMenuItem onClick={() => setReviewOrg({ mode: 'approve', org })}>
                            <Check size={15} /> Aprovar
                          </DropdownMenuItem>
                          <DropdownMenuItem variant="destructive" onClick={() => setReviewOrg({ mode: 'reject', org })}>
                            <X size={15} /> Rejeitar
                          </DropdownMenuItem>
                        </>
                      )}
                      {org.status === 'ACTIVE' && (
                        <>
                          <DropdownMenuItem onClick={() => setStatus.mutate({ id: org.id, status: 'SUSPENDED' })}>
                            <Ban size={15} /> Suspender
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setStatus.mutate({ id: org.id, status: 'ARCHIVED' })}>
                            <Archive size={15} /> Arquivar
                          </DropdownMenuItem>
                        </>
                      )}
                      {org.status === 'SUSPENDED' && (
                        <>
                          <DropdownMenuItem onClick={() => setStatus.mutate({ id: org.id, status: 'ACTIVE' })}>
                            <RotateCcw size={15} /> Reativar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setStatus.mutate({ id: org.id, status: 'ARCHIVED' })}>
                            <Archive size={15} /> Arquivar
                          </DropdownMenuItem>
                        </>
                      )}
                      {org.status === 'ARCHIVED' && (
                        <DropdownMenuItem onClick={() => setStatus.mutate({ id: org.id, status: 'ACTIVE' })}>
                          <RotateCcw size={15} /> Reativar
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem asChild>
                        <Link href={`/dashboard/platform/organizations/${org.id}`}>
                          <Eye size={15} /> Ver detalhe
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        )}

        {data && data.items.length > 0 && (
          <div className={styles.pagination}>
            <div className={styles.pageInfo}>
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, data.total)} de {data.total}
            </div>
            <div className={styles.pageButtons}>
              <button className={styles.pageButton} disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                ‹
              </button>
              <button className={`${styles.pageButton} ${styles.pageButtonActive}`}>{page}</button>
              <button className={styles.pageButton} disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                ›
              </button>
            </div>
          </div>
        )}
      </div>

      <CreateOrganizationDialog open={createOpen} onOpenChange={setCreateOpen} />

      {reviewOrg?.mode === 'approve' && (
        <ApproveOrgDialog
          open
          onOpenChange={(open) => !open && setReviewOrg(null)}
          organization={reviewOrg.org}
          onApproved={() => toast.success(`${reviewOrg.org.name} foi aprovada e está ativa.`)}
        />
      )}
      {reviewOrg?.mode === 'reject' && (
        <RejectOrgDialog
          open
          onOpenChange={(open) => !open && setReviewOrg(null)}
          organization={reviewOrg.org}
          onRejected={() => toast.success(`${reviewOrg.org.name} foi rejeitada.`)}
        />
      )}
    </div>
  );
}
