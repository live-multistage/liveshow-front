import { httpClient } from '@/lib/http/client';
import type {
  ActivateBlueprintRequest, BlueprintDetail, BlueprintRunStatus, BlueprintRunsPage, BlueprintSummary, BlueprintVersionDto,
  CreateBlueprintRequest, SaveBlueprintVersionRequest,
} from '@live-show/api-contracts';

export interface BlueprintRunsParams { status?: BlueprintRunStatus; cursor?: string }

export const blueprintsService = {
  list: async () => (await httpClient.get<BlueprintSummary[]>('/blueprints')).data,
  get: async (id: string) => (await httpClient.get<BlueprintDetail>(`/blueprints/${id}`)).data,
  create: async (req: CreateBlueprintRequest) => (await httpClient.post<BlueprintSummary>('/blueprints', req)).data,
  saveVersion: async (id: string, req: SaveBlueprintVersionRequest) => (await httpClient.post<BlueprintVersionDto>(`/blueprints/${id}/versions`, req)).data,
  publish: async (id: string, versionId: string) => (await httpClient.post<BlueprintVersionDto>(`/blueprints/${id}/versions/${versionId}/publish`)).data,
  activate: async (id: string, req: ActivateBlueprintRequest) => { await httpClient.post(`/blueprints/${id}/activate`, req); },
  deactivate: async (id: string) => (await httpClient.post<{ cancelledRuns: number }>(`/blueprints/${id}/deactivate`)).data,
  runs: async (id: string, params: BlueprintRunsParams = {}) =>
    (await httpClient.get<BlueprintRunsPage>(`/blueprints/${id}/runs`, { params })).data,
};
