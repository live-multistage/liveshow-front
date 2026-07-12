'use client';

import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/shared/components/ui/tabs';
import { Button } from '@/shared/components/ui/button';
import { OrganizationStatusBadge } from './OrganizationStatusBadge';
import { ApproveOrgDialog } from './ApproveOrgDialog';
import { RejectOrgDialog } from './RejectOrgDialog';
import { OrgMembersPanel } from './OrgMembersPanel';
import { OrgFeatureFlagsPanel } from './OrgFeatureFlagsPanel';
import { useOrganizationDetailQuery } from '../queries/get-organization-detail';
import { useSetOrganizationStatusMutation } from '../mutations/set-organization-status.mutation';
import styles from './OrganizationDetailPage.module.scss';

export function OrganizationDetailPage({ organizationId }: { organizationId: string }) {
  const { data: org, isLoading, isError } = useOrganizationDetailQuery(organizationId);
  const setStatus = useSetOrganizationStatusMutation();
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);

  if (isLoading) return <p>Carregando...</p>;
  if (isError || !org) return <p>Organização não encontrada.</p>;

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <div>
          <div className={styles.titleRow}>
            <h1>{org.name}</h1>
            <OrganizationStatusBadge status={org.status} />
          </div>
          <p className={styles.slug}>@{org.slug}</p>
          {org.rejectionReason && (
            <p className={styles.rejectionReason}>Motivo da rejeição: {org.rejectionReason}</p>
          )}
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
              Suspender
            </Button>
          )}
          {org.status === 'SUSPENDED' && (
            <Button
              disabled={setStatus.isPending}
              onClick={() => setStatus.mutate({ id: org.id, status: 'ACTIVE' })}
            >
              Reativar
            </Button>
          )}
          {(org.status === 'ACTIVE' || org.status === 'SUSPENDED') && (
            <Button
              variant="destructive"
              disabled={setStatus.isPending}
              onClick={() => setStatus.mutate({ id: org.id, status: 'ARCHIVED' })}
            >
              Arquivar
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="members">
        <TabsList>
          <TabsTrigger value="members">Membros</TabsTrigger>
          <TabsTrigger value="flags">Feature Flags</TabsTrigger>
        </TabsList>
        <TabsContent value="members">
          <OrgMembersPanel organizationId={org.id} />
        </TabsContent>
        <TabsContent value="flags">
          <OrgFeatureFlagsPanel organizationId={org.id} />
        </TabsContent>
      </Tabs>

      <ApproveOrgDialog open={approveOpen} onOpenChange={setApproveOpen} organization={org} />
      <RejectOrgDialog open={rejectOpen} onOpenChange={setRejectOpen} organization={org} />
    </div>
  );
}
