import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

vi.mock('../services/legal-admin.service', () => ({ legalAdminService: { publish: vi.fn() } }));

import { legalAdminService } from '../services/legal-admin.service';
import { usePublishLegalVersionMutation } from './use-legal-admin';

describe('usePublishLegalVersionMutation', () => {
  it('publishes and invalidates current + versions for that kind only', async () => {
    vi.mocked(legalAdminService.publish).mockResolvedValueOnce({} as never);
    const qc = new QueryClient();
    const spy = vi.spyOn(qc, 'invalidateQueries');
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
    const { result } = renderHook(() => usePublishLegalVersionMutation('terms'), { wrapper });
    const body = { content: { pt: 'x' }, changeSummary: 's' };
    await result.current.mutateAsync(body);
    expect(legalAdminService.publish).toHaveBeenCalledWith('terms', body);
    const keys = spy.mock.calls.map((c) => (c[0] as { queryKey: unknown[] }).queryKey);
    expect(keys).toContainEqual(['platform-admin', 'legal', 'terms', 'current']);
    expect(keys).toContainEqual(['platform-admin', 'legal', 'terms', 'versions']);
    expect(keys.some((k) => k.includes('privacy'))).toBe(false);
  });
});
