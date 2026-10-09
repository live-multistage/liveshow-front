'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SeoFields, SeoGlobal, SeoPageKey, SeoPageTemplate, SeoPathOverride } from '@live-show/api-contracts';
import { normalizeError, type AppError } from '@/lib/http/errors';
import { seoAdminService, type OgImageUploadResult, type SeoOverrideInput } from '../services/seo-admin.service';

const TEMPLATES_KEY = ['platform-admin', 'seo', 'templates'] as const;
const OVERRIDES_KEY = ['platform-admin', 'seo', 'overrides'] as const;
const GLOBAL_KEY = ['platform-admin', 'seo', 'global'] as const;
const AUDIT_KEY = ['platform-admin', 'settings-audit'] as const;

async function run<T>(call: () => Promise<T>): Promise<T> {
  try {
    return await call();
  } catch (err) {
    throw normalizeError(err);
  }
}

export function useSeoTemplatesQuery() {
  return useQuery({ queryKey: TEMPLATES_KEY, queryFn: seoAdminService.listTemplates, staleTime: 60_000 });
}

export function useSetSeoTemplateMutation() {
  const qc = useQueryClient();
  return useMutation<SeoPageTemplate, AppError, { pageKey: SeoPageKey; fields: SeoFields }>({
    mutationFn: ({ pageKey, fields }) => run(() => seoAdminService.setTemplate(pageKey, fields)),
    onSuccess: (saved) => {
      // Write the returned row first: a reopened editor must never seed from the pre-save cache.
      qc.setQueryData<SeoPageTemplate[]>(TEMPLATES_KEY, (old) => {
        if (!old) return old; // no list cached yet: don't invent a partial one
        return old.some((x) => x.pageKey === saved.pageKey)
          ? old.map((x) => (x.pageKey === saved.pageKey ? saved : x))
          : [...old, saved];
      });
      qc.invalidateQueries({ queryKey: TEMPLATES_KEY });
      qc.invalidateQueries({ queryKey: AUDIT_KEY });
    },
  });
}

export function useSeoOverridesQuery() {
  return useQuery({ queryKey: OVERRIDES_KEY, queryFn: seoAdminService.listOverrides, staleTime: 60_000 });
}

export function useCreateSeoOverrideMutation() {
  const qc = useQueryClient();
  return useMutation<SeoPathOverride, AppError, SeoOverrideInput>({
    mutationFn: (input) => run(() => seoAdminService.createOverride(input)),
    onSuccess: (saved) => {
      qc.setQueryData<SeoPathOverride[]>(OVERRIDES_KEY, (old) => (old ? [...old, saved] : old));
      qc.invalidateQueries({ queryKey: OVERRIDES_KEY });
      qc.invalidateQueries({ queryKey: AUDIT_KEY });
    },
  });
}

export function useUpdateSeoOverrideMutation() {
  const qc = useQueryClient();
  return useMutation<SeoPathOverride, AppError, { id: string; input: SeoOverrideInput }>({
    mutationFn: ({ id, input }) => run(() => seoAdminService.updateOverride(id, input)),
    onSuccess: (saved) => {
      qc.setQueryData<SeoPathOverride[]>(OVERRIDES_KEY, (old) => old?.map((x) => (x.id === saved.id ? saved : x)));
      qc.invalidateQueries({ queryKey: OVERRIDES_KEY });
      qc.invalidateQueries({ queryKey: AUDIT_KEY });
    },
  });
}

export function useDeleteSeoOverrideMutation() {
  const qc = useQueryClient();
  return useMutation<void, AppError, string>({
    mutationFn: (id) => run(() => seoAdminService.deleteOverride(id)),
    onSuccess: (_void, id) => {
      qc.setQueryData<SeoPathOverride[]>(OVERRIDES_KEY, (old) => old?.filter((x) => x.id !== id));
      qc.invalidateQueries({ queryKey: OVERRIDES_KEY });
      qc.invalidateQueries({ queryKey: AUDIT_KEY });
    },
  });
}

export function useSeoGlobalQuery() {
  return useQuery({ queryKey: GLOBAL_KEY, queryFn: seoAdminService.getGlobal, staleTime: 60_000 });
}

export function useSetSeoGlobalMutation() {
  const qc = useQueryClient();
  return useMutation<SeoGlobal, AppError, SeoGlobal>({
    mutationFn: (global) => run(() => seoAdminService.setGlobal(global)),
    onSuccess: (saved) => {
      qc.setQueryData<SeoGlobal>(GLOBAL_KEY, saved);
      qc.invalidateQueries({ queryKey: GLOBAL_KEY });
      qc.invalidateQueries({ queryKey: AUDIT_KEY });
    },
  });
}

// No cache writes: the key is only persisted when the form is saved.
export function useUploadOgImageMutation() {
  return useMutation<OgImageUploadResult, AppError, File>({
    mutationFn: (file) => run(() => seoAdminService.uploadOgImage(file)),
  });
}
