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
import type { LegalLocale } from '../utils/legal-doc';
import styles from './LegalConfirmDialogs.module.scss';

interface PublishProps {
  open: boolean;
  docName: string;
  nextVersion: number;
  summary: string;
  locales: LegalLocale[];
  onCancel: () => void;
  onConfirm: () => void;
}

export function PublishConfirmDialog({ open, docName, nextVersion, summary, locales, onCancel, onConfirm }: PublishProps) {
  const t = useTranslations('platformAdmin.legal.confirm');
  const hasPrevious = nextVersion > 1;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('title', { n: nextVersion, doc: docName })}</DialogTitle>
          <DialogDescription>
            {hasPrevious ? t('body', { prev: nextVersion - 1 }) : t('bodyFirst')}
          </DialogDescription>
        </DialogHeader>
        <div className={styles.summaryBox}>
          <div className={styles.eyebrow}>{t('summary')}</div>
          <div className={styles.summary}>{summary}</div>
          <div className={styles.langs}>
            <span>{t('included')}</span>
            {locales.map((l) => (
              <span key={l} className={styles.lang}>{l.toUpperCase()}</span>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>{t('cancel')}</Button>
          <Button onClick={onConfirm}>{t('confirm', { n: nextVersion })}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface DiscardProps {
  open: boolean;
  onKeep: () => void;
  onDiscard: () => void;
}

export function DiscardChangesDialog({ open, onKeep, onDiscard }: DiscardProps) {
  const t = useTranslations('platformAdmin.legal.discardDialog');

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onKeep()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('body')}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onKeep}>{t('keep')}</Button>
          <Button onClick={onDiscard}>{t('confirm')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
