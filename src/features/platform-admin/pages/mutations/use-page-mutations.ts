'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CreatePageRequest, PageDetail, PageVersionSummary, PublishPageRequest, UpdatePageSettingsRequest } from '@live-show/api-contracts';
import { normalizeError, type AppError } from '@/lib/http/errors';
import { pagesService } from '../services/pages.service';
import { pageKeys } from '../queries/page.keys';

// Save-draft lives in F4: it needs the raw 409 DRAFT_CONFLICT, which normalizeError would flatten.
const LISTS_KEY = [...pageKeys.all, 'list'] as const;

async function run<T>(call: () => Promise<T>): Promise<T> {
  try {
    return await call();
  } catch (err) {
    throw normalizeError(err);
  }
}

export function useCreatePageMutation() {
  const qc = useQueryClient();
  return useMutation<PageDetail, AppError, CreatePageRequest>({
    mutationFn: (body) => run(() => pagesService.create(body)),
    onSuccess: () => qc.invalidateQueries({ queryKey: LISTS_KEY }),
  });
}

export function useUpdatePageSettingsMutation(id: string) {
  const qc = useQueryClient();
  return useMutation<PageDetail, AppError, UpdatePageSettingsRequest>({
    mutationFn: (body) => run(() => pagesService.updateSettings(id, body)),
    onSuccess: (saved) => {
      qc.setQueryData(pageKeys.detail(id), saved);
      qc.invalidateQueries({ queryKey: LISTS_KEY });
    },
  });
}

export function usePublishPageMutation(id: string) {
  const qc = useQueryClient();
  return useMutation<PageVersionSummary, AppError, PublishPageRequest>({
    mutationFn: (body) => run(() => pagesService.publish(id, body)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pageKeys.detail(id) });
      qc.invalidateQueries({ queryKey: pageKeys.versions(id) });
      qc.invalidateQueries({ queryKey: pageKeys.diff(id) });
      qc.invalidateQueries({ queryKey: LISTS_KEY });
    },
  });
}

export function useRestoreVersionMutation(id: string) {
  const qc = useQueryClient();
  return useMutation<PageDetail, AppError, number>({
    mutationFn: (versionNumber) => run(() => pagesService.restoreVersion(id, versionNumber)),
    onSuccess: (saved) => {
      qc.setQueryData(pageKeys.detail(id), saved);
      qc.invalidateQueries({ queryKey: pageKeys.diff(id) });
    },
  });
}

function useLifecycleMutation(id: string, action: (id: string) => Promise<PageDetail>) {
  const qc = useQueryClient();
  return useMutation<PageDetail, AppError, void>({
    mutationFn: () => run(() => action(id)),
    onSuccess: (saved) => {
      qc.setQueryData(pageKeys.detail(id), saved);
      qc.invalidateQueries({ queryKey: LISTS_KEY });
    },
  });
}

export function useUnpublishPageMutation(id: string) {
  return useLifecycleMutation(id, pagesService.unpublish);
}

export function useArchivePageMutation(id: string) {
  return useLifecycleMutation(id, pagesService.archive);
}

export function useUnarchivePageMutation(id: string) {
  return useLifecycleMutation(id, pagesService.unarchive);
}
