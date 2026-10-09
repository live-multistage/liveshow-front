import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

vi.mock('../services/seo-admin.service', () => ({
  seoAdminService: {
    setTemplate: vi.fn(),
    createOverride: vi.fn(),
    updateOverride: vi.fn(),
    deleteOverride: vi.fn(),
    setGlobal: vi.fn(),
  },
}));

import { seoAdminService } from '../services/seo-admin.service';
import {
  useCreateSeoOverrideMutation,
  useDeleteSeoOverrideMutation,
  useSetSeoGlobalMutation,
  useSetSeoTemplateMutation,
  useUpdateSeoOverrideMutation,
} from './use-seo-admin';

const T = ['platform-admin', 'seo', 'templates'];
const O = ['platform-admin', 'seo', 'overrides'];
const G = ['platform-admin', 'seo', 'global'];
const fields = {
  titleTemplate: null, descriptionTemplate: null, ogImageUrl: null, robotsIndex: null,
  robotsFollow: null, disabledGeneratedJsonLd: [], extraJsonLd: [],
};

function setup() {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  vi.spyOn(qc, 'invalidateQueries').mockResolvedValue();
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  return { qc, wrapper };
}

// The editor seeds from the cache on open, so the cache must hold the saved row before any refetch lands.
describe('SEO admin cache after saves', () => {
  it('replaces the saved template by pageKey', async () => {
    const { qc, wrapper } = setup();
    qc.setQueryData(T, [{ pageKey: 'home', ...fields }, { pageKey: 'help', ...fields }]);
    const saved = { pageKey: 'home', ...fields, titleTemplate: 'new', updatedAt: 'x' };
    vi.mocked(seoAdminService.setTemplate).mockResolvedValueOnce(saved as never);
    const { result } = renderHook(() => useSetSeoTemplateMutation(), { wrapper });
    await result.current.mutateAsync({ pageKey: 'home', fields });
    expect(qc.getQueryData<unknown[]>(T)![0]).toEqual(saved);
    expect(qc.getQueryData<unknown[]>(T)).toHaveLength(2);
  });

  it('appends, replaces and removes overrides', async () => {
    const { qc, wrapper } = setup();
    qc.setQueryData(O, [{ id: 'a', path: '/a' }]);
    vi.mocked(seoAdminService.createOverride).mockResolvedValueOnce({ id: 'b', path: '/b' } as never);
    vi.mocked(seoAdminService.updateOverride).mockResolvedValueOnce({ id: 'a', path: '/a', titleTemplate: 'n' } as never);
    vi.mocked(seoAdminService.deleteOverride).mockResolvedValueOnce(undefined);
    const create = renderHook(() => useCreateSeoOverrideMutation(), { wrapper });
    await create.result.current.mutateAsync({ ...fields, path: '/b' });
    expect(qc.getQueryData<{ id: string }[]>(O)!.map((x) => x.id)).toEqual(['a', 'b']);
    const update = renderHook(() => useUpdateSeoOverrideMutation(), { wrapper });
    await update.result.current.mutateAsync({ id: 'a', input: { ...fields, path: '/a' } });
    expect(qc.getQueryData<{ titleTemplate?: string }[]>(O)![0].titleTemplate).toBe('n');
    const del = renderHook(() => useDeleteSeoOverrideMutation(), { wrapper });
    await del.result.current.mutateAsync('a');
    expect(qc.getQueryData<{ id: string }[]>(O)!.map((x) => x.id)).toEqual(['b']);
  });

  it('stores the saved global settings', async () => {
    const { qc, wrapper } = setup();
    const saved = { googleSiteVerification: 'g', bingSiteVerification: null, defaultOgImageUrl: null, organizationJsonLd: null, websiteJsonLd: null, robotsExtraRules: [] };
    vi.mocked(seoAdminService.setGlobal).mockResolvedValueOnce(saved);
    const { result } = renderHook(() => useSetSeoGlobalMutation(), { wrapper });
    await result.current.mutateAsync(saved);
    expect(qc.getQueryData(G)).toEqual(saved);
  });
});
