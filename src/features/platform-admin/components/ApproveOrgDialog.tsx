'use client';

import { Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { useApproveOrganizationMutation } from '../mutations/approve-organization.mutation';
import type { PlatformOrganization } from '../types/platform-admin.types';
import styles from './ReviewOrgDialog.module.scss';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organization: PlatformOrganization;
  onApproved?: () => void;
}

export function ApproveOrgDialog({ open, onOpenChange, organization, onApproved }: Props) {
  const mutation = useApproveOrganizationMutation(() => {
    onOpenChange(false);
    onApproved?.();
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className={styles.headRow}>
            <div className={`${styles.iconWrap} ${styles.iconWrapApprove}`}>
              <Check size={20} strokeWidth={2.2} />
            </div>
            <div>
              <DialogTitle>Aprovar organização</DialogTitle>
              <DialogDescription>Ativa imediatamente e notifica o responsável.</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className={styles.summaryCard}>
          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>NOME</span>
            <span className={styles.summaryValue}>{organization.name}</span>
          </div>
          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>SLUG</span>
            <span className={styles.summaryValueMono}>@{organization.slug}</span>
          </div>
          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>OWNER</span>
            <span className={styles.summaryValueMono}>{organization.ownerEmail ?? '—'}</span>
          </div>
          {organization.description && (
            <div className={styles.summaryDesc}>
              <span className={styles.summaryLabel}>DESCRIÇÃO</span>
              <p>{organization.description}</p>
            </div>
          )}
        </div>

        {mutation.error && <p className={styles.error}>{mutation.error.message}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button disabled={mutation.isPending} onClick={() => mutation.mutate(organization.id)}>
            {mutation.isPending ? 'Aprovando...' : 'Aprovar organização'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
