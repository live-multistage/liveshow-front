'use client';

import { useTranslations } from 'next-intl';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@live-show/design-system';

interface Props {
  open: boolean;
  channelName: string;
  isPending?: boolean;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
}

export function CancelSubscriptionModal({
  open,
  channelName,
  isPending,
  onConfirm,
  onOpenChange,
}: Props) {
  const t = useTranslations('account.subscriptions');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('cancelTitle')}</DialogTitle>
          <DialogDescription>{t('cancelBody', { name: channelName })}</DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            {t('cancelDismiss')}
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isPending}>
            {isPending ? t('cancelling') : t('cancelConfirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
