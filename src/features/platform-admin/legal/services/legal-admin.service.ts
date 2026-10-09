import { httpClient } from '@/lib/http/client';
import type {
  LegalDocumentKind,
  LegalDocumentVersion,
  LegalDocumentVersionSummary,
  PublishLegalVersionRequest,
} from '@live-show/api-contracts';

export const legalAdminService = {
  current: async (kind: LegalDocumentKind): Promise<LegalDocumentVersion> =>
    (await httpClient.get<LegalDocumentVersion>(`/legal/${kind}`)).data,

  versions: async (kind: LegalDocumentKind): Promise<LegalDocumentVersionSummary[]> =>
    (await httpClient.get<LegalDocumentVersionSummary[]>(`/legal/${kind}/versions`)).data,

  version: async (kind: LegalDocumentKind, n: number): Promise<LegalDocumentVersion> =>
    (await httpClient.get<LegalDocumentVersion>(`/legal/${kind}/versions/${n}`)).data,

  publish: async (kind: LegalDocumentKind, body: PublishLegalVersionRequest): Promise<LegalDocumentVersion> =>
    (
      await httpClient.post<LegalDocumentVersion>(`/platform/legal/${kind}/versions`, {
        content: body.content,
        changeSummary: body.changeSummary,
      })
    ).data,
};
