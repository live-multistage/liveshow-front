import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/http/client', () => ({
  httpClient: { get: vi.fn(), post: vi.fn(), delete: vi.fn(), patch: vi.fn() },
}));

import { httpClient } from '@/lib/http/client';
import { organizationService } from './organization.service';
import type { AsaasSubaccountResponse, CreateAsaasSubaccountRequest } from '@live-show/api-contracts';

const mocked = vi.mocked(httpClient);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('organizationService Asaas subaccount', () => {
  it('getAsaasSubaccount returns the data on success', async () => {
    const response: AsaasSubaccountResponse = {
      status: 'ACTIVE',
      walletIdMasked: '••••9f3a',
      createdAt: '2026-09-19T00:00:00.000Z',
    };
    mocked.get.mockResolvedValueOnce({ data: response });

    const result = await organizationService.getAsaasSubaccount('org-1');

    expect(mocked.get).toHaveBeenCalledWith('/organizations/org-1/asaas/subaccount');
    expect(result).toBe(response);
  });

  it('getAsaasSubaccount returns null on a 404', async () => {
    mocked.get.mockRejectedValueOnce({ isAxiosError: true, response: { status: 404 } });

    const result = await organizationService.getAsaasSubaccount('org-1');

    expect(result).toBeNull();
  });

  it('getAsaasSubaccount rethrows other errors', async () => {
    const err = { isAxiosError: true, response: { status: 500 } };
    mocked.get.mockRejectedValueOnce(err);

    await expect(organizationService.getAsaasSubaccount('org-1')).rejects.toBe(err);
  });

  it('createAsaasSubaccount posts the body', async () => {
    const body: CreateAsaasSubaccountRequest = {
      name: 'Produtora X',
      email: 'fin@x.io',
      cpfCnpj: '12345678000195',
      companyType: 'LIMITED',
      mobilePhone: '11999999999',
      address: 'Rua A',
      addressNumber: '10',
      province: 'Centro',
      postalCode: '01000000',
      incomeValue: 50000,
    };
    const response: AsaasSubaccountResponse = {
      status: 'PENDING_APPROVAL',
      walletIdMasked: '••••1234',
      createdAt: '2026-09-19T00:00:00.000Z',
    };
    mocked.post.mockResolvedValueOnce({ data: response });

    const result = await organizationService.createAsaasSubaccount('org-1', body);

    expect(mocked.post).toHaveBeenCalledWith('/organizations/org-1/asaas/subaccount', body);
    expect(result).toBe(response);
  });
});
