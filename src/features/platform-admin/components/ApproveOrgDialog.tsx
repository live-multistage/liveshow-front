'use client';

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

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organization: PlatformOrganization;
}

export function ApproveOrgDialog({ open, onOpenChange, organization }: Props) {
  const mutation = useApproveOrganizationMutation(() => onOpenChange(false));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Aprovar organização</DialogTitle>
          <DialogDescription>
            "{organization.name}" (@{organization.slug}) será ativada imediatamente e o responsável será notificado.
          </DialogDescription>
        </DialogHeader>

        {mutation.error && <p style={{ color: 'var(--destructive)', fontSize: '0.85rem' }}>{mutation.error.message}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button disabled={mutation.isPending} onClick={() => mutation.mutate(organization.id)}>
            {mutation.isPending ? 'Aprovando...' : 'Aprovar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
