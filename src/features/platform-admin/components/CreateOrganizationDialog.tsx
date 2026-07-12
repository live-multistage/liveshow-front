'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { useCreateOrganizationMutation } from '../mutations/create-organization.mutation';
import { createOrganizationSchema, type CreateOrganizationFormValues } from '../schemas/create-organization.schema';
import styles from './CreateOrganizationDialog.module.scss';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateOrganizationDialog({ open, onOpenChange }: Props) {
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateOrganizationFormValues>({ resolver: zodResolver(createOrganizationSchema) });

  const mutation = useCreateOrganizationMutation(() => {
    reset();
    onOpenChange(false);
  });

  const onNameChange = (value: string) => {
    const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    setValue('slug', slug);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova organização</DialogTitle>
          <DialogDescription>
            A organização será criada como Ativa e o responsável precisa já ter uma conta cadastrada.
          </DialogDescription>
        </DialogHeader>

        <form
          className={styles.form}
          onSubmit={handleSubmit((values) =>
            mutation.mutate({
              name: values.name,
              slug: values.slug,
              description: values.description,
              ownerEmail: values.ownerEmail,
            }),
          )}
        >
          <div className={styles.field}>
            <label className={styles.label}>Nome da organização *</label>
            <input
              className={styles.input}
              placeholder="Ex: Rock Productions"
              {...register('name', { onChange: (e) => onNameChange(e.target.value) })}
            />
            {errors.name && <p className={styles.error}>{errors.name.message}</p>}
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Slug *</label>
            <input className={styles.input} placeholder="rock-productions" {...register('slug')} />
            {errors.slug && <p className={styles.error}>{errors.slug.message}</p>}
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Descrição</label>
            <input className={styles.input} placeholder="Opcional" {...register('description')} />
            {errors.description && <p className={styles.error}>{errors.description.message}</p>}
          </div>

          <div className={styles.field}>
            <label className={styles.label}>E-mail do responsável *</label>
            <input className={styles.input} placeholder="dono@empresa.com" {...register('ownerEmail')} />
            {errors.ownerEmail && <p className={styles.error}>{errors.ownerEmail.message}</p>}
            <p className={styles.hint}>O responsável precisa já ter uma conta cadastrada na plataforma.</p>
          </div>

          {mutation.error && <p className={styles.error}>{mutation.error.message}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Criando...' : 'Criar organização'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
