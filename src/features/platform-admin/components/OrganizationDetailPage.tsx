'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { ArrowLeft, Building2, Users, SlidersHorizontal, Ban, Archive, RotateCcw } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { OrganizationStatusBadge } from './OrganizationStatusBadge';
import { ApproveOrgDialog } from './ApproveOrgDialog';
import { RejectOrgDialog } from './RejectOrgDialog';
import { OrgMembersPanel } from './OrgMembersPanel';
import { OrgFeatureFlagsPanel } from './OrgFeatureFlagsPanel';
import { useOrganizationDetailQuery } from '../queries/get-organization-detail';
import { useSetOrganizationStatusMutation } from '../mutations/set-organization-status.mutation';
import styles from './OrganizationDetailPage.module.scss';

type Tab = 'visao' | 'membros' | 'flags';

export function OrganizationDetailPage({ organizationId }: { organizationId: string }) {
  const { data: org, isLoading, isError } = useOrganizationDetailQuery(organizationId);
  const setStatus = useSetOrganizationStatusMutation((updated) => {
    const label = updated.status === 'ACTIVE' ? 'reativada' : updated.status === 'SUSPENDED' ? 'suspensa' : 'arquivada';
    toast.success(`${updated.name} foi ${label}.`);
  });
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('visao');

  if (isLoading) return <p>Carregando...</p>;
  if (isError || !org) return <p>Organização não encontrada.</p>;

  return (
    <div className={styles.wrapper}>
      <div className={styles.breadcrumb}>
        <Link href="/dashboard/platform/organizations" className={styles.breadcrumbLink}>
          <ArrowLeft size={13} /> ORGANIZAÇÕES
        </Link>
        <span className={styles.breadcrumbSep}>/</span>
        <span className={styles.breadcrumbCurrent}>@{org.slug.toUpperCase()}</span>
      </div>

      <div className={styles.header}>
        <div className={styles.identity}>
          <div className={styles.avatar} />
          <div style={{ minWidth: 0 }}>
            <div className={styles.titleRow}>
              <h1 className={styles.title}>{org.name}</h1>
              <OrganizationStatusBadge status={org.status} />
            </div>
            <div className={styles.meta}>
              @{org.slug} · criada em {new Date(org.createdAt).toLocaleDateString('pt-BR')}
            </div>
            {org.rejectionReason && <p className={styles.rejectionReason}>Motivo da rejeição: {org.rejectionReason}</p>}
          </div>
        </div>

        <div className={styles.actions}>
          {org.status === 'PENDING' && (
            <>
              <Button variant="outline" onClick={() => setRejectOpen(true)}>
                Rejeitar
              </Button>
              <Button onClick={() => setApproveOpen(true)}>Aprovar</Button>
            </>
          )}
          {org.status === 'ACTIVE' && (
            <Button
              variant="outline"
              disabled={setStatus.isPending}
              onClick={() => setStatus.mutate({ id: org.id, status: 'SUSPENDED' })}
            >
              <Ban size={15} /> Suspender
            </Button>
          )}
          {org.status === 'SUSPENDED' && (
            <Button disabled={setStatus.isPending} onClick={() => setStatus.mutate({ id: org.id, status: 'ACTIVE' })}>
              <RotateCcw size={15} /> Reativar
            </Button>
          )}
          {(org.status === 'ACTIVE' || org.status === 'SUSPENDED') && (
            <Button
              variant="destructive"
              disabled={setStatus.isPending}
              onClick={() => setStatus.mutate({ id: org.id, status: 'ARCHIVED' })}
            >
              <Archive size={15} /> Arquivar
            </Button>
          )}
          {org.status === 'ARCHIVED' && (
            <Button disabled={setStatus.isPending} onClick={() => setStatus.mutate({ id: org.id, status: 'ACTIVE' })}>
              <RotateCcw size={15} /> Reativar
            </Button>
          )}
        </div>
      </div>

      <div className={styles.tabs}>
        <button className={tab === 'visao' ? `${styles.tab} ${styles.tabActive}` : styles.tab} onClick={() => setTab('visao')}>
          <Building2 size={16} /> Visão Geral
        </button>
        <button className={tab === 'membros' ? `${styles.tab} ${styles.tabActive}` : styles.tab} onClick={() => setTab('membros')}>
          <Users size={16} /> Membros
        </button>
        <button className={tab === 'flags' ? `${styles.tab} ${styles.tabActive}` : styles.tab} onClick={() => setTab('flags')}>
          <SlidersHorizontal size={16} /> Feature Flags
        </button>
      </div>

      {tab === 'visao' && (
        <div className={styles.overviewCard}>
          <div className={styles.overviewHead}>DADOS CADASTRAIS</div>
          <div className={styles.overviewGrid}>
            <div>
              <div className={styles.overviewLabel}>NOME</div>
              <div className={styles.overviewValue}>{org.name}</div>
            </div>
            <div>
              <div className={styles.overviewLabel}>SLUG</div>
              <div className={styles.overviewValueMono}>@{org.slug}</div>
            </div>
            <div>
              <div className={styles.overviewLabel}>OWNER</div>
              <div className={styles.overviewValue}>{org.ownerDisplayName ?? '—'}</div>
            </div>
            <div>
              <div className={styles.overviewLabel}>E-MAIL DO OWNER</div>
              <div className={styles.overviewValueMono}>{org.ownerEmail ?? '—'}</div>
            </div>
            <div>
              <div className={styles.overviewLabel}>STATUS</div>
              <OrganizationStatusBadge status={org.status} />
            </div>
            <div>
              <div className={styles.overviewLabel}>CRIADA EM</div>
              <div className={styles.overviewValue} style={{ fontWeight: 400 }}>
                {new Date(org.createdAt).toLocaleDateString('pt-BR')}
              </div>
            </div>
          </div>
          {org.description && (
            <div className={styles.overviewDescWrap}>
              <div className={styles.overviewLabel}>DESCRIÇÃO</div>
              <p className={styles.overviewDesc}>{org.description}</p>
            </div>
          )}
        </div>
      )}
      {tab === 'membros' && <OrgMembersPanel organizationId={org.id} />}
      {tab === 'flags' && <OrgFeatureFlagsPanel organizationId={org.id} />}

      <ApproveOrgDialog open={approveOpen} onOpenChange={setApproveOpen} organization={org} onApproved={() => toast.success(`${org.name} foi aprovada e está ativa.`)} />
      <RejectOrgDialog open={rejectOpen} onOpenChange={setRejectOpen} organization={org} onRejected={() => toast.success(`${org.name} foi rejeitada.`)} />
    </div>
  );
}
