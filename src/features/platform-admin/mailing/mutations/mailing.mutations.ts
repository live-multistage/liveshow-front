'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  CreateMailingCampaignRequest, DispatchMailingCampaignRequest, MailingAssetResponse, MailingCampaignDetail,
  MailingPreviewRequest, MailingPreviewResponse, MailingTemplate, MailingTemplateDraft,
} from '@live-show/api-contracts';
import { normalizeError, type AppError } from '@/lib/http/errors';
import { mailingService } from '../services/mailing.service';
import { mailingKeys } from '../queries/mailing.queries';

const wrap = <A, R>(fn: (a: A) => Promise<R>) => async (a: A) => {
  try {
    return await fn(a);
  } catch (err) {
    throw normalizeError(err);
  }
};

export function useSaveMailingTemplateMutation() {
  const qc = useQueryClient();
  return useMutation<MailingTemplate, AppError, { id: string | null; draft: MailingTemplateDraft }>({
    mutationFn: wrap(({ id, draft }) => (id ? mailingService.updateTemplate(id, draft) : mailingService.createTemplate(draft))),
    onSuccess: (t) => {
      qc.setQueryData(mailingKeys.template(t.id), t);
      qc.invalidateQueries({ queryKey: mailingKeys.templates() });
    },
  });
}

export function useDuplicateMailingTemplateMutation() {
  const qc = useQueryClient();
  return useMutation<MailingTemplate, AppError, string>({
    mutationFn: wrap(mailingService.duplicateTemplate),
    onSuccess: () => qc.invalidateQueries({ queryKey: mailingKeys.templates() }),
  });
}

export function useArchiveMailingTemplateMutation() {
  const qc = useQueryClient();
  return useMutation<MailingTemplate, AppError, string>({
    mutationFn: wrap(mailingService.archiveTemplate),
    onSuccess: () => qc.invalidateQueries({ queryKey: mailingKeys.templates() }),
  });
}

export function usePreviewMailingMutation() {
  return useMutation<MailingPreviewResponse, AppError, MailingPreviewRequest>({ mutationFn: wrap(mailingService.preview) });
}

export function useTestSendMailingMutation() {
  const qc = useQueryClient();
  return useMutation<{ ok: true; version: number }, AppError, string>({
    mutationFn: wrap(mailingService.testSend),
    onSuccess: (_r, id) => {
      qc.invalidateQueries({ queryKey: mailingKeys.template(id) });
      qc.invalidateQueries({ queryKey: mailingKeys.templates() });
    },
  });
}

export function useUploadMailingAssetMutation() {
  return useMutation<MailingAssetResponse, AppError, File>({ mutationFn: wrap(mailingService.uploadAsset) });
}

export function useCreateMailingCampaignMutation() {
  const qc = useQueryClient();
  return useMutation<MailingCampaignDetail, AppError, CreateMailingCampaignRequest>({
    mutationFn: wrap(mailingService.createCampaign),
    onSuccess: () => qc.invalidateQueries({ queryKey: mailingKeys.campaigns() }),
  });
}

export function useDispatchMailingCampaignMutation() {
  const qc = useQueryClient();
  return useMutation<MailingCampaignDetail, AppError, { id: string } & DispatchMailingCampaignRequest>({
    mutationFn: wrap(({ id, ...req }) => mailingService.dispatchCampaign(id, req)),
    onSuccess: (c) => {
      qc.setQueryData(mailingKeys.campaign(c.id), c);
      qc.invalidateQueries({ queryKey: mailingKeys.campaigns() });
    },
  });
}

export function useCancelMailingCampaignMutation() {
  const qc = useQueryClient();
  return useMutation<MailingCampaignDetail, AppError, string>({
    mutationFn: wrap(mailingService.cancelCampaign),
    onSuccess: (c) => {
      qc.setQueryData(mailingKeys.campaign(c.id), c);
      qc.invalidateQueries({ queryKey: mailingKeys.campaigns() });
    },
  });
}
