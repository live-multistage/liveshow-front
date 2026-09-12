'use client';

import { useEffect, useId, useState, type ChangeEvent, type ComponentProps, type ReactNode } from 'react';
import { Controller, useController, useFormContext, useWatch, type FieldPath } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import {
  CustomSelect, CustomSelectContent, CustomSelectItem, CustomSelectTrigger, CustomSelectValue, Input, Label,
} from '@live-show/design-system';
import {
  MAILING_LIMITS as L, mailingTextLength, type MailingBlock, type MailingTemplateDraft, type MailingTextRun,
} from '@live-show/api-contracts';
import { useUploadMailingAssetMutation } from '../mutations/mailing.mutations';
import { parseInlineMarkup, serializeInlineMarkup } from '../utils/inline-markup';
import { EventPicker } from './EventPicker';
import styles from './BlockInspector.module.scss';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const IMAGE_MAX_BYTES = 5 * 1024 * 1024;

type OptionalKey = 'href' | 'badge' | 'ctaLabel';

/** aria wiring for a control rendered inside <Field id=…>. */
export function fieldA11y(id: string, error?: string, hasHint = false) {
  const describedBy = [hasHint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ');
  return { 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy || undefined };
}

export function Field({ id, label, error, hint, counter, className, children }: {
  id: string; label: string; error?: string; hint?: string; counter?: string; className?: string; children: ReactNode;
}) {
  return (
    <div className={className ? `${styles.field} ${className}` : styles.field}>
      <div className={styles.labelRow}>
        <Label htmlFor={id}>{label}</Label>
        {counter && <span className={styles.counter}>{counter}</span>}
      </div>
      {children}
      {hint && <p id={`${id}-hint`} className={styles.hint}>{hint}</p>}
      {error && <p id={`${id}-error`} className={styles.error}>{error}</p>}
    </div>
  );
}

/** Design-system select whose trigger takes an id, so a <Label htmlFor> names it. */
export function ChoiceSelect({ id, value, onChange, options }: {
  id: string; value: string; onChange(value: string): void; options: Array<{ value: string; label: string }>;
}) {
  return (
    // Radix can emit '' while re-syncing; never write that into the form.
    <CustomSelect value={value} onValueChange={(v) => v && onChange(v)}>
      <CustomSelectTrigger id={id}><CustomSelectValue /></CustomSelectTrigger>
      <CustomSelectContent>
        {options.map((o) => <CustomSelectItem key={o.value} value={o.value}>{o.label}</CustomSelectItem>)}
      </CustomSelectContent>
    </CustomSelect>
  );
}

/**
 * Design-system Input bound through useController. The DS Input has no
 * forwardRef, so register() would lose its ref under React 18 (vitest).
 */
export function FormInput({ name, ...rest }: { name: FieldPath<MailingTemplateDraft> } &
  Omit<ComponentProps<typeof Input>, 'name' | 'value' | 'onChange' | 'onBlur'>) {
  const { field } = useController<MailingTemplateDraft>({ name });
  return (
    <Input {...rest} name={field.name} value={(field.value as string | undefined) ?? ''} onChange={field.onChange} onBlur={field.onBlur} />
  );
}

// First zod message under an RHF error node. Skips `ref`, which is a DOM node.
function firstErrorMessage(node: unknown): string | undefined {
  if (!node || typeof node !== 'object') return undefined;
  const { message } = node as { message?: unknown };
  if (typeof message === 'string') return message;
  for (const [key, child] of Object.entries(node)) {
    if (key === 'ref') continue;
    const found = firstErrorMessage(child);
    if (found) return found;
  }
  return undefined;
}

// Keeps the raw text while typing so trailing spaces and blank lines survive the
// lossy parse; re-syncs only when the form value changes from outside (reset).
function MarkupTextarea({ value, onChange, ...rest }: Omit<ComponentProps<'textarea'>, 'value' | 'onChange'> & {
  value: MailingTextRun[][]; onChange(paragraphs: MailingTextRun[][]): void;
}) {
  const [text, setText] = useState(() => serializeInlineMarkup(value ?? []));
  useEffect(() => {
    setText((current) =>
      (JSON.stringify(parseInlineMarkup(current)) === JSON.stringify(value ?? []) ? current : serializeInlineMarkup(value ?? [])));
  }, [value]);
  return (
    <textarea
      {...rest}
      className={styles.textarea}
      rows={8}
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        onChange(parseInlineMarkup(e.target.value));
      }}
    />
  );
}

function ImageUpload({ id, assetKey, error, onUploaded }: { id: string; assetKey: string; error?: string; onUploaded(key: string): void }) {
  const t = useTranslations('platformAdmin.mailing');
  const upload = useUploadMailingAssetMutation();
  const [url, setUrl] = useState<string | null>(null);
  const [rejected, setRejected] = useState(false);

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    // Mirrors the server's type/size gate (R14) so a bad file fails without a round trip.
    if (!IMAGE_TYPES.includes(file.type) || file.size > IMAGE_MAX_BYTES) {
      setRejected(true);
      return;
    }
    setRejected(false);
    upload.mutate(file, {
      onSuccess: ({ assetKey: key, url: publicUrl }) => {
        setUrl(publicUrl);
        onUploaded(key);
      },
    });
  };
  const shownError = rejected || upload.isError ? t('editor.field.uploadError') : error;

  return (
    <Field id={id} label={t('editor.field.image')} error={shownError}>
      {assetKey && (
        <div className={styles.asset}>
          {url && <img className={styles.thumb} src={url} alt="" />}
          <span className={styles.assetKey}>{assetKey.split('/').pop()}</span>
        </div>
      )}
      <Input id={id} type="file" accept={IMAGE_TYPES.join(',')} disabled={upload.isPending} onChange={onFile} {...fieldA11y(id, shownError)} />
      {upload.isPending && <p role="status" className={styles.hint}>{t('editor.field.uploading')}</p>}
    </Field>
  );
}

export function BlockInspector({ index }: { index: number }) {
  const t = useTranslations('platformAdmin.mailing');
  const uid = useId();
  const { control, setValue, formState: { errors } } = useFormContext<MailingTemplateDraft>();
  const block = useWatch({ control, name: `blocks.${index}` }) as MailingBlock | undefined;
  if (!block) return null;

  const path = `blocks.${index}` as const;
  const opts = { shouldDirty: true, shouldValidate: true } as const;
  const id = (key: string) => `${uid}-${key}`;
  const blockErrors = errors.blocks?.[index] as Record<string, unknown> | undefined;
  const error = (key: string) => firstErrorMessage(blockErrors?.[key]);

  // Optional keys are absent, never '': the schema rejects an empty URL and RHF's
  // dirty check compares keys, so clearing a field must drop its key.
  const setOptional = (key: OptionalKey, value: string) => {
    const { [key]: _dropped, ...rest } = block as unknown as Record<string, unknown>;
    setValue(path, (value ? { ...rest, [key]: value } : rest) as unknown as MailingBlock, opts);
  };
  const optionalField = (key: OptionalKey, label: string, maxLength: number) => (
    <Field id={id(key)} label={label} error={error(key)}>
      <Input
        id={id(key)}
        maxLength={maxLength}
        type={key === 'href' ? 'url' : 'text'}
        value={(block as unknown as Partial<Record<OptionalKey, string>>)[key] ?? ''}
        onChange={(e) => setOptional(key, e.target.value)}
        {...fieldA11y(id(key), error(key))}
      />
    </Field>
  );
  const textField = (key: 'text' | 'alt' | 'label' | 'href', label: string, maxLength: number, counter?: string) => (
    <Field id={id(key)} label={label} error={error(key)} counter={counter}>
      <FormInput
        id={id(key)}
        name={`${path}.${key}` as `blocks.${number}.text`}
        maxLength={maxLength}
        type={key === 'href' ? 'url' : 'text'}
        {...fieldA11y(id(key), error(key))}
      />
    </Field>
  );

  let fields: ReactNode = null;
  switch (block.type) {
    case 'heading':
      fields = (
        <>
          {textField('text', t('editor.field.text'), L.headingMax, `${(block.text ?? '').length}/${L.headingMax}`)}
          <Field id={id('size')} label={t('editor.field.size')}>
            <ChoiceSelect
              id={id('size')}
              value={block.size}
              onChange={(v) => setValue(`${path}.size` as `blocks.${number}.size`, v as 'lg' | 'md', opts)}
              options={[{ value: 'lg', label: t('editor.field.sizeLg') }, { value: 'md', label: t('editor.field.sizeMd') }]}
            />
          </Field>
        </>
      );
      break;
    case 'text':
      fields = (
        <Field
          id={id('body')}
          label={t('editor.field.body')}
          hint={t('editor.field.bodyHint')}
          error={error('paragraphs')}
          counter={`${mailingTextLength(block.paragraphs ?? [])}/${L.textBlockMax}`}
        >
          <Controller
            control={control}
            name={`${path}.paragraphs` as `blocks.${number}.paragraphs`}
            render={({ field }) => (
              <MarkupTextarea
                id={id('body')}
                value={field.value as MailingTextRun[][]}
                onChange={field.onChange}
                onBlur={field.onBlur}
                {...fieldA11y(id('body'), error('paragraphs'), true)}
              />
            )}
          />
        </Field>
      );
      break;
    case 'image':
      fields = (
        <>
          <ImageUpload
            id={id('image')}
            assetKey={block.assetKey}
            error={error('assetKey')}
            onUploaded={(key) => setValue(`${path}.assetKey` as `blocks.${number}.assetKey`, key, opts)}
          />
          {textField('alt', t('editor.field.alt'), L.altMax)}
          {optionalField('href', t('editor.field.href'), L.urlMax)}
        </>
      );
      break;
    case 'button':
      fields = (
        <>
          {textField('label', t('editor.field.label'), L.labelMax)}
          {textField('href', t('editor.field.href'), L.urlMax)}
        </>
      );
      break;
    case 'eventCard':
      fields = (
        <>
          <EventPicker
            max={1}
            value={[block.eventId].filter(Boolean)}
            onChange={(ids) => setValue(`${path}.eventId` as `blocks.${number}.eventId`, ids[0] ?? '', opts)}
          />
          {error('eventId') && <p className={styles.error}>{error('eventId')}</p>}
          {optionalField('badge', t('editor.field.badge'), L.labelMax)}
          {optionalField('ctaLabel', t('editor.field.ctaLabel'), L.labelMax)}
        </>
      );
      break;
    case 'eventList':
      fields = (
        <>
          <EventPicker
            max={3}
            value={block.eventIds ?? []}
            onChange={(ids) => setValue(`${path}.eventIds` as `blocks.${number}.eventIds`, ids, opts)}
          />
          {error('eventIds') && <p className={styles.error}>{error('eventIds')}</p>}
        </>
      );
      break;
    case 'divider':
      break;
  }

  return (
    <section className={styles.inspector} aria-labelledby={id('title')}>
      <header className={styles.header}>
        <span className={styles.index} aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
        <h2 id={id('title')} className={styles.title}>{t(`editor.block.${block.type}`)}</h2>
      </header>
      {fields && <div className={styles.fields}>{fields}</div>}
    </section>
  );
}
