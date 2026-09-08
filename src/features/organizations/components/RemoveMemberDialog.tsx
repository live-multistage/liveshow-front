'use client';

import { useTranslations } from 'next-intl';
import styles from './RemoveMemberDialog.module.scss';

interface Props {
  isOpen: boolean;
  memberName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isPending?: boolean;
  /** Overrides for reuse by other destructive confirmations (e.g. revoking an invitation). */
  title?: string;
  body?: React.ReactNode;
  confirmLabel?: string;
  pendingLabel?: string;
}

export function RemoveMemberDialog({
  isOpen,
  memberName,
  onConfirm,
  onCancel,
  isPending,
  title,
  body,
  confirmLabel,
  pendingLabel,
}: Props) {
  const t = useTranslations('organizations');
  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.title}>{title ?? 'Remover Membro'}</h2>
        <p className={styles.body}>
          {body ?? (
            <>
              Tem certeza que deseja remover <strong>{memberName}</strong> da organização? Esta ação
              não pode ser desfeita.
            </>
          )}
        </p>
        <div className={styles.actions}>
          <button className={styles.cancelBtn} onClick={onCancel} disabled={isPending}>
            Cancelar
          </button>
          <button className={styles.confirmBtn} onClick={onConfirm} disabled={isPending}>
            {isPending ? (pendingLabel ?? t('removing')) : (confirmLabel ?? t('removeBtn'))}
          </button>
        </div>
      </div>
    </div>
  );
}
