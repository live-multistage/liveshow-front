import { describe, it, expect, vi, beforeEach } from 'vitest';
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: vi.fn(() => 'pt-BR'),
}));

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLocale } from 'next-intl';
import { AsaasAccountSection } from './AsaasAccountSection';
import { useAsaasSubaccount } from '../hooks/use-asaas-subaccount';
import { useCreateAsaasSubaccount } from '../hooks/use-create-asaas-subaccount';
import type { AsaasSubaccountResponse } from '@live-show/api-contracts';
import type { AppError } from '@/lib/http/errors';

vi.mock('../hooks/use-asaas-subaccount', () => ({ useAsaasSubaccount: vi.fn() }));
vi.mock('../hooks/use-create-asaas-subaccount', () => ({ useCreateAsaasSubaccount: vi.fn() }));

const mockedAccount = vi.mocked(useAsaasSubaccount);
const mockedCreate = vi.mocked(useCreateAsaasSubaccount);
const mockedLocale = vi.mocked(useLocale);

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

async function openForm() {
  await userEvent.click(screen.getByRole('button', { name: 'asaas.ctaConnect' }));
}

async function fillValidCnpjForm() {
  await userEvent.type(screen.getByLabelText('asaas.fieldName'), 'RockFest Produções LTDA');
  await userEvent.type(screen.getByLabelText('asaas.fieldEmail'), 'financeiro@rockfest.com');
  await userEvent.type(screen.getByLabelText('asaas.fieldCpfCnpj'), '12345678000195');
  await userEvent.selectOptions(screen.getByLabelText('asaas.fieldCompanyType'), 'LIMITED');
  await userEvent.type(screen.getByLabelText('asaas.fieldMobilePhone'), '11988887777');
  // Money mask reads every typed digit as cents: 7 digits -> R$ 50.000,00.
  await userEvent.type(screen.getByLabelText('asaas.fieldIncomeValue'), '5000000');
  await userEvent.type(screen.getByLabelText('asaas.fieldPostalCode'), '01000000');
  await userEvent.type(screen.getByLabelText('asaas.fieldProvince'), 'Bela Vista');
  await userEvent.type(screen.getByLabelText('asaas.fieldAddress'), 'Av. Paulista');
  await userEvent.type(screen.getByLabelText('asaas.fieldAddressNumber'), '1000');
}

beforeEach(() => {
  vi.clearAllMocks();
  mockCreate();
  mockedLocale.mockReturnValue('pt-BR');
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
    await openForm();

    await userEvent.type(screen.getByLabelText('asaas.fieldCpfCnpj'), '12345678000195');
    expect(screen.getByLabelText('asaas.fieldCompanyType')).toBeInTheDocument();

    await userEvent.clear(screen.getByLabelText('asaas.fieldCpfCnpj'));
    await userEvent.type(screen.getByLabelText('asaas.fieldCpfCnpj'), '12345678909');
    expect(screen.getByLabelText('asaas.fieldBirthDate')).toBeInTheDocument();
  });

  it('submits a valid form through the mutation with the raw (unmasked) payload', async () => {
    mockAccount(null);
    const mutate = mockCreate();
    render(<AsaasAccountSection orgId="o1" />);
    await openForm();
    await fillValidCnpjForm();
    await userEvent.click(screen.getByRole('button', { name: 'asaas.submitButton' }));

    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        cpfCnpj: '12345678000195',
        mobilePhone: '11988887777',
        postalCode: '01000000',
        incomeValue: 50000,
      }),
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

  it('formats the created-at date using the active locale', () => {
    mockedLocale.mockReturnValue('en');
    mockAccount({ status: 'ACTIVE', walletIdMasked: '••••1234', createdAt: '2026-09-19T00:00:00Z' });
    render(<AsaasAccountSection orgId="o1" />);
    const expected = new Date('2026-09-19T00:00:00Z').toLocaleDateString('en');
    expect(screen.getByText(expected)).toBeInTheDocument();
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
    await openForm();
    expect(screen.getByText('asaas.serverErrorConflict')).toBeInTheDocument();
  });

  describe('field-level validation', () => {
    it('marks an invalid email as aria-invalid and describes it with the error text', async () => {
      mockAccount(null);
      render(<AsaasAccountSection orgId="o1" />);
      await openForm();
      await userEvent.type(screen.getByLabelText('asaas.fieldEmail'), 'not-an-email');
      await userEvent.click(screen.getByRole('button', { name: 'asaas.submitButton' }));

      const emailInput = screen.getByLabelText('asaas.fieldEmail');
      expect(emailInput).toHaveAttribute('aria-invalid', 'true');
      const describedBy = emailInput.getAttribute('aria-describedby');
      expect(describedBy).toBeTruthy();
      const errorNode = document.getElementById(describedBy!);
      expect(errorNode).toHaveTextContent('asaas.fieldEmailError');
    });

    it('gives a short cpfCnpj a length-specific message', async () => {
      mockAccount(null);
      render(<AsaasAccountSection orgId="o1" />);
      await openForm();
      await userEvent.type(screen.getByLabelText('asaas.fieldCpfCnpj'), '123');
      await userEvent.click(screen.getByRole('button', { name: 'asaas.submitButton' }));

      expect(screen.getByLabelText('asaas.fieldCpfCnpj')).toHaveAttribute('aria-invalid', 'true');
      expect(screen.getByText('asaas.fieldCpfCnpjLength')).toBeInTheDocument();
    });

    it('gives a right-length but bad-checksum cpfCnpj a distinct invalid message', async () => {
      mockAccount(null);
      render(<AsaasAccountSection orgId="o1" />);
      await openForm();
      // 11 repeated digits: right length for a CPF, fails the checksum.
      await userEvent.type(screen.getByLabelText('asaas.fieldCpfCnpj'), '11111111111');
      await userEvent.click(screen.getByRole('button', { name: 'asaas.submitButton' }));

      expect(screen.getByText('asaas.fieldCpfCnpjInvalid')).toBeInTheDocument();
    });

    it('flags an empty companyType for a CNPJ on its own field, not just the banner', async () => {
      mockAccount(null);
      render(<AsaasAccountSection orgId="o1" />);
      await openForm();
      await userEvent.type(screen.getByLabelText('asaas.fieldCpfCnpj'), '12345678000195');
      await userEvent.click(screen.getByRole('button', { name: 'asaas.submitButton' }));

      const select = screen.getByLabelText('asaas.fieldCompanyType');
      expect(select).toHaveAttribute('aria-invalid', 'true');
      const describedBy = select.getAttribute('aria-describedby');
      expect(document.getElementById(describedBy!)).toHaveTextContent('asaas.fieldRequired');
    });

    it('flags an empty birthDate for a CPF on its own field', async () => {
      mockAccount(null);
      render(<AsaasAccountSection orgId="o1" />);
      await openForm();
      await userEvent.type(screen.getByLabelText('asaas.fieldCpfCnpj'), '12345678909');
      await userEvent.click(screen.getByRole('button', { name: 'asaas.submitButton' }));

      const birthDate = screen.getByLabelText('asaas.fieldBirthDate');
      expect(birthDate).toHaveAttribute('aria-invalid', 'true');
      const describedBy = birthDate.getAttribute('aria-describedby');
      expect(document.getElementById(describedBy!)).toHaveTextContent('asaas.fieldRequired');
    });

    it('flags a malformed mobilePhone on its own field', async () => {
      mockAccount(null);
      render(<AsaasAccountSection orgId="o1" />);
      await openForm();
      // Too short for either a landline or a mobile number.
      await userEvent.type(screen.getByLabelText('asaas.fieldMobilePhone'), '119');
      await userEvent.click(screen.getByRole('button', { name: 'asaas.submitButton' }));

      const phone = screen.getByLabelText('asaas.fieldMobilePhone');
      expect(phone).toHaveAttribute('aria-invalid', 'true');
      const describedBy = phone.getAttribute('aria-describedby');
      expect(describedBy).toBeTruthy();
      expect(document.getElementById(describedBy!)).toHaveTextContent('asaas.fieldRequired');
    });

    it('flags a malformed postalCode on its own field', async () => {
      mockAccount(null);
      render(<AsaasAccountSection orgId="o1" />);
      await openForm();
      // A CEP is 8 digits; 4 is too short.
      await userEvent.type(screen.getByLabelText('asaas.fieldPostalCode'), '0100');
      await userEvent.click(screen.getByRole('button', { name: 'asaas.submitButton' }));

      const postalCode = screen.getByLabelText('asaas.fieldPostalCode');
      expect(postalCode).toHaveAttribute('aria-invalid', 'true');
      const describedBy = postalCode.getAttribute('aria-describedby');
      expect(describedBy).toBeTruthy();
      expect(document.getElementById(describedBy!)).toHaveTextContent('asaas.fieldRequired');
    });

    it('flags a missing incomeValue on its own field', async () => {
      mockAccount(null);
      render(<AsaasAccountSection orgId="o1" />);
      await openForm();
      // Left untouched: incomeValue stays undefined -> z.coerce.number()
      // -> NaN -> fails .positive().
      await userEvent.click(screen.getByRole('button', { name: 'asaas.submitButton' }));

      const incomeValue = screen.getByLabelText('asaas.fieldIncomeValue');
      expect(incomeValue).toHaveAttribute('aria-invalid', 'true');
      const describedBy = incomeValue.getAttribute('aria-describedby');
      expect(describedBy).toBeTruthy();
      expect(document.getElementById(describedBy!)).toHaveTextContent('asaas.fieldRequired');
    });
  });

  describe('display masks', () => {
    it('masks the cpfCnpj, phone and postal code fields as the user types', async () => {
      mockAccount(null);
      render(<AsaasAccountSection orgId="o1" />);
      await openForm();

      await userEvent.type(screen.getByLabelText('asaas.fieldCpfCnpj'), '12345678000195');
      expect(screen.getByLabelText('asaas.fieldCpfCnpj')).toHaveValue('12.345.678/0001-95');

      await userEvent.type(screen.getByLabelText('asaas.fieldMobilePhone'), '11988887777');
      expect(screen.getByLabelText('asaas.fieldMobilePhone')).toHaveValue('(11) 98888-7777');

      await userEvent.type(screen.getByLabelText('asaas.fieldPostalCode'), '01000000');
      expect(screen.getByLabelText('asaas.fieldPostalCode')).toHaveValue('01000-000');
    });

    it('masks the income field as BRL currency while typing', async () => {
      mockAccount(null);
      render(<AsaasAccountSection orgId="o1" />);
      await openForm();

      await userEvent.type(screen.getByLabelText('asaas.fieldIncomeValue'), '5000000');
      const value = (screen.getByLabelText('asaas.fieldIncomeValue') as HTMLInputElement).value;
      // Node's ICU renders the currency-symbol gap as a non-breaking space.
      expect(value.replace(/ /g, ' ')).toBe('R$ 50.000,00');
    });
  });
});
