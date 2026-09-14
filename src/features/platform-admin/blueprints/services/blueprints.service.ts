import { httpClient } from '@/lib/http/client';
import type {
  ActivateBlueprintRequest, BlueprintCatalogEntry, BlueprintDetail, BlueprintRunStatus, BlueprintRunsPage, BlueprintSecretSummary, BlueprintSummary,
  BlueprintVersionDto, CreateBlueprintRequest, SaveBlueprintVersionRequest, SetBlueprintSecretRequest,
} from '@live-show/api-contracts';

export interface BlueprintRunsParams { status?: BlueprintRunStatus; cursor?: string }

export const blueprintsService = {
  catalog: async () => (await httpClient.get<BlueprintCatalogEntry[]>('/blueprints/catalog')).data,
  list: async () =>(await httpClient.get<BlueprintSummary[]>('/blueprints')).data,
  get: async (id: string) => (await httpClient.get<BlueprintDetail>(`/blueprints/${id}`)).data,
  create: async (req: CreateBlueprintRequest) => (await httpClient.post<BlueprintSummary>('/blueprints', req)).data,
  saveVersion: async (id: string, req: SaveBlueprintVersionRequest) => (await httpClient.post<BlueprintVersionDto>(`/blueprints/${id}/versions`, req)).data,
  publish: async (id: string, versionId: string) => (await httpClient.post<BlueprintVersionDto>(`/blueprints/${id}/versions/${versionId}/publish`)).data,
  activate: async (id: string, req: ActivateBlueprintRequest) => { await httpClient.post(`/blueprints/${id}/activate`, req); },
  deactivate: async (id: string) => (await httpClient.post<{ cancelledRuns: number }>(`/blueprints/${id}/deactivate`)).data,
  runs: async (id: string, params: BlueprintRunsParams = {}) =>
    (await httpClient.get<BlueprintRunsPage>(`/blueprints/${id}/runs`, { params })).data,
  // Backend cursor is the last child's numeric itemIndex as a string; pages of 25.
  runChildren: async (id: string, runId: string, cursor?: string) =>
    (await httpClient.get<BlueprintRunsPage>(`/blueprints/${id}/runs/${runId}/children`, { params: { cursor } })).data,
  listSecrets: async () => (await httpClient.get<BlueprintSecretSummary[]>('/blueprints/secrets')).data,
  setSecret: async (name: string, value: string) => {
    await httpClient.put(`/blueprints/secrets/${name}`, { value } satisfies SetBlueprintSecretRequest);
  },
  deleteSecret: async (name: string) => { await httpClient.delete(`/blueprints/secrets/${name}`); },
};
