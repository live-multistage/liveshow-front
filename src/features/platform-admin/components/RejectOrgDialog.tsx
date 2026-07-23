'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { X } from 'lucide-react';
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@live-show/design-system';
import { useRejectOrganizationMutation } from '../mutations/reject-organization.mutation';
import type { PlatformOrganization } from '../types/platform-admin.types';
import styles from './ReviewOrgDialog.module.scss';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organization: PlatformOrganization;
  onRejected?: () => void;
}

export function RejectOrgDialog({ open, onOpenChange, organization, onRejected }: Props) {
  const t = useTranslations('platformAdmin');
  const [reason, setReason] = useState('');
  const mutation = useRejectOrganizationMutation(() => {
    setReason('');
    onOpenChange(false);
    onRejected?.();
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className={styles.headRow}>
            <div className={`${styles.iconWrap} ${styles.iconWrapReject}`}>
              <X size={20} strokeWidth={2.2} />
            </div>
            <div>
              <DialogTitle>{t('rejectTitle')}</DialogTitle>
              <DialogDescription>{t('rejectDesc')}</DialogDescription>
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
        </div>

        <div className={styles.field}>
          <label className={styles.label}>
            MOTIVO DA REJEIÇÃO <span className={styles.required}>*</span>
          </label>
          <textarea
            className={styles.textarea}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t('rejectPlaceholder')}
            rows={3}
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
            {mutation.isPending ? 'Rejeitando...' : 'Rejeitar cadastro'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
