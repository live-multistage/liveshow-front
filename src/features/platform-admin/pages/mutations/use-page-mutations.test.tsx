import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { AxiosError, type AxiosResponse } from 'axios';
import type { PageDetail } from '@live-show/api-contracts';

vi.mock('../services/pages.service', async (importOriginal) => ({
  isDraftConflict: (await importOriginal<typeof import('../services/pages.service')>()).isDraftConflict,
  isFeaturedUnavailable: (await importOriginal<typeof import('../services/pages.service')>()).isFeaturedUnavailable,
  pagesService: {
    create: vi.fn(),
    updateSettings: vi.fn(),
    publish: vi.fn(),
    restoreVersion: vi.fn(),
    unpublish: vi.fn(),
    archive: vi.fn(),
    unarchive: vi.fn(),
  },
}));

import { pagesService } from '../services/pages.service';
import { pageKeys } from '../queries/page.keys';
import {
  useArchivePageMutation,
  useCreatePageMutation,
  usePublishPageMutation,
  useRestoreVersionMutation,
  useUnarchivePageMutation,
  useUnpublishPageMutation,
  useUpdatePageSettingsMutation,
} from './use-page-mutations';

const LISTS = ['platform-admin', 'pages', 'list'];
const detail = { id: 'p1', title: 'Home' } as unknown as PageDetail;

function setup() {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const invalidate = vi.spyOn(qc, 'invalidateQueries');
  const setData = vi.spyOn(qc, 'setQueryData');
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  return { invalidate, setData, wrapper };
}

describe('page mutations', () => {
  beforeEach(() => vi.clearAllMocks());

  it('create calls the service and invalidates the lists', async () => {
    vi.mocked(pagesService.create).mockResolvedValueOnce(detail);
    const { invalidate, wrapper } = setup();
    const { result } = renderHook(() => useCreatePageMutation(), { wrapper });
    const body = { title: 'Home', slug: 'home' } as never;
    await result.current.mutateAsync(body);
    expect(pagesService.create).toHaveBeenCalledWith(body);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: LISTS });
  });

  it('update settings writes the returned detail and invalidates the lists', async () => {
    vi.mocked(pagesService.updateSettings).mockResolvedValueOnce(detail);
    const { invalidate, setData, wrapper } = setup();
    const { result } = renderHook(() => useUpdatePageSettingsMutation('p1'), { wrapper });
    const body = { title: 'Nova' } as never;
    await result.current.mutateAsync(body);
    expect(pagesService.updateSettings).toHaveBeenCalledWith('p1', body);
    expect(setData).toHaveBeenCalledWith(pageKeys.detail('p1'), detail);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: LISTS });
  });

  it('publish invalidates detail, versions, diff and lists', async () => {
    vi.mocked(pagesService.publish).mockResolvedValueOnce({} as never);
    const { invalidate, wrapper } = setup();
    const { result } = renderHook(() => usePublishPageMutation('p1'), { wrapper });
    const body = { changeSummary: 'x' } as never;
    await result.current.mutateAsync(body);
    expect(pagesService.publish).toHaveBeenCalledWith('p1', body);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: pageKeys.detail('p1') });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: pageKeys.versions('p1') });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: pageKeys.diff('p1') });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: LISTS });
  });

  it('publish keeps the DRAFT_CONFLICT body on the error', async () => {
    const conflict = { code: 'DRAFT_CONFLICT', currentRevision: 7, updatedBy: { id: 'u1', name: 'Ana' }, updatedAt: 'x' };
    vi.mocked(pagesService.publish).mockRejectedValueOnce(
      new AxiosError('conflict', '409', undefined, undefined, { status: 409, data: conflict } as AxiosResponse),
    );
    const { wrapper } = setup();
    const { result } = renderHook(() => usePublishPageMutation('p1'), { wrapper });
    const error = await result.current.mutateAsync({ changeSummary: 'x' } as never).catch((e) => e);
    expect(error.status).toBe(409);
    expect(error.conflict.updatedBy.name).toBe('Ana');
  });

  it('publish keeps the FEATURED_UNAVAILABLE body (the element to mark) on the error', async () => {
    vi.mocked(pagesService.publish).mockRejectedValueOnce(
      new AxiosError('bad', '400', undefined, undefined, { status: 400, data: { code: 'FEATURED_UNAVAILABLE', elementId: 'el-1' } } as AxiosResponse),
    );
    const { wrapper } = setup();
    const { result } = renderHook(() => usePublishPageMutation('p1'), { wrapper });
    const error = await result.current.mutateAsync({ changeSummary: 'x' } as never).catch((e) => e);
    expect(error.featuredUnavailable).toEqual({ code: 'FEATURED_UNAVAILABLE', elementId: 'el-1' });
    expect(error.conflict).toBeUndefined();
  });

  it.each([
    ['409 with another code', 409, { code: 'NOTHING_TO_PUBLISH' }],
    ['500', 500, {}],
  ])('publish %s has no conflict on the error', async (_name, status, data) => {
    vi.mocked(pagesService.publish).mockRejectedValueOnce(
      new AxiosError('x', String(status), undefined, undefined, { status, data } as AxiosResponse),
    );
    const { wrapper } = setup();
    const { result } = renderHook(() => usePublishPageMutation('p1'), { wrapper });
    const error = await result.current.mutateAsync({ changeSummary: 'x' } as never).catch((e) => e);
    expect(error.status).toBe(status);
    expect(error.conflict).toBeUndefined();
  });

  it('restore version writes the returned detail and invalidates the diff', async () => {
    vi.mocked(pagesService.restoreVersion).mockResolvedValueOnce(detail);
    const { invalidate, setData, wrapper } = setup();
    const { result } = renderHook(() => useRestoreVersionMutation('p1'), { wrapper });
    await result.current.mutateAsync(3);
    expect(pagesService.restoreVersion).toHaveBeenCalledWith('p1', 3);
    expect(setData).toHaveBeenCalledWith(pageKeys.detail('p1'), detail);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: pageKeys.diff('p1') });
  });

  it.each([
    ['unpublish', useUnpublishPageMutation, () => pagesService.unpublish],
    ['archive', useArchivePageMutation, () => pagesService.archive],
    ['unarchive', useUnarchivePageMutation, () => pagesService.unarchive],
  ] as const)('%s writes the returned detail and invalidates the lists', async (_name, useHook, service) => {
    vi.mocked(service()).mockResolvedValueOnce(detail);
    const { invalidate, setData, wrapper } = setup();
    const { result } = renderHook(() => useHook('p1'), { wrapper });
    await result.current.mutateAsync();
    expect(service()).toHaveBeenCalledWith('p1');
    expect(setData).toHaveBeenCalledWith(pageKeys.detail('p1'), detail);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: LISTS });
  });
});
