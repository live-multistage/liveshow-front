import { describe, it, expect, vi, beforeEach } from 'vitest';

const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('@/lib/http/client', () => ({ httpClient: { get } }));

import { organizationService } from './organization.service';

describe('organizationService my organizations', () => {
  beforeEach(() => vi.clearAllMocks());

  it('listMyOrganizations sends page, pageSize, filter and q to the paged endpoint', async () => {
    const body = { items: [], page: 2, pageSize: 20, total: 0 };
    get.mockResolvedValueOnce({ data: body });
    await expect(organizationService.listMyOrganizations({ page: 2, filter: 'invited', q: 'acme' })).resolves.toEqual(body);
    expect(get).toHaveBeenCalledWith('/organizations/mine/paged', {
      params: { page: 2, pageSize: 20, filter: 'invited', q: 'acme' },
    });
  });

  it('listMyOrganizations defaults to page 1 with no filter or search', async () => {
    get.mockResolvedValueOnce({ data: { items: [], page: 1, pageSize: 20, total: 0 } });
    await organizationService.listMyOrganizations();
    expect(get).toHaveBeenCalledWith('/organizations/mine/paged', {
      params: { page: 1, pageSize: 20, filter: undefined, q: undefined },
    });
  });

  it('getMyOrganizationsSummary reads the summary endpoint', async () => {
    const summary = {
      counts: { all: 3, owned: 2, invited: 1, archived: 0 },
      totals: { activeEventsCount: 4, memberCount: 9, salesThisMonth: [] },
    };
    get.mockResolvedValueOnce({ data: summary });
    await expect(organizationService.getMyOrganizationsSummary()).resolves.toEqual(summary);
    expect(get).toHaveBeenCalledWith('/organizations/mine/summary');
  });
});
