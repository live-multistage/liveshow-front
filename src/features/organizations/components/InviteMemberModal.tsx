'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X } from 'lucide-react';
import { inviteMemberSchema, type InviteMemberValues } from '../schemas/invite-member.schema';
import { MemberRoleSelector } from './MemberRoleSelector';
import type { OrganizationRole } from '../types/organization.types';
import styles from './InviteMemberModal.module.scss';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onInvite: (values: InviteMemberValues) => void;
  isPending?: boolean;
  error?: string | null;
}

export function InviteMemberModal({ isOpen, onClose, onInvite, isPending, error }: Props) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<InviteMemberValues>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: { role: 'VIEWER' },
  });

  const role = watch('role');

  const handleClose = () => {
    reset();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Convidar Membro</h2>
          <button className={styles.closeBtn} onClick={handleClose}>
            <X size={18} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit((v) => {
            onInvite(v);
          })}
          className={styles.form}
        >
          <div className={styles.field}>
            <label className={styles.label}>E-mail *</label>
            <input
              {...register('email')}
              type="email"
              className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
              placeholder="usuario@exemplo.com"
            />
            {errors.email && <p className={styles.error}>{errors.email.message}</p>}
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Cargo *</label>
            <MemberRoleSelector
              value={role}
              onChange={(r: OrganizationRole) => setValue('role', r)}
              disabled={isPending}
            />
            {errors.role && <p className={styles.error}>{errors.role.message}</p>}
          </div>

          {error && <p className={`${styles.error} ${styles.globalError}`}>{error}</p>}

          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={handleClose}>
              Cancelar
            </button>
            <button type="submit" className={styles.submitBtn} disabled={isPending}>
              {isPending ? 'Enviando...' : 'Enviar Convite'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
