'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Building2, Check, X, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { organizationService } from '@/features/organizations/services/organization.service';
import { useCreateOrganizationMutation } from '../mutations/create-organization.mutation';
import { createOrganizationSchema, type CreateOrganizationFormValues } from '../schemas/create-organization.schema';
import styles from './CreateOrganizationDialog.module.scss';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type SlugState = 'idle' | 'checking' | 'available' | 'taken';

export function CreateOrganizationDialog({ open, onOpenChange }: Props) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateOrganizationFormValues>({ resolver: zodResolver(createOrganizationSchema) });

  const [slugState, setSlugState] = useState<SlugState>('idle');
  const slug = watch('slug');

  useEffect(() => {
    if (!slug || slug.length < 2) {
      setSlugState('idle');
      return;
    }
    setSlugState('checking');
    const timeout = setTimeout(() => {
      organizationService
        .checkSlug(slug)
        .then((res) => setSlugState(res.available ? 'available' : 'taken'))
        .catch(() => setSlugState('idle'));
    }, 400);
    return () => clearTimeout(timeout);
  }, [slug]);

  const mutation = useCreateOrganizationMutation(() => {
    reset();
    setSlugState('idle');
    onOpenChange(false);
  });

  const onNameChange = (value: string) => {
    const derived = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    setValue('slug', derived);
  };

  const slugMsg =
    slugState === 'checking' ? 'Verificando disponibilidade…'
    : slugState === 'available' ? 'Disponível'
    : slugState === 'taken' ? 'Já em uso — escolha outro slug'
    : null;

  const slugMsgClass =
    slugState === 'taken' ? styles.slugMsgError
    : slugState === 'available' ? styles.slugMsgOk
    : styles.slugMsgNeutral;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className={styles.headRow}>
            <div className={styles.iconWrap}>
              <Building2 size={20} strokeWidth={2} />
            </div>
            <div>
              <DialogTitle>Criar organização</DialogTitle>
              <DialogDescription>Cadastre manualmente — o responsável precisa já ter uma conta.</DialogDescription>
            </div>
          </div>
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
            <label className={styles.label}>NOME</label>
            <input
              className={styles.input}
              placeholder="Ex: Rock Productions"
              {...register('name', { onChange: (e) => onNameChange(e.target.value) })}
            />
            {errors.name && <p className={styles.error}>{errors.name.message}</p>}
          </div>

          <div className={styles.field}>
            <label className={styles.label}>SLUG</label>
            <div className={styles.slugWrapper}>
              <span className={styles.slugPrefix}>@</span>
              <input className={`${styles.input} ${styles.slugInput}`} placeholder="rock-productions" {...register('slug')} />
              <span className={styles.slugIcon}>
                {slugState === 'checking' && <Loader2 size={15} className="animate-spin" color="#8f8f97" />}
                {slugState === 'available' && <Check size={15} color="#7fe0a0" />}
                {slugState === 'taken' && <X size={15} color="#f87171" />}
              </span>
            </div>
            {errors.slug && <p className={styles.error}>{errors.slug.message}</p>}
            {!errors.slug && slugMsg && <p className={slugMsgClass}>{slugMsg}</p>}
          </div>

          <div className={styles.field}>
            <label className={styles.label}>E-MAIL DO RESPONSÁVEL</label>
            <input className={styles.input} placeholder="dono@empresa.com" {...register('ownerEmail')} />
            {errors.ownerEmail && <p className={styles.error}>{errors.ownerEmail.message}</p>}
          </div>

          <div className={styles.field}>
            <label className={styles.label}>DESCRIÇÃO (opcional)</label>
            <input className={styles.input} placeholder="Breve descrição da organização…" {...register('description')} />
            {errors.description && <p className={styles.error}>{errors.description.message}</p>}
          </div>

          <div className={styles.infoBanner}>
            A organização será criada como <strong>Ativa</strong> e o responsável precisa já ter uma conta cadastrada na plataforma.
          </div>

          {mutation.error && <p className={styles.error}>{mutation.error.message}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending || slugState === 'taken'}>
              {mutation.isPending ? 'Criando...' : 'Criar e convidar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
