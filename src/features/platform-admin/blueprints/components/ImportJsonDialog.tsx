'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { AlertCircle } from 'lucide-react';
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@live-show/design-system';
import type { BlueprintGraph } from '@live-show/api-contracts';
import type { AppError } from '@/lib/http/errors';
import { useSaveBlueprintVersionMutation } from '../mutations/blueprints.mutations';
import styles from './ImportJsonDialog.module.scss';

interface Props {
  blueprintId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Design B3: paste an exported graph to create a new draft version.
export function ImportJsonDialog({ blueprintId, open, onOpenChange }: Props) {
  const t = useTranslations('platformAdmin.blueprints');
  const save = useSaveBlueprintVersionMutation();
  const [json, setJson] = useState('');
  const [error, setError] = useState<string | null>(null);

  function onSubmit() {
    let graph: BlueprintGraph;
    try {
      graph = JSON.parse(json) as BlueprintGraph;
    } catch {
      setError(t('detail.invalidJson'));
      return;
    }
    setError(null);
    save.mutate(
      { id: blueprintId, graph },
      {
        onSuccess: () => { setJson(''); onOpenChange(false); },
        onError: (err: AppError) => setError(t(`errors.${err.code ?? 'GENERIC'}`)),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) { setJson(''); setError(null); } onOpenChange(next); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('detail.importTitle')}</DialogTitle>
          <DialogDescription>{t('detail.importHint')}</DialogDescription>
        </DialogHeader>
        <textarea
          aria-label={t('detail.importTitle')}
          className={styles.json}
          value={json}
          onChange={(e) => setJson(e.target.value)}
          spellCheck={false}
          rows={12}
        />
        {error && (
          <p role="alert" className={styles.error}><AlertCircle size={14} />{error}</p>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t('newDialog.cancel')}</Button>
          <Button onClick={onSubmit} disabled={save.isPending || !json.trim()}>{t('detail.importSubmit')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
