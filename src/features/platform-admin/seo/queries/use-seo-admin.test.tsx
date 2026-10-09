import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { AxiosError, AxiosHeaders } from 'axios';

vi.mock('../services/seo-admin.service', () => ({
  seoAdminService: { setTemplate: vi.fn() },
}));

import { seoAdminService } from '../services/seo-admin.service';
import { seoFieldErrors } from '../utils/seo-field-errors';
import { useSetSeoTemplateMutation } from './use-seo-admin';

const fields = {
  titleTemplate: 't',
  descriptionTemplate: null,
  ogImageUrl: null,
  robotsIndex: null,
  robotsFollow: null,
  disabledGeneratedJsonLd: [],
  extraJsonLd: [],
};

function setup() {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const spy = vi.spyOn(qc, 'invalidateQueries');
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  return { spy, wrapper };
}

describe('useSetSeoTemplateMutation', () => {
  it('calls the service and invalidates templates + audit', async () => {
    vi.mocked(seoAdminService.setTemplate).mockResolvedValueOnce({} as never);
    const { spy, wrapper } = setup();
    const { result } = renderHook(() => useSetSeoTemplateMutation(), { wrapper });
    await result.current.mutateAsync({ pageKey: 'home', fields });
    expect(seoAdminService.setTemplate).toHaveBeenCalledWith('home', fields);
    expect(spy).toHaveBeenCalledWith({ queryKey: ['platform-admin', 'seo', 'templates'] });
    expect(spy).toHaveBeenCalledWith({ queryKey: ['platform-admin', 'settings-audit'] });
  });

  it('surfaces a 400 as AppError whose field errors are mappable', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const err = new AxiosError('x', undefined, { headers: new AxiosHeaders() } as never, undefined, {
      status: 400,
      data: { message: 'Invalid SEO configuration', errors: [{ field: 'titleTemplate', message: 'too long' }] },
    } as never);
    vi.mocked(seoAdminService.setTemplate).mockRejectedValueOnce(err);
    const { wrapper } = setup();
    const { result } = renderHook(() => useSetSeoTemplateMutation(), { wrapper });
    const thrown = await result.current.mutateAsync({ pageKey: 'home', fields }).catch((e) => e);
    expect(thrown.status).toBe(400);
    expect(seoFieldErrors(thrown)).toEqual({ titleTemplate: 'too long' });
  });
});
