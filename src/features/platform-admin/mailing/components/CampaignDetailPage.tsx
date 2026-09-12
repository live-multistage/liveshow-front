'use client';

import { useId, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowLeft } from 'lucide-react';
import {
  Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@live-show/design-system';
import type { MailingCampaignStatus } from '@live-show/api-contracts';
import { PlatformPageShell } from '../../components/PlatformPageShell';
import { useAudienceCountQuery, useMailingCampaignQuery } from '../queries/mailing.queries';
import { useCancelMailingCampaignMutation, useDispatchMailingCampaignMutation } from '../mutations/mailing.mutations';
import { DispatchConfirmDialog } from './DispatchConfirmDialog';
import tableStyles from '../../components/PlatformTable.module.scss';
import mailingStyles from './MailingTable.module.scss';
import editorStyles from './TemplateEditorPage.module.scss';
import styles from './CampaignDetailPage.module.scss';

const LIST_HREF = '/dashboard/platform/mailing?tab=campaigns';
const SP_FORMAT = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' });
const NUMBER = new Intl.NumberFormat('pt-BR');
const IN_FLIGHT: MailingCampaignStatus[] = ['SCHEDULED', 'SENDING'];
const CANCELLABLE: MailingCampaignStatus[] = ['DRAFT', 'SCHEDULED', 'SENDING'];

export function CampaignDetailPage({ campaignId }: { campaignId: string }) {
  const t = useTranslations('platformAdmin.mailing');
  const tCommon = useTranslations('common');
  const uid = useId();
  const { data: campaign, isLoading } = useMailingCampaignQuery(campaignId);
  const isDraft = campaign?.status === 'DRAFT';
  const count = useAudienceCountQuery(campaign && isDraft ? { audience: campaign.audience, category: campaign.category } : null);
  const cancel = useCancelMailingCampaignMutation();
  const dispatch = useDispatchMailingCampaignMutation();
  const [cancelling, setCancelling] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const back = (
    <Link href={LIST_HREF} className={editorStyles.back}>
      <ArrowLeft aria-hidden="true" />
      {t('detail.back')}
    </Link>
  );

  if (!campaign) {
    return (
      <PlatformPageShell group={t('page.group')} title={t('page.title')}>
        {back}
        <p className={editorStyles.state}>{t(isLoading ? 'common.loading' : 'common.loadError')}</p>
      </PlatformPageShell>
    );
  }

  const { status, breakdown: b, audience } = campaign;
  const total = campaign.totalRecipients;
  // Counters can overshoot the total after rare DB-error retries: clamp, and never
  // derive the ETA from a negative remainder.
  const sent = total === null ? 0 : Math.min(Math.max(campaign.sentCount, 0), total);
  const remaining = total === null ? 0 : Math.max(0, total - campaign.sentCount - campaign.skippedCount - campaign.failedCount);
  const notTested = dispatch.error?.status === 409 && dispatch.error.code === 'TEMPLATE_NOT_TESTED';
  const counters = [
    ['sent', b.sent], ['pending', b.pending + b.sending], ['failed', b.failed],
    ['skippedOptedOut', b.skippedOptedOut], ['skippedUnverified', b.skippedUnverified],
    ['skippedDeleted', b.skippedDeleted], ['skippedCancelled', b.skippedCancelled],
  ] as const;

  const dispatchNow = () => dispatch.mutate({ id: campaignId }, { onSettled: () => setConfirming(false) });

  const actions = (
    <div className={styles.headerActions}>
      <span className={`${tableStyles.badge} ${mailingStyles[`status${status}`]}`}>{t(`campaigns.status.${status}`)}</span>
      {isDraft && (
        <Button type="button" className={editorStyles.button} disabled={!count.data || dispatch.isPending} onClick={() => setConfirming(true)}>
          {t('detail.dispatch')}
        </Button>
      )}
      {CANCELLABLE.includes(status) && (
        <Button type="button" variant="outline" className={editorStyles.button} onClick={() => setCancelling(true)}>
          {t('detail.cancel')}
        </Button>
      )}
    </div>
  );

  return (
    <PlatformPageShell group={t('page.group')} title={campaign.name} actions={actions}>
      {back}

      <div className={styles.body}>
        {notTested && (
          <div className={`${editorStyles.note} ${styles.notice}`}>
            <p role="alert">{t('wizard.notTested')}</p>
            <Link className={styles.link} href={`/dashboard/platform/mailing/templates/${campaign.templateId}`}>{t('wizard.openEditor')}</Link>
          </div>
        )}
        {dispatch.error && !notTested && <p role="alert" className={editorStyles.fail}>{tCommon('error')}</p>}

        <section className={editorStyles.card}>
          <dl className={styles.meta}>
            <div><dt>{t('campaigns.colTemplate')}</dt><dd>{campaign.templateName}</dd></div>
            <div><dt>{t('wizard.subject')}</dt><dd>{campaign.subject}</dd></div>
            <div>
              <dt>{t('campaigns.colAudience')}</dt>
              <dd>{t(`audience.type.${audience.type}`)}{audience.country ? ` · ${audience.country}` : ''}</dd>
            </div>
          </dl>
          {status === 'SCHEDULED' && campaign.scheduledAt && (
            <p className={styles.muted}>{t('detail.scheduledFor', { date: SP_FORMAT.format(new Date(campaign.scheduledAt)) })}</p>
          )}
        </section>

        {!isDraft && (
          <section className={editorStyles.card}>
            {total === null
              ? status === 'SENDING' && <p role="status" className={styles.muted}>{t('detail.materializing')}</p>
              : (
                <div className={styles.progress}>
                  <progress value={sent} max={total || 1} aria-labelledby={`${uid}-progress`} />
                  <span id={`${uid}-progress`}>{t('detail.progress', { sent, total })}</span>
                </div>
              )}
            {IN_FLIGHT.includes(status) && remaining > 0 && (
              <p className={styles.muted}>{t('detail.eta', { days: Math.ceil(remaining / campaign.dailyCap) })}</p>
            )}
            <dl className={styles.counters}>
              {counters.map(([key, value]) => (
                <div key={key}>
                  <dt>{t(`detail.${key}`)}</dt>
                  <dd>{NUMBER.format(value)}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}
      </div>

      <Dialog open={cancelling} onOpenChange={setCancelling}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('detail.cancelTitle')}</DialogTitle>
            <DialogDescription>{t('detail.cancelBody')}</DialogDescription>
          </DialogHeader>
          {cancel.isError && <p role="alert" className={editorStyles.fail}>{tCommon('error')}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" className={editorStyles.button} onClick={() => setCancelling(false)}>
              {t('detail.dismiss')}
            </Button>
            <Button
              type="button"
              variant="destructive"
              className={editorStyles.button}
              disabled={cancel.isPending}
              onClick={() => cancel.mutate(campaignId, { onSuccess: () => setCancelling(false) })}
            >
              {t('detail.cancelConfirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DispatchConfirmDialog
        open={confirming}
        count={count.data?.eligible ?? 0}
        scheduledAt={null}
        pending={dispatch.isPending}
        onConfirm={dispatchNow}
        onOpenChange={setConfirming}
      />
    </PlatformPageShell>
  );
}
