'use client';

import { useRef, useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Button, Input, Label, Textarea } from '@live-show/design-system';
import { PAGE_ASSET_LIMITS, type PageCta } from '@live-show/api-contracts';
import type { SectionIssue } from '../hooks/page-editor-reducer';
import { useUploadPageAssetMutation } from '../mutations/use-page-mutations';
import styles from './SectionInspector.module.scss';

/** First schema issue under any of the given property paths ("primaryCta" matches "primaryCta.href"). */
export function issueFor(issues: SectionIssue[], ...paths: string[]): SectionIssue | undefined {
  return issues.find((issue) => paths.some((path) => issue.path === path || issue.path.startsWith(`${path}.`)));
}

export function Field({ id, label, required, counter, error, hint, children }: {
  id: string; label: string; required?: boolean; counter?: string; error?: string; hint?: string; children: ReactNode;
}) {
  return (
    <div className={styles.field}>
      <div className={styles.labelRow}>
        <Label htmlFor={id}>{label}{required && <span className={styles.required} aria-hidden="true"> *</span>}</Label>
        {counter && <span className={styles.counter}>{counter}</span>}
      </div>
      {children}
      {hint && <p id={`${id}-hint`} className={styles.hint}>{hint}</p>}
      {error && <p id={`${id}-error`} className={styles.error}>{error}</p>}
    </div>
  );
}

const a11y = (id: string, error?: string) => ({
  'aria-invalid': error ? true : undefined,
  'aria-describedby': error ? `${id}-error` : undefined,
});

interface TextProps {
  id: string;
  label: string;
  value: string;
  onChange(value: string): void;
  max?: number;
  required?: boolean;
  multiline?: boolean;
  error?: string;
}

export function TextField({ id, label, value, onChange, max, required, multiline, error }: TextProps) {
  return (
    <Field id={id} label={label} required={required} error={error} counter={max ? `${value.length}/${max}` : undefined}>
      {multiline
        ? <Textarea id={id} rows={3} value={value} maxLength={max} onChange={(e) => onChange(e.target.value)} {...a11y(id, error)} />
        : <Input id={id} value={value} maxLength={max} onChange={(e) => onChange(e.target.value)} {...a11y(id, error)} />}
    </Field>
  );
}

/** Textarea parsed into structured data on every keystroke; the raw text stays local so blank lines survive typing. */
export function ParsedTextField({ id, label, initial, onText, rows = 5, required, hint, counter, error }: {
  id: string; label: string; initial: string; onText(text: string): void; rows?: number; required?: boolean;
  hint?: string; counter?: number; error?: string;
}) {
  const [text, setText] = useState(initial);
  return (
    <Field id={id} label={label} required={required} error={error} hint={hint} counter={counter ? `${text.length}/${counter}` : undefined}>
      <Textarea id={id} rows={rows} value={text} onChange={(e) => { setText(e.target.value); onText(e.target.value); }} {...a11y(id, error)} />
    </Field>
  );
}

/** Label + link pair. Both empty means "no button"; a half-filled pair is left for the schema to flag. */
export function CtaFields({ id, labelText, hrefText, value, onChange, labelError, hrefError }: {
  id: string; labelText: string; hrefText: string; value: PageCta | undefined; onChange(value: PageCta | undefined): void;
  labelError?: string; hrefError?: string;
}) {
  const current = value ?? { label: '', href: '' };
  const emit = (next: PageCta) => onChange(next.label === '' && next.href === '' ? undefined : next);
  return (
    <>
      <TextField id={`${id}-label`} label={labelText} value={current.label} max={28} error={labelError}
        onChange={(label) => emit({ ...current, label })} />
      <TextField id={`${id}-href`} label={hrefText} value={current.href} max={2048} error={hrefError}
        onChange={(href) => emit({ ...current, href })} />
    </>
  );
}

export function Segment<T extends string>({ label, value, options, onChange }: {
  label: string; value: T; options: readonly { value: T; label: string }[]; onChange(value: T): void;
}) {
  return (
    <div className={styles.field}>
      <span className={styles.flabel}>{label}</span>
      <div className={styles.seg} role="group" aria-label={label}>
        {options.map((option) => (
          <button key={option.value} type="button" aria-pressed={option.value === value}
            className={option.value === value ? styles.segOn : undefined} onClick={() => onChange(option.value)}>
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

const isInvalidAsset = (error: { status?: number; code?: string }) =>
  error.status === 413 || (error.status === 400 && error.code === 'INVALID_ASSET');

/** Client-side type/size guard, then upload; reports the resulting https url. */
export function ImageUpload({ onUploaded }: { onUploaded(url: string): void }) {
  const t = useTranslations('platformAdmin.pageEditor.inspector.upload');
  const upload = useUploadPageAssetMutation();
  const input = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);

  const pick = async (file: File | undefined) => {
    if (input.current) input.current.value = '';
    if (!file) return;
    const accepted = (PAGE_ASSET_LIMITS.mimeTypes as readonly string[]).includes(file.type) && file.size <= PAGE_ASSET_LIMITS.maxBytes;
    if (!accepted) return setMessage(t('invalid'));
    setMessage(null);
    try {
      onUploaded((await upload.mutateAsync(file)).url);
    } catch (error) {
      setMessage(isInvalidAsset(error as { status?: number; code?: string }) ? t('invalid') : t('error'));
    }
  };

  return (
    <div className={styles.upload}>
      <input ref={input} type="file" className={styles.fileInput} aria-label={t('button')} tabIndex={-1}
        accept={PAGE_ASSET_LIMITS.mimeTypes.join(',')} onChange={(e) => void pick(e.target.files?.[0])} />
      <Button type="button" variant="outline" size="sm" disabled={upload.isPending} onClick={() => input.current?.click()}>
        {upload.isPending ? t('uploading') : t('button')}
      </Button>
      {message && <p role="alert" className={styles.error}>{message}</p>}
    </div>
  );
}
