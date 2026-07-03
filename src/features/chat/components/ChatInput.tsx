'use client';

import { useState, type FormEvent } from 'react';
import { Send } from 'lucide-react';
import styles from './ChatInput.module.scss';

interface Props {
  onSend: (body: string) => void;
}

export function ChatInput({ onSend }: Props) {
  const [value, setValue] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    onSend(value);
    setValue('');
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Mensagem…"
        className={styles.input}
      />
      <button type="submit" className={styles.sendBtn} aria-label="Enviar mensagem" disabled={!value.trim()}>
        <Send size={13} />
      </button>
    </form>
  );
}
