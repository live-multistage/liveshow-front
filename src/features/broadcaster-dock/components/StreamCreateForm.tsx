'use client';

import { useState } from 'react';
import { useCreateStreamMutation } from '@/features/streams/mutations/stream.mutations';
import type { StreamResponse } from '@/features/streams/types/stream.types';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Button } from '@/shared/components/ui/button';
import styles from './Dock.module.scss';

interface StreamCreateFormProps {
  eventId: string;
  onCreated: (stream: StreamResponse) => void;
  onCancel: () => void;
}

export function StreamCreateForm({ eventId, onCreated, onCancel }: StreamCreateFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const create = useCreateStreamMutation(eventId, onCreated);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    create.mutate({ title: title.trim(), description: description.trim() || undefined });
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <h2 className={styles.heading}>Criar nova stream</h2>
      <div className={styles.stackTight}>
        <Label htmlFor="stream-title">Título</Label>
        <Input
          id="stream-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={create.isPending}
          autoFocus
        />
      </div>
      <div className={styles.stackTight}>
        <Label htmlFor="stream-description">Descrição (opcional)</Label>
        <Input
          id="stream-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={create.isPending}
        />
      </div>
      {create.error && <p className={styles.errorSm}>{create.error.message}</p>}
      <div className={styles.row}>
        <Button type="submit" disabled={create.isPending || !title.trim()}>
          {create.isPending ? 'Criando...' : 'Criar'}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={create.isPending}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
