import type { AxiosError } from 'axios';
import { httpClient } from '@/lib/http/client';
import type {
  CreatePageRequest,
  DraftConflict,
  FeaturedUnavailable,
  PageAssetResponse,
  PageDetail,
  PageElement,
  PageResolvedData,
  PageStatus,
  PageSummary,
  PageVersionDocument,
  PageVersionSummary,
  PublicPage,
  PublishDiffResponse,
  PublishPageRequest,
  SaveDraftRequest,
  UpdatePageSettingsRequest,
} from '@live-show/api-contracts';

export interface ListPagesParams {
  status?: PageStatus;
  q?: string;
}

export const pagesService = {
  list: async (params?: ListPagesParams) =>
    (await httpClient.get<PageSummary[]>('/platform/pages', { params })).data,
  get: async (id: string) => (await httpClient.get<PageDetail>(`/platform/pages/${id}`)).data,
  create: async (body: CreatePageRequest) => (await httpClient.post<PageDetail>('/platform/pages', body)).data,
  saveDraft: async (id: string, body: SaveDraftRequest) =>
    (await httpClient.put<{ draftRevision: number; draftUpdatedAt: string }>(`/platform/pages/${id}/draft`, body)).data,
  updateSettings: async (id: string, body: UpdatePageSettingsRequest) =>
    (await httpClient.patch<PageDetail>(`/platform/pages/${id}`, body)).data,
  publish: async (id: string, body: PublishPageRequest) =>
    (await httpClient.post<PageVersionSummary>(`/platform/pages/${id}/versions`, body)).data,
  publishDiff: async (id: string) => (await httpClient.get<PublishDiffResponse>(`/platform/pages/${id}/publish-diff`)).data,
  listVersions: async (id: string) =>
    (await httpClient.get<PageVersionSummary[]>(`/platform/pages/${id}/versions`)).data,
  getVersion: async (id: string, versionNumber: number) =>
    (await httpClient.get<PageVersionDocument>(`/platform/pages/${id}/versions/${versionNumber}`)).data,
  restoreVersion: async (id: string, versionNumber: number) =>
    (await httpClient.post<PageDetail>(`/platform/pages/${id}/versions/${versionNumber}/restore`)).data,
  unpublish: async (id: string) => (await httpClient.post<PageDetail>(`/platform/pages/${id}/unpublish`)).data,
  archive: async (id: string) => (await httpClient.post<PageDetail>(`/platform/pages/${id}/archive`)).data,
  unarchive: async (id: string) => (await httpClient.post<PageDetail>(`/platform/pages/${id}/unarchive`)).data,
  /** Real event data for data elements the editor holds but has not saved (max `PAGE_RESOLVE_DATA_MAX` per call). */
  resolveData: async (elements: PageElement[]) =>
    (await httpClient.post<PageResolvedData>('/platform/pages/resolve-data', { elements })).data,
  preview: async (id: string) => (await httpClient.get<PublicPage>(`/platform/pages/${id}/preview`)).data,
  uploadAsset: async (file: File) => {
    const form = new FormData();
    form.append('file', file);
    const { data } = await httpClient.post<PageAssetResponse>('/platform/pages/assets', form, { headers: { 'Content-Type': 'multipart/form-data' } });
    return data;
  },
};

export function isDraftConflict(error: unknown): error is AxiosError<DraftConflict> {
  const axiosError = error as AxiosError<DraftConflict> | null;
  return axiosError?.response?.status === 409 && axiosError.response.data?.code === 'DRAFT_CONFLICT';
}

/** 400 FEATURED_UNAVAILABLE: the publish found a featured event that is gone or not public; `elementId` is the element. */
export function isFeaturedUnavailable(error: unknown): error is AxiosError<FeaturedUnavailable> {
  const axiosError = error as AxiosError<FeaturedUnavailable> | null;
  return axiosError?.response?.status === 400 && axiosError.response.data?.code === 'FEATURED_UNAVAILABLE';
}
