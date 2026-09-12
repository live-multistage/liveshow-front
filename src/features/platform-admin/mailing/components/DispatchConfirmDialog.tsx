'use client';

import { useTranslations } from 'next-intl';
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@live-show/design-system';

const SP_FORMAT = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' });

export function DispatchConfirmDialog({ open, count, scheduledAt, pending, onConfirm, onOpenChange }: {
  open: boolean; count: number; scheduledAt: string | null; pending: boolean; onConfirm(): void; onOpenChange(o: boolean): void;
}) {
  const t = useTranslations('platformAdmin.mailing');
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('wizard.confirmTitle')}</DialogTitle>
          <DialogDescription>
            {scheduledAt
              ? t('wizard.confirmScheduled', { count, date: SP_FORMAT.format(new Date(scheduledAt)) })
              : t('wizard.confirmNow', { count })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button>
          <Button onClick={onConfirm} disabled={pending} aria-busy={pending || undefined}>{t('wizard.confirmSend')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
