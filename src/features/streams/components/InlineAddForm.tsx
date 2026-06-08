'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/shared/components/Button';
import styles from './StreamBuilder.module.scss';

interface Props {
  buttonLabel: string;
  placeholder: string;
  isPending: boolean;
  withPriority?: boolean;
  onAdd: (name: string, priority?: number) => void;
}

export function InlineAddForm({ buttonLabel, placeholder, isPending, withPriority, onAdd }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [priority, setPriority] = useState('1');

  function handleAdd() {
    if (!name.trim()) return;
    onAdd(name.trim(), withPriority ? parseInt(priority) || 1 : undefined);
    setName('');
    setPriority('1');
    setOpen(false);
  }

  function handleCancel() {
    setName('');
    setPriority('1');
    setOpen(false);
  }

  if (!open) {
    return (
      <Button variant="subtle" size="sm" uppercase icon={<Plus size={11} />} onClick={() => setOpen(true)}>
        {buttonLabel}
      </Button>
    );
  }

  return (
    <div className={styles.inlineForm}>
      <input
        className={styles.inlineInput}
        placeholder={placeholder}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleAdd();
          if (e.key === 'Escape') handleCancel();
        }}
        autoFocus
      />
      {withPriority && (
        <input
          className={`${styles.inlineInput} ${styles.inlineInputSm}`}
          placeholder="Prio"
          type="number"
          min={1}
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
        />
      )}
      <Button variant="danger" size="sm" uppercase isLoading={isPending} onClick={handleAdd}>
        Add
      </Button>
      <Button variant="subtle" size="sm" onClick={handleCancel}>✕</Button>
    </div>
  );
}
