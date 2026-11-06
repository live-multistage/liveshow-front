'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import {
  Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@live-show/design-system';
import { PAGE_BLOCK_LIMITS, countElements, createPageBlockSchema, type PageElement } from '@live-show/api-contracts';
import type { AppError } from '@/lib/http/errors';
import { useCreatePageBlockMutation } from '../../queries/use-page-blocks';
import { fromPuckData } from '../puck-data';
import { TYPE_ICONS } from './type-icons';
import styles from './left.module.scss';

type OpenSaveAsBlock = (element: PageElement) => void;
const SaveAsBlockContext = createContext<OpenSaveAsBlock>(() => undefined);

/** Opens the "Salvar como bloco" dialog for a section, columns or column element (as Puck holds it). */
export const useSaveAsBlock = () => useContext(SaveAsBlockContext);

export function SaveAsBlockProvider({ children }: { children: ReactNode }) {
  const [element, setElement] = useState<PageElement | null>(null);
  const open = useCallback<OpenSaveAsBlock>((next) => setElement(next), []);
  const close = useCallback(() => setElement(null), []);
  const value = useMemo(() => open, [open]);
  return (
    <SaveAsBlockContext.Provider value={value}>
      {children}
      {element && <SaveBlockDialog element={element} onClose={close} />}
    </SaveAsBlockContext.Provider>
  );
}

const FORBIDDEN = 403;

/** 403: no permission; 400: what the API rejected (message, with the field path when it sends one). */
function saveErrorMessage(error: AppError, t: (key: string) => string): string {
  if (error.status === FORBIDDEN) return t('blocks.save.forbidden');
  if (error.status !== 400) return t('blocks.save.error');
  const first = Array.isArray(error.details) ? (error.details[0] as { field?: string; path?: string; message?: string } | undefined) : undefined;
  const where = first?.path ?? first?.field;
  const text = first?.message ?? (Array.isArray(error.message) ? String(error.message[0]) : error.message);
  return text ? (where ? `${where}: ${text}` : text) : t('blocks.save.error');
}

function SaveBlockDialog({ element, onClose }: { element: PageElement; onClose(): void }) {
  const t = useTranslations('platformAdmin.pageEditorV2');
  const create = useCreatePageBlockMutation();
  const [name, setName] = useState('');
  const [invalid, setInvalid] = useState<string | null>(null);
  // Puck ids carry a type prefix; the saved block must hold contract ids. No resolved data lives in the element.
  const clean = useMemo(() => fromPuckData({ root: { props: {} }, content: [element] } as never).content[0] as PageElement, [element]);
  const Icon = TYPE_ICONS[clean.type];

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = createPageBlockSchema.safeParse({ name, element: clean });
    if (!parsed.success) return setInvalid(parsed.error.issues[0]?.message ?? t('blocks.save.invalid'));
    setInvalid(null);
    create.mutate(parsed.data, {
      onSuccess: (saved) => { toast.success(t('blocks.save.saved', { name: saved.name })); onClose(); },
    });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('blocks.save.title')}</DialogTitle>
          <DialogDescription>{t('blocks.save.eyebrow')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} id="save-block-form" className={styles.field}>
          <label className={styles.field}>
            <span>{t('blocks.save.name')} <span aria-hidden="true">{name.length}/{PAGE_BLOCK_LIMITS.nameMax}</span></span>
            <input className={styles.fieldInput} value={name} maxLength={PAGE_BLOCK_LIMITS.nameMax} autoFocus onChange={(e) => setName(e.target.value)} />
          </label>
          <div className={styles.summary}>
            <Icon aria-hidden="true" />
            <span>{t('blocks.save.summary', { type: t(`types.${clean.type}`), count: countElements([clean]) })}</span>
          </div>
          <p className={styles.note}>{t('blocks.save.note')}</p>
          {invalid && <p className={styles.error} role="alert">{invalid}</p>}
          {create.error && <p className={styles.error} role="alert">{saveErrorMessage(create.error, t)}</p>}
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>{t('blocks.save.cancel')}</Button>
          <Button type="submit" form="save-block-form" disabled={name.trim() === '' || create.isPending}>{t('blocks.save.submit')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
