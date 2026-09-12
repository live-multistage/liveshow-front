'use client';

import { useEffect, useId, useState, type MouseEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Controller, FormProvider, useFieldArray, useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@live-show/design-system';
import { MAILING_LIMITS as L, mailingTemplateDraftSchema, type MailingTemplateDraft } from '@live-show/api-contracts';
import { PlatformPageShell } from '../../components/PlatformPageShell';
import { useMailingTemplateQuery } from '../queries/mailing.queries';
import { useSaveMailingTemplateMutation, useTestSendMailingMutation } from '../mutations/mailing.mutations';
import { useDebouncedPreview } from '../hooks/use-debounced-preview';
import { EMPTY_DRAFT, newBlock } from '../utils/block-defaults';
import { BlockList } from './BlockList';
import { BlockInspector, ChoiceSelect, Field, FormInput, fieldA11y } from './BlockInspector';
import { PreviewPane } from './PreviewPane';
import tableStyles from './MailingTable.module.scss';
import styles from './TemplateEditorPage.module.scss';

const LIST_HREF = '/dashboard/platform/mailing';
// Cast: tsconfig is not `strict`, so zod infers every key as optional.
const resolver = zodResolver(mailingTemplateDraftSchema) as unknown as Resolver<MailingTemplateDraft>;

const toDraft = (t: MailingTemplateDraft): MailingTemplateDraft => ({
  name: t.name, category: t.category, subject: t.subject, preheader: t.preheader, language: t.language, blocks: t.blocks,
});

// Keeps the same block selected when a move shifts its index.
function followMove(selected: number | null, from: number, to: number): number | null {
  if (selected === null) return null;
  if (selected === from) return to;
  if (from < selected && selected <= to) return selected - 1;
  if (to <= selected && selected < from) return selected + 1;
  return selected;
}

export function TemplateEditorPage({ templateId }: { templateId: string | null }) {
  const t = useTranslations('platformAdmin.mailing');
  const router = useRouter();
  const uid = useId();
  const { data: template, isLoading, isError: loadFailed } = useMailingTemplateQuery(templateId);
  const save = useSaveMailingTemplateMutation();
  const testSend = useTestSendMailingMutation();
  const form = useForm<MailingTemplateDraft>({ resolver, defaultValues: EMPTY_DRAFT, mode: 'onChange' });
  const blocks = useFieldArray({ control: form.control, name: 'blocks' });
  const [selected, setSelected] = useState<number | null>(null);
  const draft = form.watch();
  const { preview, invalid, isError: previewFailed } = useDebouncedPreview(draft);
  const { isDirty: dirty, errors } = form.formState;
  const tested = !!template && template.lastTestedVersion === template.version;
  const id = (key: string) => `${uid}-${key}`;

  // Load, and reload after a save or a test send, but never over unsaved edits.
  useEffect(() => {
    if (template && !form.formState.isDirty) form.reset(toDraft(template));
  }, [template, form]);

  // The preview asks to "fix the highlighted fields": once the admin has edited
  // something, surface every error, including blocks they have not opened.
  useEffect(() => {
    if (invalid && dirty) void form.trigger();
  }, [invalid, dirty, form]);

  // Dirty guard (R20): browser close/refresh + our own back link.
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  const onSave = form.handleSubmit(
    (values) => save.mutate({ id: templateId, draft: values }, {
      onSuccess: (saved) => {
        form.reset(toDraft(saved));
        if (!templateId) router.replace(`${LIST_HREF}/templates/${saved.id}`);
      },
    }),
    (errs) => {
      const firstBad = Array.isArray(errs.blocks) ? errs.blocks.findIndex(Boolean) : -1;
      if (firstBad >= 0) setSelected(firstBad);
    },
  );

  const confirmLeave = (e: MouseEvent) => {
    if (dirty && !window.confirm(t('editor.unsavedConfirm'))) e.preventDefault();
  };

  if (templateId && !template) {
    return (
      <PlatformPageShell group={t('page.group')} title={t('page.title')}>
        <p className={styles.state}>{t(loadFailed || !isLoading ? 'common.loadError' : 'common.loading')}</p>
      </PlatformPageShell>
    );
  }

  const blockErrors = (errors.blocks ?? []) as unknown as ArrayLike<unknown>;
  const liveBlocks = draft.blocks ?? [];
  const needsSave = dirty || !templateId;

  const actions = (
    <div className={styles.actions}>
      {template && (
        <>
          <span className={styles.version}>v{template.version}</span>
          <span className={tested ? tableStyles.tested : tableStyles.untested}>
            {t(tested ? 'editor.testedBadge' : 'editor.untestedBadge')}
          </span>
        </>
      )}
      {/* R16: the test renders the SAVED template, so unsaved edits block it. */}
      <Button
        type="button"
        variant="outline"
        className={styles.button}
        disabled={needsSave || testSend.isPending}
        aria-describedby={needsSave ? id('save-first') : undefined}
        onClick={() => templateId && testSend.mutate(templateId, {})}
      >
        {t(testSend.isPending ? 'editor.testSending' : 'editor.testSend')}
      </Button>
      <Button type="button" className={styles.button} onClick={onSave} disabled={save.isPending}>
        {t(save.isPending ? 'editor.saving' : 'editor.save')}
      </Button>
    </div>
  );

  return (
    <FormProvider {...form}>
      <PlatformPageShell group={t('page.group')} title={template?.name ?? t('editor.newTitle')} actions={actions}>
        <Link href={LIST_HREF} className={styles.back} onClick={confirmLeave}>
          <ArrowLeft aria-hidden="true" />
          {t('editor.back')}
        </Link>

        <div className={styles.messages}>
          {needsSave && <p id={id('save-first')} className={styles.note}>{t('editor.saveBeforeTest')}</p>}
          <div role="status" className={styles.status}>
            {!dirty && save.isSuccess && <p className={styles.ok}>{t('editor.saved')}</p>}
            {testSend.isSuccess && <p className={styles.ok}>{t('editor.testSent')}</p>}
          </div>
          {testSend.error && (
            <p role="alert" className={styles.fail}>{t(testSend.error.status === 429 ? 'editor.testThrottled' : 'editor.testError')}</p>
          )}
          {save.error && <p role="alert" className={styles.fail}>{t('editor.saveError')}</p>}
        </div>

        <div className={styles.layout}>
          <div className={styles.column}>
            <section className={styles.card}>
              <div className={styles.headerGrid}>
                <Field id={id('name')} label={t('editor.name')} error={errors.name?.message} className={styles.full}>
                  <FormInput id={id('name')} name="name" maxLength={L.nameMax} {...fieldA11y(id('name'), errors.name?.message)} />
                </Field>
                <Field id={id('category')} label={t('editor.category')}>
                  <Controller
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <ChoiceSelect
                        id={id('category')}
                        value={field.value}
                        onChange={field.onChange}
                        options={[
                          { value: 'MARKETING', label: t('category.MARKETING') },
                          { value: 'ANNOUNCEMENT', label: t('category.ANNOUNCEMENT') },
                        ]}
                      />
                    )}
                  />
                </Field>
                <Field id={id('language')} label={t('editor.language')}>
                  <Controller
                    control={form.control}
                    name="language"
                    render={({ field }) => (
                      <ChoiceSelect
                        id={id('language')}
                        value={field.value}
                        onChange={field.onChange}
                        options={[
                          { value: 'pt', label: t('editor.languagePt') },
                          { value: 'en', label: t('editor.languageEn') },
                          { value: 'es', label: t('editor.languageEs') },
                        ]}
                      />
                    )}
                  />
                </Field>
                <Field
                  id={id('subject')}
                  label={t('editor.subject')}
                  error={errors.subject?.message}
                  counter={`${(draft.subject ?? '').length}/${L.subjectMax}`}
                  className={styles.full}
                >
                  <FormInput id={id('subject')} name="subject" maxLength={L.subjectMax} {...fieldA11y(id('subject'), errors.subject?.message)} />
                </Field>
                <Field
                  id={id('preheader')}
                  label={t('editor.preheader')}
                  error={errors.preheader?.message}
                  counter={`${(draft.preheader ?? '').length}/${L.preheaderMax}`}
                  className={styles.full}
                >
                  <FormInput id={id('preheader')} name="preheader" maxLength={L.preheaderMax} {...fieldA11y(id('preheader'), errors.preheader?.message)} />
                </Field>
              </div>
              <p className={styles.hint}>{t('editor.variableHint', { variable: '{{nome}}' })}</p>
            </section>

            <section className={styles.card}>
              <DndProvider backend={HTML5Backend}>
                <BlockList
                  fields={blocks.fields}
                  values={liveBlocks}
                  invalid={liveBlocks.map((_, i) => !!blockErrors[i])}
                  selected={selected}
                  onSelect={setSelected}
                  onAdd={(type) => {
                    blocks.append(newBlock(type), { shouldFocus: false });
                    setSelected(blocks.fields.length);
                  }}
                  onMove={(from, to) => {
                    blocks.move(from, to);
                    setSelected((s) => followMove(s, from, to));
                  }}
                  onRemove={(i) => {
                    blocks.remove(i);
                    setSelected((s) => (s === null || s === i ? null : s > i ? s - 1 : s));
                  }}
                />
              </DndProvider>
            </section>

            {selected !== null && blocks.fields[selected] && (
              <BlockInspector key={blocks.fields[selected].id} index={selected} />
            )}
          </div>

          <div className={styles.previewColumn}>
            <PreviewPane html={preview?.html ?? null} subject={preview?.subject} invalid={invalid} failed={previewFailed} />
          </div>
        </div>
      </PlatformPageShell>
    </FormProvider>
  );
}
