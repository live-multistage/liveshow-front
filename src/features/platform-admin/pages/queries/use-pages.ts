'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { pagesService, type ListPagesParams } from '../services/pages.service';
import { pageKeys } from './page.keys';

export function usePagesListQuery(filter: ListPagesParams) {
  return useQuery({
    queryKey: pageKeys.list(filter),
    queryFn: () => pagesService.list(filter),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}

export function usePageQuery(id: string | null) {
  return useQuery({
    queryKey: pageKeys.detail(id ?? ''),
    queryFn: () => pagesService.get(id as string),
    enabled: id !== null,
  });
}

export function usePageVersionsQuery(id: string, options: { enabled: boolean }) {
  return useQuery({
    queryKey: pageKeys.versions(id),
    queryFn: () => pagesService.listVersions(id),
    enabled: options.enabled,
  });
}

// staleTime 0: the diff describes the live draft vs. the published version, so it is recomputed on every open.
export function usePublishDiffQuery(id: string, options: { enabled: boolean }) {
  return useQuery({
    queryKey: pageKeys.diff(id),
    queryFn: () => pagesService.publishDiff(id),
    enabled: options.enabled,
    staleTime: 0,
  });
}

// Keyed by draft revision: every successful autosave yields a fresh preview (resolved rails/featured), while the
// previous one stays on screen until it arrives.
export function usePagePreviewQuery(id: string, revision: number) {
  return useQuery({
    queryKey: pageKeys.preview(id, revision),
    queryFn: () => pagesService.preview(id),
    staleTime: Infinity,
    placeholderData: keepPreviousData,
  });
}
