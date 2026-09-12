'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ArrowLeft } from 'lucide-react';
import { Button, Input } from '@live-show/design-system';
import {
  MAILING_LIMITS, mailingAudienceSchema, type MailingAudience, type MailingTemplateDraft,
} from '@live-show/api-contracts';
import { DateTimePicker } from '@/shared/components/DateTimePicker/DateTimePicker';
import { PlatformPageShell } from '../../components/PlatformPageShell';
import { useAudienceCountQuery, useMailingTemplateQuery, useMailingTemplatesQuery } from '../queries/mailing.queries';
import { useCreateMailingCampaignMutation, useDispatchMailingCampaignMutation } from '../mutations/mailing.mutations';
import { useDebouncedPreview } from '../hooks/use-debounced-preview';
import { AudienceFields } from './AudienceFields';
import { Field } from './BlockInspector';
import { DispatchConfirmDialog } from './DispatchConfirmDialog';
import { PreviewPane } from './PreviewPane';
import tableStyles from './MailingTable.module.scss';
import editorStyles from './TemplateEditorPage.module.scss';
import styles from './CampaignWizard.module.scss';

type Step = 1 | 2 | 3;
type Problem = 'notTested' | 'failed' | null;

const LIST_HREF = '/dashboard/platform/mailing?tab=campaigns';
const STEP_KEYS = ['wizard.stepTemplate', 'wizard.stepAudience', 'wizard.stepReview'] as const;
// An empty subject fails the preview schema, so nothing is requested until the template loads.
const NO_TEMPLATE: MailingTemplateDraft = { name: '', category: 'MARKETING', subject: '', preheader: '', language: 'pt', blocks: [] };

/** DateTimePicker's naive 'YYYY-MM-DDTHH:mm', read as São Paulo wall-clock time, as an ISO instant. */
// ponytail: fixed UTC−3 (Brazil dropped DST in 2019); switch to Temporal or a tz lib if DST ever returns.
export const saoPauloToIso = (local: string) => new Date(`${local}:00-03:00`).toISOString();

export function CampaignWizard({ initialTemplateId }: { initialTemplateId?: string }) {
  const t = useTranslations('platformAdmin.mailing');
  const router = useRouter();
  const uid = useId();
  const id = (key: string) => `${uid}-${key}`;
  const [step, setStep] = useState<Step>(1);
  const [name, setName] = useState('');
  const [templateId, setTemplateId] = useState(initialTemplateId ?? '');
  const [audience, setAudience] = useState<MailingAudience>({ type: 'ALL_VERIFIED' });
  const [scheduling, setScheduling] = useState(false);
  const [scheduleLocal, setScheduleLocal] = useState('');
  const [scheduledAt, setScheduledAt] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [problem, setProblem] = useState<Problem>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const focusHeading = useRef(false);
  const inFlight = useRef(false);
  const createdDraft = useRef<{ id: string; key: string } | null>(null);

  const templates = useMailingTemplatesQuery();
  const summary = templates.data?.find((x) => x.id === templateId);
  const { data: template } = useMailingTemplateQuery(templateId || null);
  const audienceOk = mailingAudienceSchema.safeParse(audience).success;
  const count = useAudienceCountQuery(summary && audienceOk ? { audience, category: summary.category } : null);
  const { preview } = useDebouncedPreview(template ?? NO_TEMPLATE);
  const create = useCreateMailingCampaignMutation();
  const dispatch = useDispatchMailingCampaignMutation();

  // Move focus to the new step's heading so keyboard and screen-reader users land on it.
  useEffect(() => {
    if (!focusHeading.current) return;
    focusHeading.current = false;
    headingRef.current?.focus();
  }, [step]);

  const go = (next: Step) => {
    focusHeading.current = true;
    setStep(next);
  };

  const fail = (reason: Exclude<Problem, null>) => {
    inFlight.current = false;
    setConfirming(false);
    setProblem(reason);
  };

  const dispatchDraft = (campaignId: string) =>
    dispatch.mutate({ id: campaignId, ...(scheduledAt ? { scheduledAt } : {}) }, {
      onSuccess: () => router.push(`/dashboard/platform/mailing/campaigns/${campaignId}`),
      onError: (err) => fail(err.status === 409 && err.code === 'TEMPLATE_NOT_TESTED' ? 'notTested' : 'failed'),
    });

  const send = () => {
    // A second click before isPending re-renders must not create a second campaign.
    if (inFlight.current) return;
    inFlight.current = true;
    setProblem(null);
    // Retrying after a failed dispatch reuses the DRAFT already created (R20) instead of adding another.
    const key = JSON.stringify({ name, templateId, audience });
    if (createdDraft.current?.key === key) return dispatchDraft(createdDraft.current.id);
    create.mutate({ name, templateId, audience }, {
      onSuccess: (campaign) => {
        createdDraft.current = { id: campaign.id, key };
        dispatchDraft(campaign.id);
      },
      onError: () => fail('failed'),
    });
  };

  const confirmSchedule = () => {
    const iso = saoPauloToIso(scheduleLocal);
    // R17: a past time means now, so the dialog says "now" rather than a past date.
    setScheduledAt(new Date(iso) > new Date() ? iso : null);
    setConfirming(true);
  };

  const canNext = step === 1 ? !!name.trim() && !!summary : audienceOk && !!count.data;
  const heading = (key: (typeof STEP_KEYS)[number]) => (
    <h2 ref={headingRef} tabIndex={-1} className={styles.heading}>{t(key)}</h2>
  );

  return (
    <PlatformPageShell group={t('page.group')} title={t('wizard.title')}>
      <Link href={LIST_HREF} className={editorStyles.back}>
        <ArrowLeft aria-hidden="true" />
        {t('detail.back')}
      </Link>

      <ol className={styles.steps}>
        {STEP_KEYS.map((key, i) => (
          <li key={key} className={styles.step} aria-current={step === i + 1 ? 'step' : undefined}>{t(key)}</li>
        ))}
      </ol>

      <div className={styles.wizard}>
        {step === 1 && (
          <section className={editorStyles.card}>
            {heading('wizard.stepTemplate')}
            <Field id={id('name')} label={t('wizard.name')}>
              <Input id={id('name')} value={name} maxLength={MAILING_LIMITS.nameMax} onChange={(e) => setName(e.target.value)} />
            </Field>
            <fieldset className={styles.templates}>
              <legend className={styles.legend}>{t('wizard.template')}</legend>
              {templates.isLoading ? <p className={styles.muted}>{t('common.loading')}</p>
                : templates.isError ? <p role="alert" className={styles.fail}>{t('common.loadError')}</p>
                  : templates.data?.map((tpl) => {
                    const untested = tpl.lastTestedVersion !== tpl.version;
                    return (
                      <label key={tpl.id} className={styles.option}>
                        <input
                          type="radio"
                          name={id('template')}
                          value={tpl.id}
                          checked={templateId === tpl.id}
                          onChange={() => setTemplateId(tpl.id)}
                          aria-label={`${tpl.name}${untested ? ` · ${t('wizard.untestedFlag')}` : ''}`}
                        />
                        <span className={styles.optionName}>{tpl.name}</span>
                        <span className={styles.optionMeta}>{t(`category.${tpl.category}`)} · v{tpl.version}</span>
                        {untested && <span className={tableStyles.untested} aria-hidden="true">{t('wizard.untestedFlag')}</span>}
                      </label>
                    );
                  })}
            </fieldset>
          </section>
        )}

        {step === 2 && summary && (
          <section className={editorStyles.card}>
            {heading('wizard.stepAudience')}
            <AudienceFields value={audience} onChange={setAudience} category={summary.category} count={count} />
          </section>
        )}

        {step === 3 && (
          <div className={styles.review}>
            <section className={editorStyles.card}>
              {heading('wizard.stepReview')}
              <dl className={styles.facts}>
                <div><dt>{t('wizard.name')}</dt><dd>{name}</dd></div>
                <div><dt>{t('wizard.template')}</dt><dd>{summary?.name}</dd></div>
                <div><dt>{t('wizard.subject')}</dt><dd>{template?.subject ?? t('common.loading')}</dd></div>
                <div>
                  <dt>{t('audience.typeLabel')}</dt>
                  <dd>{t(`audience.type.${audience.type}`)}{audience.country ? ` · ${audience.country}` : ''}</dd>
                </div>
              </dl>

              {problem === 'notTested' && (
                <div className={`${editorStyles.note} ${styles.notice}`}>
                  <p role="alert">{t('wizard.notTested')}</p>
                  <Link className={styles.link} href={`/dashboard/platform/mailing/templates/${templateId}`}>{t('wizard.openEditor')}</Link>
                </div>
              )}
              {problem === 'failed' && <p role="alert" className={styles.fail}>{t('wizard.error')}</p>}

              <div className={styles.sendActions}>
                <Button
                  type="button"
                  className={editorStyles.button}
                  disabled={!count.data}
                  onClick={() => { setScheduledAt(null); setConfirming(true); }}
                >
                  {t('wizard.sendNow')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className={editorStyles.button}
                  aria-expanded={scheduling}
                  aria-controls={scheduling ? id('schedule') : undefined}
                  onClick={() => setScheduling((open) => !open)}
                >
                  {t('wizard.schedule')}
                </Button>
              </div>

              {scheduling && (
                <div id={id('schedule')} className={styles.schedule}>
                  <DateTimePicker id={id('when')} label={t('wizard.scheduleAt')} value={scheduleLocal} onChange={setScheduleLocal} />
                  <Button type="button" className={editorStyles.button} disabled={!scheduleLocal || !count.data} onClick={confirmSchedule}>
                    {t('common.confirm')}
                  </Button>
                </div>
              )}
            </section>
            <PreviewPane html={preview?.html ?? null} subject={preview?.subject} invalid={false} failed={false} />
          </div>
        )}

        <div className={styles.nav}>
          {step > 1 && (
            <Button type="button" variant="outline" className={editorStyles.button} onClick={() => go((step - 1) as Step)}>
              {t('wizard.back')}
            </Button>
          )}
          {step < 3 && (
            <Button type="button" className={editorStyles.button} disabled={!canNext} onClick={() => go((step + 1) as Step)}>
              {t('wizard.next')}
            </Button>
          )}
        </div>
      </div>

      <DispatchConfirmDialog
        open={confirming}
        count={count.data?.eligible ?? 0}
        scheduledAt={scheduledAt}
        pending={create.isPending || dispatch.isPending}
        onConfirm={send}
        onOpenChange={setConfirming}
      />
    </PlatformPageShell>
  );
}
