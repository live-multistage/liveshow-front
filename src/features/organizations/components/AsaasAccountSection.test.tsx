import { describe, it, expect, vi, beforeEach } from 'vitest';
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AsaasAccountSection } from './AsaasAccountSection';
import { useAsaasSubaccount } from '../hooks/use-asaas-subaccount';
import { useCreateAsaasSubaccount } from '../hooks/use-create-asaas-subaccount';
import type { AsaasSubaccountResponse } from '@live-show/api-contracts';
import type { AppError } from '@/lib/http/errors';

vi.mock('../hooks/use-asaas-subaccount', () => ({ useAsaasSubaccount: vi.fn() }));
vi.mock('../hooks/use-create-asaas-subaccount', () => ({ useCreateAsaasSubaccount: vi.fn() }));

const mockedAccount = vi.mocked(useAsaasSubaccount);
const mockedCreate = vi.mocked(useCreateAsaasSubaccount);

function mockAccount(
  data: AsaasSubaccountResponse | null,
  overrides: Partial<ReturnType<typeof useAsaasSubaccount>> = {},
) {
  mockedAccount.mockReturnValue({
    data,
    isLoading: false,
    isError: false,
    error: null,
    ...overrides,
  } as ReturnType<typeof useAsaasSubaccount>);
}

function mockCreate(overrides: Partial<ReturnType<typeof useCreateAsaasSubaccount>> = {}) {
  const mutate = vi.fn();
  mockedCreate.mockReturnValue({
    mutate,
    isPending: false,
    error: null,
    ...overrides,
  } as ReturnType<typeof useCreateAsaasSubaccount>);
  return mutate;
}

async function fillValidCnpjForm() {
  await userEvent.type(screen.getByLabelText('asaas.fieldName'), 'RockFest Produções LTDA');
  await userEvent.type(screen.getByLabelText('asaas.fieldEmail'), 'financeiro@rockfest.com');
  await userEvent.type(screen.getByLabelText('asaas.fieldCpfCnpj'), '12345678000195');
  await userEvent.selectOptions(screen.getByLabelText('asaas.fieldCompanyType'), 'LIMITED');
  await userEvent.type(screen.getByLabelText('asaas.fieldMobilePhone'), '11988887777');
  await userEvent.type(screen.getByLabelText('asaas.fieldIncomeValue'), '50000');
  await userEvent.type(screen.getByLabelText('asaas.fieldPostalCode'), '01000000');
  await userEvent.type(screen.getByLabelText('asaas.fieldProvince'), 'Bela Vista');
  await userEvent.type(screen.getByLabelText('asaas.fieldAddress'), 'Av. Paulista');
  await userEvent.type(screen.getByLabelText('asaas.fieldAddressNumber'), '1000');
}

beforeEach(() => {
  vi.clearAllMocks();
  mockCreate();
});

describe('AsaasAccountSection', () => {
  it('shows the empty state CTA when there is no account', () => {
    mockAccount(null);
    render(<AsaasAccountSection orgId="o1" />);
    expect(screen.getByRole('button', { name: 'asaas.ctaConnect' })).toBeInTheDocument();
  });

  it('asks for company type for a CNPJ and birth date for a CPF', async () => {
    mockAccount(null);
    render(<AsaasAccountSection orgId="o1" />);
    await userEvent.click(screen.getByRole('button', { name: 'asaas.ctaConnect' }));

    await userEvent.type(screen.getByLabelText('asaas.fieldCpfCnpj'), '12345678000195');
    expect(screen.getByLabelText('asaas.fieldCompanyType')).toBeInTheDocument();

    await userEvent.clear(screen.getByLabelText('asaas.fieldCpfCnpj'));
    await userEvent.type(screen.getByLabelText('asaas.fieldCpfCnpj'), '12345678909');
    expect(screen.getByLabelText('asaas.fieldBirthDate')).toBeInTheDocument();
  });

  it('submits a valid form through the mutation', async () => {
    mockAccount(null);
    const mutate = mockCreate();
    render(<AsaasAccountSection orgId="o1" />);
    await userEvent.click(screen.getByRole('button', { name: 'asaas.ctaConnect' }));
    await fillValidCnpjForm();
    await userEvent.click(screen.getByRole('button', { name: 'asaas.submitButton' }));

    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({ cpfCnpj: '12345678000195', postalCode: '01000000' }),
      expect.anything(),
    );
  });

  it('shows the pending approval state with the masked wallet', () => {
    mockAccount({ status: 'PENDING_APPROVAL', walletIdMasked: '••••1234', createdAt: '2026-09-19T00:00:00Z' });
    render(<AsaasAccountSection orgId="o1" />);
    expect(screen.getByText('asaas.badgePending')).toBeInTheDocument();
    expect(screen.getByText('••••1234')).toBeInTheDocument();
  });

  it('shows the active badge', () => {
    mockAccount({ status: 'ACTIVE', walletIdMasked: '••••1234', createdAt: '2026-09-19T00:00:00Z' });
    render(<AsaasAccountSection orgId="o1" />);
    expect(screen.getByText('asaas.badgeActive')).toBeInTheDocument();
  });

  it('explains a rejected account', () => {
    mockAccount({ status: 'REJECTED', walletIdMasked: '••••1234', createdAt: '2026-09-19T00:00:00Z' });
    render(<AsaasAccountSection orgId="o1" />);
    expect(screen.getByText('asaas.badgeRejected')).toBeInTheDocument();
    expect(screen.getByText('asaas.rejectedDescription')).toBeInTheDocument();
  });

  it('shows a shimmer skeleton while loading', () => {
    mockAccount(null, { isLoading: true });
    render(<AsaasAccountSection orgId="o1" />);
    expect(screen.getByTestId('asaas-loading')).toBeInTheDocument();
  });

  it('shows the unavailable state on a 503', () => {
    mockAccount(null, {
      isLoading: false,
      isError: true,
      error: Object.assign(new Error('unavailable'), { status: 503 }),
    });
    render(<AsaasAccountSection orgId="o1" />);
    expect(screen.getByText('asaas.unavailableDescription')).toBeInTheDocument();
  });

  it('maps a 409 mutation error to the conflict message', async () => {
    mockAccount(null);
    mockCreate({ error: { status: 409, message: 'conflict' } as AppError });
    render(<AsaasAccountSection orgId="o1" />);
    await userEvent.click(screen.getByRole('button', { name: 'asaas.ctaConnect' }));
    expect(screen.getByText('asaas.serverErrorConflict')).toBeInTheDocument();
  });
});
