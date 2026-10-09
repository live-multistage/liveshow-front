'use client';

import { useRef, useState, type MutableRefObject } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import {
  GENERATED_JSONLD_TYPES,
  SEO_PAGE_VARIABLES,
  normalizeSeoPath,
  pageKeyForPath,
  type SeoFields,
  type SeoPageKey,
  type SeoPathOverride,
} from '@live-show/api-contracts';
import { Button, Dialog, DialogContent, DialogDescription, DialogTitle } from '@live-show/design-system';
import type { AppError } from '@/lib/http/errors';
import {
  useCreateSeoOverrideMutation,
  useSeoOverridesQuery,
  useSeoTemplatesQuery,
  useSetSeoTemplateMutation,
  useUpdateSeoOverrideMutation,
} from '../queries/use-seo-admin';
import { checkJsonLd } from '../utils/check-jsonld';
import { seoFieldErrors } from '../utils/seo-field-errors';
import { formatSeoDate } from '../utils/seo-format';
import {
  EMPTY_FORM,
  PAGE_ROUTES,
  fillVariables,
  isHttpsUrl,
  pageNameKey,
  sameForm,
  toFields,
  toForm,
  type SeoForm,
} from '../utils/seo-form';
import { ConfirmDialog } from './ConfirmDialog';
import { GooglePreview } from './GooglePreview';
import { IndexingSection } from './IndexingSection';
import { JsonLdSection } from './JsonLdSection';
import { PathField } from './PathField';
import { SearchSection } from './SearchSection';
import { SharingSection } from './SharingSection';
import { useSampleValue } from './use-sample';
import styles from './SeoEditorDrawer.module.scss';
import common from './SeoCommon.module.scss';

export type EditorTarget =
  | { kind: 'template'; pageKey: SeoPageKey }
  | { kind: 'override'; override: SeoPathOverride | null };

interface Props {
  target: EditorTarget | null;
  onClose: () => void;
  onOpenOverride: (override: SeoPathOverride) => void;
}

export function SeoEditorDrawer({ target, onClose, onOpenOverride }: Props) {
  // The body owns the dirty state; every dismissal (X, Esc, backdrop) goes through its guard.
  const requestClose = useRef<(() => void) | null>(null);
  return (
    <Dialog open={target !== null} onOpenChange={(open) => !open && (requestClose.current ?? onClose)()}>
      <DialogContent className={styles.drawer}>
        {target && (
          <SeoEditorBody
            key={target.kind === 'template' ? target.pageKey : (target.override?.id ?? 'new')}
            target={target}
            requestClose={requestClose}
            onClose={onClose}
            onOpenOverride={onOpenOverride}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

type Confirm = 'restore' | 'discard' | null;
const KNOWN_FIELDS = ['titleTemplate', 'descriptionTemplate', 'ogImageUrl', 'path'];

function SeoEditorBody({
  target,
  onClose,
  onOpenOverride,
  requestClose,
}: Props & { target: EditorTarget; requestClose: MutableRefObject<(() => void) | null> }) {
  const t = useTranslations('platformAdmin.seo.editor');
  const tNames = useTranslations('platformAdmin.seo.pageNames');
  const locale = useLocale();
  const sample = useSampleValue();
  const templates = useSeoTemplatesQuery();
  const overrides = useSeoOverridesQuery();
  const setTemplate = useSetSeoTemplateMutation();
  const createOverride = useCreateSeoOverrideMutation();
  const updateOverride = useUpdateSeoOverrideMutation();

  const isTemplate = target.kind === 'template';
  const source: (SeoFields & { updatedAt: string | null }) | null = isTemplate
    ? (templates.data?.find((x) => x.pageKey === target.pageKey) ?? null)
    : target.override;
  const initialForm = source ? toForm(source) : EMPTY_FORM;
  const initialPath = target.kind === 'override' ? (target.override?.path ?? '') : '';

  const [form, setForm] = useState<SeoForm>(initialForm);
  const [path, setPath] = useState(initialPath);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [conflict, setConflict] = useState(false);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [saving, setSaving] = useState(false);

  const normalizedPath = path.trim() ? normalizeSeoPath(path) : '';
  const pageKey = isTemplate ? target.pageKey : normalizedPath ? pageKeyForPath(normalizedPath) : null;
  const vars = pageKey ? SEO_PAGE_VARIABLES[pageKey] : [];
  const pageName = pageKey ? tNames(pageNameKey(pageKey)) : '';

  const dirty = !sameForm(form, initialForm) || path !== initialPath;
  const localInvalid =
    (!isTemplate && !pageKey) ||
    (form.ogImage !== '' && !isHttpsUrl(form.ogImage)) ||
    form.blocks.some((b) => !checkJsonLd(b, vars).ok);
  const canSave = dirty && !localInvalid && !saving;

  const edit = (patch: Partial<SeoForm>) => {
    setForm((prev) => ({ ...prev, ...patch }));
    setErrors({});
  };
  const changePath = (value: string) => {
    setPath(value);
    setConflict(false);
    setErrors({});
  };

  const submit = async (fields: SeoFields) => {
    if (!pageKey) return;
    setSaving(true);
    setErrors({});
    setConflict(false);
    try {
      if (isTemplate) await setTemplate.mutateAsync({ pageKey, fields });
      else if (target.override) await updateOverride.mutateAsync({ id: target.override.id, input: { ...fields, path: normalizedPath } });
      else await createOverride.mutateAsync({ ...fields, path: normalizedPath });
      toast.success(t('toast.saved', { name: isTemplate ? pageName : normalizedPath }));
      onClose();
    } catch (err) {
      const { status } = err as AppError;
      const fieldErrors = seoFieldErrors(err as AppError);
      if (status === 409) setConflict(true);
      else if (status === 400 && Object.keys(fieldErrors).length > 0) setErrors(fieldErrors);
      else toast.error(t('toast.error'));
    } finally {
      setSaving(false);
    }
  };

  const restoreDefault = () => {
    setConfirm(null);
    setForm(EMPTY_FORM);
    void submit(toFields(EMPTY_FORM));
  };

  const openExisting = () => {
    const existing = overrides.data?.find((o) => o.path === normalizedPath);
    if (existing) onOpenOverride(existing);
  };

  const leave = () => (dirty ? setConfirm('discard') : onClose());
  requestClose.current = leave;
  const unmatched = Object.entries(errors).filter(([field]) => !field.startsWith('extraJsonLd[') && !KNOWN_FIELDS.includes(field));
  const previewPath = isTemplate ? PAGE_ROUTES[target.pageKey] : (normalizedPath || '/');
  const mainVar = vars.find((v) => !v.startsWith('site.') && v.endsWith('.name')) ?? null;
  const title = isTemplate ? pageName : (target.override?.path ?? t('newOverride'));

  return (
    <>
      <header className={styles.header}>
        <div>
          <div className={common.eyebrow}>{t(isTemplate ? 'eyebrowPage' : 'eyebrowOverride')}</div>
          <DialogTitle className={styles.title}>
            {title}
            {isTemplate && <span className={styles.route}>{PAGE_ROUTES[target.pageKey]}</span>}
            {dirty && <span className={styles.dirty}>{t('unsaved')}</span>}
          </DialogTitle>
          <DialogDescription className={styles.srOnly}>{t('description')}</DialogDescription>
        </div>
      </header>

      <div className={styles.body}>
        {!isTemplate && (
          <PathField
            value={path}
            pageKey={pageKey}
            conflict={conflict}
            serverError={errors.path}
            onChange={changePath}
            onOpenExisting={openExisting}
          />
        )}
        {unmatched.map(([field, message]) => (
          <div key={field} role="alert" className={common.alert}>{message}</div>
        ))}
        {pageKey && (
          <div className={styles.columns}>
            <SearchSection form={form} vars={vars} errors={errors} onChange={edit} />
            <GooglePreview
              title={fillVariables(form.title, sample)}
              description={fillVariables(form.description, sample)}
              path={previewPath}
              noindex={form.index === 'no'}
              sampleName={mainVar ? sample(mainVar) : null}
            />
          </div>
        )}
        {pageKey && (
          <>
            <SharingSection value={form.ogImage} error={errors.ogImageUrl} onChange={(ogImage) => edit({ ogImage })} />
            <IndexingSection index={form.index} follow={form.follow} onChange={edit} />
            <JsonLdSection generatedTypes={GENERATED_JSONLD_TYPES[pageKey]} vars={vars} form={form} errors={errors} onChange={edit} />
          </>
        )}
      </div>

      <footer className={styles.footer}>
        {source && <Button variant="outline" onClick={() => setConfirm('restore')}>{t('footer.restore')}</Button>}
        <span className={common.footerNote}>
          {source?.updatedAt && t('footer.changedAt', { date: formatSeoDate(source.updatedAt, locale) })}
        </span>
        <Button variant="outline" onClick={leave}>{t('footer.cancel')}</Button>
        <Button disabled={!canSave} onClick={() => submit(toFields(form))}>
          {saving ? t('footer.saving') : t('footer.save')}
        </Button>
      </footer>

      <ConfirmDialog
        open={confirm === 'restore'}
        title={t('restoreDialog.title')}
        body={t('restoreDialog.body', { name: isTemplate ? pageName : normalizedPath })}
        cancelLabel={t('footer.cancel')}
        confirmLabel={t('restoreDialog.confirm')}
        onCancel={() => setConfirm(null)}
        onConfirm={restoreDefault}
      />
      <ConfirmDialog
        open={confirm === 'discard'}
        title={t('discardDialog.title')}
        body={t('discardDialog.body')}
        cancelLabel={t('discardDialog.keep')}
        confirmLabel={t('discardDialog.confirm')}
        onCancel={() => setConfirm(null)}
        onConfirm={() => { setConfirm(null); onClose(); }}
      />
    </>
  );
}
