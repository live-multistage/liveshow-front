'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { LegalDocumentKind, LegalDocumentVersion, PublishLegalVersionRequest } from '@live-show/api-contracts';
import { normalizeError, type AppError } from '@/lib/http/errors';
import { legalAdminService } from '../services/legal-admin.service';

const legalKey = (kind: LegalDocumentKind, part: 'current' | 'versions') =>
  ['platform-admin', 'legal', kind, part] as const;

export function useLegalCurrentQuery(kind: LegalDocumentKind) {
  return useQuery({ queryKey: legalKey(kind, 'current'), queryFn: () => legalAdminService.current(kind), staleTime: 60_000 });
}

export function useLegalVersionsQuery(kind: LegalDocumentKind) {
  return useQuery({ queryKey: legalKey(kind, 'versions'), queryFn: () => legalAdminService.versions(kind), staleTime: 60_000 });
}

export function usePublishLegalVersionMutation(kind: LegalDocumentKind) {
  const qc = useQueryClient();
  return useMutation<LegalDocumentVersion, AppError, PublishLegalVersionRequest>({
    mutationFn: async (body) => {
      try {
        return await legalAdminService.publish(kind, body);
      } catch (err) {
        throw normalizeError(err);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: legalKey(kind, 'current') });
      qc.invalidateQueries({ queryKey: legalKey(kind, 'versions') });
      qc.invalidateQueries({ queryKey: ['platform-admin', 'settings-audit'] });
    },
  });
}
