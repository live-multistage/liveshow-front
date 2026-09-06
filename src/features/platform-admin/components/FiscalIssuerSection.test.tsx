import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { toast } from 'sonner';
import { FiscalIssuerSection } from './FiscalIssuerSection';
import { useFiscalIssuerQuery } from '../queries/get-fiscal-issuer';
import { useUpdateFiscalIssuerMutation } from '../mutations/update-fiscal-issuer.mutation';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key, useLocale: () => 'pt' }));
vi.mock('../queries/get-fiscal-issuer', () => ({ useFiscalIssuerQuery: vi.fn() }));
vi.mock('../mutations/update-fiscal-issuer.mutation', () => ({ useUpdateFiscalIssuerMutation: vi.fn() }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const issuer = {
  id: 'i1',
  issuerKind: 'PLATFORM' as const,
  cnpj: '12345678000199',
  legalName: 'Live Show LTDA',
  municipalRegistration: '123',
  cityIbgeCode: '3550308',
  serviceCodeNational: '01.07',
  cnae: '6201500',
  issRate: 0.05,
  issWithheld: false,
  taxRegime: 'SIMPLES_NACIONAL' as const,
  ibsCbsCst: null,
  ibsCbsClassTrib: null,
  serviceDescriptionTemplate: 'Taxa do pedido {orderId}',
  active: true,
  updatedAt: '2026-09-06T00:00:00Z',
};

describe('FiscalIssuerSection', () => {
  it('renders values from the query and sends issRate as a fraction on submit', () => {
    const mutate = vi.fn();
    vi.mocked(useFiscalIssuerQuery).mockReturnValue({ data: issuer, isLoading: false } as never);
    vi.mocked(useUpdateFiscalIssuerMutation).mockReturnValue({ mutate, isPending: false } as never);

    render(<FiscalIssuerSection />);

    const cnpjInput = screen.getByLabelText('cnpj') as HTMLInputElement;
    expect(cnpjInput.value).toBe('12345678000199');

    const issRateInput = screen.getByLabelText('issRate') as HTMLInputElement;
    expect(issRateInput.value).toBe('5');

    fireEvent.click(screen.getByRole('button', { name: 'save' }));

    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({ issRate: 0.05 }),
      expect.anything(),
    );
  });

  it('rounds issRate to 4 decimals in both directions (no float noise)', () => {
    const mutate = vi.fn();
    vi.mocked(useFiscalIssuerQuery).mockReturnValue({
      data: { ...issuer, issRate: 0.029 },
      isLoading: false,
    } as never);
    vi.mocked(useUpdateFiscalIssuerMutation).mockReturnValue({ mutate, isPending: false } as never);

    render(<FiscalIssuerSection />);

    const issRateInput = screen.getByLabelText('issRate') as HTMLInputElement;
    expect(issRateInput.value).toBe('2,9');

    fireEvent.change(issRateInput, { target: { value: '3,5' } });
    fireEvent.click(screen.getByRole('button', { name: 'save' }));

    const [payload] = mutate.mock.calls[0];
    expect(payload.issRate).toBe(0.035);
  });

  it('shows the backend error message on a rejected save', () => {
    const mutate = vi.fn((_payload, opts) => opts.onError({ message: 'cnpj must match' }));
    vi.mocked(useFiscalIssuerQuery).mockReturnValue({ data: issuer, isLoading: false } as never);
    vi.mocked(useUpdateFiscalIssuerMutation).mockReturnValue({ mutate, isPending: false } as never);

    render(<FiscalIssuerSection />);
    fireEvent.click(screen.getByRole('button', { name: 'save' }));

    expect(toast.error).toHaveBeenCalledWith('cnpj must match');
  });

  it('shows the inactive hint when the issuer is not active', () => {
    vi.mocked(useFiscalIssuerQuery).mockReturnValue({
      data: { ...issuer, active: false },
      isLoading: false,
    } as never);
    vi.mocked(useUpdateFiscalIssuerMutation).mockReturnValue({ mutate: vi.fn(), isPending: false } as never);

    render(<FiscalIssuerSection />);

    expect(screen.getByText('inactiveHint')).toBeInTheDocument();
  });
});
