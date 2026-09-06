import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PlatformFiscalPage } from './PlatformFiscalPage';
import { useFiscalDocumentsQuery } from '../queries/get-fiscal-documents';
import { useRetryFiscalDocumentMutation } from '../mutations/retry-fiscal-document.mutation';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key, useLocale: () => 'pt' }));
vi.mock('./PlatformPageShell', () => ({
  PlatformPageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('../queries/get-fiscal-documents', () => ({ useFiscalDocumentsQuery: vi.fn() }));
vi.mock('../mutations/retry-fiscal-document.mutation', () => ({ useRetryFiscalDocumentMutation: vi.fn() }));

const row = {
  id: 'fd1',
  orderId: 'o1',
  status: 'REJECTED' as const,
  amountCents: 375,
  currency: 'BRL',
  takerName: 'Ana',
  takerDocument: null,
  nfseNumber: null,
  lastErrorCode: 'E1',
  lastErrorMessage: 'ruim',
  attempts: 1,
  createdAt: '2026-09-06T00:00:00Z',
  updatedAt: '2026-09-06T00:00:00Z',
};

const skippedRow = { ...row, id: 'fd2', status: 'SKIPPED' as const, takerName: 'Beto' };

describe('PlatformFiscalPage', () => {
  it('lists documents and retries a REJECTED one after confirm', () => {
    const mutate = vi.fn();
    vi.mocked(useFiscalDocumentsQuery).mockReturnValue({
      data: { items: [row], total: 1, page: 1, limit: 25 },
      isLoading: false,
    } as never);
    vi.mocked(useRetryFiscalDocumentMutation).mockReturnValue({ mutate, isPending: false } as never);

    render(<PlatformFiscalPage />);

    expect(screen.getByText('Ana')).toBeInTheDocument();
    expect(screen.getByText('status.REJECTED')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'retry' }));
    fireEvent.click(screen.getByRole('button', { name: 'confirm' }));

    expect(mutate).toHaveBeenCalledWith('fd1', expect.anything());
  });

  it('does not offer retry for a non-retryable status', () => {
    vi.mocked(useFiscalDocumentsQuery).mockReturnValue({
      data: { items: [skippedRow], total: 1, page: 1, limit: 25 },
      isLoading: false,
    } as never);
    vi.mocked(useRetryFiscalDocumentMutation).mockReturnValue({ mutate: vi.fn(), isPending: false } as never);

    render(<PlatformFiscalPage />);

    expect(screen.getByText('Beto')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'retry' })).not.toBeInTheDocument();
  });

  it('shows the empty state when there are no documents', () => {
    vi.mocked(useFiscalDocumentsQuery).mockReturnValue({
      data: { items: [], total: 0, page: 1, limit: 25 },
      isLoading: false,
    } as never);
    vi.mocked(useRetryFiscalDocumentMutation).mockReturnValue({ mutate: vi.fn(), isPending: false } as never);

    render(<PlatformFiscalPage />);

    expect(screen.getByText('empty')).toBeInTheDocument();
  });
});
