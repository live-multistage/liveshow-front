'use client';

import type { ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { Button } from '@live-show/design-system';
import styles from './PageDrawers.module.scss';

interface Props {
  label: string;
  heading: string;
  closeLabel: string;
  onClose(): void;
  footer?: ReactNode;
  children: ReactNode;
}

/** Right-hand drawer shared by history and settings. Mounted only while open. */
export function PageDrawer({ label, heading, closeLabel, onClose, footer, children }: Props) {
  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content className={styles.drawer} aria-label={label} aria-labelledby={undefined} aria-describedby={undefined}>
          <div className={styles.drawerHeader}>
            <Dialog.Title asChild><span>{heading}</span></Dialog.Title>
            <Dialog.Close asChild>
              <Button type="button" variant="ghost" size="icon" aria-label={closeLabel}><X aria-hidden="true" /></Button>
            </Dialog.Close>
          </div>
          <div className={styles.drawerBody}>{children}</div>
          {footer && <div className={styles.drawerFooter}>{footer}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
