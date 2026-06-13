'use client';

import styles from './RemoveMemberDialog.module.scss';

interface Props {
  isOpen: boolean;
  memberName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isPending?: boolean;
}

export function RemoveMemberDialog({ isOpen, memberName, onConfirm, onCancel, isPending }: Props) {
  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.title}>Remover Membro</h2>
        <p className={styles.body}>
          Tem certeza que deseja remover <strong>{memberName}</strong> da organização? Esta ação não
          pode ser desfeita.
        </p>
        <div className={styles.actions}>
          <button className={styles.cancelBtn} onClick={onCancel} disabled={isPending}>
            Cancelar
          </button>
          <button className={styles.confirmBtn} onClick={onConfirm} disabled={isPending}>
            {isPending ? 'Removendo...' : 'Remover'}
          </button>
        </div>
      </div>
    </div>
  );
}
