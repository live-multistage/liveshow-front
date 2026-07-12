'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { useRejectOrganizationMutation } from '../mutations/reject-organization.mutation';
import type { PlatformOrganization } from '../types/platform-admin.types';
import styles from './RejectOrgDialog.module.scss';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organization: PlatformOrganization;
}

export function RejectOrgDialog({ open, onOpenChange, organization }: Props) {
  const [reason, setReason] = useState('');
  const mutation = useRejectOrganizationMutation(() => {
    setReason('');
    onOpenChange(false);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rejeitar organização</DialogTitle>
          <DialogDescription>
            "{organization.name}" (@{organization.slug}) não será ativada. O responsável verá o motivo abaixo.
          </DialogDescription>
        </DialogHeader>

        <div className={styles.field}>
          <label>Motivo *</label>
          <textarea
            className={styles.textarea}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ex: dados de cadastro incompletos"
          />
          {mutation.error && <p className={styles.error}>{mutation.error.message}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            disabled={mutation.isPending || reason.trim().length === 0}
            onClick={() => mutation.mutate({ id: organization.id, reason: reason.trim() })}
          >
            {mutation.isPending ? 'Rejeitando...' : 'Rejeitar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
