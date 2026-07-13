'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { UserPlus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { useAddOrgMemberMutation } from '../mutations/add-org-member.mutation';
import { addOrgMemberSchema, type AddOrgMemberFormValues } from '../schemas/add-org-member.schema';
import styles from './AddOrgMemberDialog.module.scss';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
}

export function AddOrgMemberDialog({ open, onOpenChange, organizationId }: Props) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AddOrgMemberFormValues>({ resolver: zodResolver(addOrgMemberSchema), defaultValues: { role: 'OPERATOR' } });

  const mutation = useAddOrgMemberMutation(organizationId, (member) => {
    reset();
    onOpenChange(false);
    toast.success(`${member.email ?? 'Usuário'} adicionado como ${member.role}.`);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div style={{ display: 'flex', alignItems: 'center', gap: '13px' }}>
            <div style={{
              width: 42, height: 42, borderRadius: 12,
              background: 'rgba(255,46,158,.12)', border: '1px solid rgba(255,46,158,.32)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff5fb4', flex: 'none',
            }}>
              <UserPlus size={20} strokeWidth={2} />
            </div>
            <div>
              <DialogTitle>Adicionar membro</DialogTitle>
              <DialogDescription>O usuário precisa já ter uma conta cadastrada na plataforma.</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form
          className={styles.form}
          onSubmit={handleSubmit((values) => mutation.mutate({ email: values.email, role: values.role }))}
        >
          <div className={styles.field}>
            <label className={styles.label}>E-MAIL</label>
            <input className={styles.input} placeholder="usuario@empresa.com" {...register('email')} />
            {errors.email && <p className={styles.error}>{errors.email.message}</p>}
          </div>

          <div className={styles.field}>
            <label className={styles.label}>PAPEL</label>
            <select className={styles.select} {...register('role')}>
              <option value="ADMIN">Admin</option>
              <option value="CONTENT_MANAGER">Content Manager</option>
              <option value="OPERATOR">Operator</option>
            </select>
          </div>

          {mutation.error && <p className={styles.error}>{mutation.error.message}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Adicionando...' : 'Adicionar membro'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
