import { httpClient } from '@/lib/http/client';
import type {
  AudienceCountRequest, AudienceCountResponse, CreateMailingCampaignRequest, DispatchMailingCampaignRequest,
  MailingAssetResponse, MailingCampaignDetail, MailingCampaignSummary, MailingPreviewRequest, MailingPreviewResponse,
  MailingTemplate, MailingTemplateDraft, MailingTemplateSummary, UpdateMailingCampaignRequest,
} from '@live-show/api-contracts';

export const mailingService = {
  listTemplates: async () => (await httpClient.get<MailingTemplateSummary[]>('/mailing/templates')).data,
  getTemplate: async (id: string) => (await httpClient.get<MailingTemplate>(`/mailing/templates/${id}`)).data,
  createTemplate: async (draft: MailingTemplateDraft) => (await httpClient.post<MailingTemplate>('/mailing/templates', draft)).data,
  updateTemplate: async (id: string, draft: MailingTemplateDraft) => (await httpClient.patch<MailingTemplate>(`/mailing/templates/${id}`, draft)).data,
  duplicateTemplate: async (id: string) => (await httpClient.post<MailingTemplate>(`/mailing/templates/${id}/duplicate`)).data,
  archiveTemplate: async (id: string) => (await httpClient.post<MailingTemplate>(`/mailing/templates/${id}/archive`)).data,
  preview: async (req: MailingPreviewRequest) => (await httpClient.post<MailingPreviewResponse>('/mailing/preview', req)).data,
  testSend: async (id: string) => (await httpClient.post<{ ok: true; version: number }>(`/mailing/templates/${id}/test-send`)).data,
  uploadAsset: async (file: File) => {
    const form = new FormData();
    form.append('file', file);
    const { data } = await httpClient.post<MailingAssetResponse>('/mailing/assets', form, { headers: { 'Content-Type': 'multipart/form-data' } });
    return data;
  },
  countAudience: async (req: AudienceCountRequest) => (await httpClient.post<AudienceCountResponse>('/mailing/audiences/count', req)).data,
  listCampaigns: async () => (await httpClient.get<MailingCampaignSummary[]>('/mailing/campaigns')).data,
  getCampaign: async (id: string) => (await httpClient.get<MailingCampaignDetail>(`/mailing/campaigns/${id}`)).data,
  createCampaign: async (req: CreateMailingCampaignRequest) => (await httpClient.post<MailingCampaignDetail>('/mailing/campaigns', req)).data,
  updateCampaign: async (id: string, req: UpdateMailingCampaignRequest) => (await httpClient.patch<MailingCampaignDetail>(`/mailing/campaigns/${id}`, req)).data,
  dispatchCampaign: async (id: string, req: DispatchMailingCampaignRequest) => (await httpClient.post<MailingCampaignDetail>(`/mailing/campaigns/${id}/dispatch`, req)).data,
  cancelCampaign: async (id: string) => (await httpClient.post<MailingCampaignDetail>(`/mailing/campaigns/${id}/cancel`)).data,
};
