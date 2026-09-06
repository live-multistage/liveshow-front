vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('../queries/get-order-fiscal-document', () => ({ useOrderFiscalDocumentQuery: vi.fn() }));

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { OrderFiscalDocumentButton } from './OrderFiscalDocumentButton';
import { useOrderFiscalDocumentQuery } from '../queries/get-order-fiscal-document';

const mocked = vi.mocked(useOrderFiscalDocumentQuery);

describe('OrderFiscalDocumentButton', () => {
  it('shows PDF/XML links when AUTHORIZED', () => {
    mocked.mockReturnValue({
      data: { status: 'AUTHORIZED', nfseNumber: '55', authorizedAt: '2026-09-06T00:00:00Z', pdfUrl: 'https://s/p', xmlUrl: 'https://s/x' },
      isLoading: false,
    } as never);
    render(<OrderFiscalDocumentButton orderId="o1" orderStatus="PAID" />);
    fireEvent.click(screen.getByRole('button', { name: 'download' }));
    const pdf = screen.getByRole('link', { name: /pdf/i });
    const xml = screen.getByRole('link', { name: /xml/i });
    expect(pdf).toHaveAttribute('href', 'https://s/p');
    expect(pdf).toHaveAttribute('target', '_blank');
    expect(pdf).toHaveAttribute('rel', 'noreferrer');
    expect(xml).toHaveAttribute('href', 'https://s/x');
    expect(xml).toHaveAttribute('target', '_blank');
    expect(xml).toHaveAttribute('rel', 'noreferrer');
  });

  it('shows processing copy while PENDING/PROCESSING', () => {
    mocked.mockReturnValue({
      data: { status: 'PROCESSING', nfseNumber: null, authorizedAt: null, pdfUrl: null, xmlUrl: null },
      isLoading: false,
    } as never);
    render(<OrderFiscalDocumentButton orderId="o1" orderStatus="PAID" />);
    expect(screen.getByText('processing')).toBeInTheDocument();
  });

  it('shows not-issued when there is no document (null)', () => {
    mocked.mockReturnValue({ data: null, isLoading: false } as never);
    render(<OrderFiscalDocumentButton orderId="o1" orderStatus="PAID" />);
    expect(screen.getByText('notIssued')).toBeInTheDocument();
  });

  it('does not query for non-PAID/REFUNDED orders', () => {
    mocked.mockReturnValue({ data: undefined, isLoading: false } as never);
    render(<OrderFiscalDocumentButton orderId="o1" orderStatus="PENDING" />);
    expect(mocked).toHaveBeenCalledWith('o1', false);
  });

  it('queries for REFUNDED orders too', () => {
    mocked.mockReturnValue({ data: undefined, isLoading: false } as never);
    render(<OrderFiscalDocumentButton orderId="o1" orderStatus="REFUNDED" />);
    expect(mocked).toHaveBeenCalledWith('o1', true);
  });
});
