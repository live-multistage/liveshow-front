'use client';

import { useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import {
  Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, Label,
} from '@live-show/design-system';
import type { AppError } from '@/lib/http/errors';
import { blueprintErrorMessage } from '../errorMessage';
import { useCreateBlueprintMutation } from '../mutations/blueprints.mutations';
import styles from './NewBlueprintDialog.module.scss';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (id: string) => void;
}

// Design A1/A2 modal: name (required, ≤120) + description (optional, ≤500).
export function NewBlueprintDialog({ open, onOpenChange, onCreated }: Props) {
  const t = useTranslations('platformAdmin.blueprints');
  const create = useCreateBlueprintMutation();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setName('');
    setDescription('');
    setError(null);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) return;
    setError(null);
    create.mutate(
      { name: name.trim(), description: description.trim() || undefined },
      {
        onSuccess: (summary) => { reset(); onOpenChange(false); onCreated(summary.id); },
        onError: (err: AppError) => setError(blueprintErrorMessage(t, err.code)),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) reset(); onOpenChange(next); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('new')}</DialogTitle>
          <DialogDescription>{t('newDialog.hint')}</DialogDescription>
        </DialogHeader>
        <form className={styles.form} onSubmit={onSubmit}>
          <div className={styles.field}>
            <Label htmlFor="blueprint-name">{t('name')}</Label>
            <Input
              id="blueprint-name"
              value={name}
              maxLength={120}
              placeholder={t('newDialog.namePlaceholder')}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
            <span className={styles.counter}>{name.length} / 120</span>
          </div>
          <div className={styles.field}>
            <Label htmlFor="blueprint-description">{t('newDialog.descriptionLabel')}</Label>
            <textarea
              id="blueprint-description"
              className={styles.textarea}
              value={description}
              maxLength={500}
              placeholder={t('newDialog.descriptionPlaceholder')}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          {error && <p role="alert" className={styles.error}>{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t('newDialog.cancel')}</Button>
            <Button type="submit" disabled={create.isPending || !name.trim()}>{t('create')}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
