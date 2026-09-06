vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('../queries/get-order-fiscal-document', () => ({ useOrderFiscalDocumentQuery: vi.fn() }));

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OrderFiscalDocumentButton } from './OrderFiscalDocumentButton';
import { useOrderFiscalDocumentQuery } from '../queries/get-order-fiscal-document';

const mocked = vi.mocked(useOrderFiscalDocumentQuery);

// jsdom doesn't implement these — Radix DropdownMenu needs them to open.
beforeEach(() => {
  window.HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
  window.HTMLElement.prototype.releasePointerCapture = vi.fn();
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
});

describe('OrderFiscalDocumentButton', () => {
  it('shows PDF/XML links when AUTHORIZED', async () => {
    mocked.mockReturnValue({
      data: { status: 'AUTHORIZED', nfseNumber: '55', authorizedAt: '2026-09-06T00:00:00Z', pdfUrl: 'https://s/p', xmlUrl: 'https://s/x' },
      isLoading: false,
      refetch: vi.fn(),
    } as never);
    const user = userEvent.setup();
    render(<OrderFiscalDocumentButton orderId="o1" orderStatus="PAID" />);
    await user.click(screen.getByRole('button', { name: 'download' }));
    const pdf = await screen.findByRole('menuitem', { name: /pdf/i });
    const xml = screen.getByRole('menuitem', { name: /xml/i });
    expect(pdf).toHaveAttribute('href', 'https://s/p');
    expect(pdf).toHaveAttribute('target', '_blank');
    expect(pdf).toHaveAttribute('rel', 'noreferrer');
    expect(xml).toHaveAttribute('href', 'https://s/x');
    expect(xml).toHaveAttribute('target', '_blank');
    expect(xml).toHaveAttribute('rel', 'noreferrer');
  });

  it('refetches once when the menu opens', async () => {
    const refetch = vi.fn();
    mocked.mockReturnValue({
      data: { status: 'AUTHORIZED', nfseNumber: '55', authorizedAt: '2026-09-06T00:00:00Z', pdfUrl: 'https://s/p', xmlUrl: 'https://s/x' },
      isLoading: false,
      refetch,
    } as never);
    const user = userEvent.setup();
    render(<OrderFiscalDocumentButton orderId="o1" orderStatus="PAID" />);
    expect(refetch).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'download' }));
    await screen.findByRole('menuitem', { name: /pdf/i });
    expect(refetch).toHaveBeenCalledTimes(1);
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

  it('shows failed copy on a query error', () => {
    mocked.mockReturnValue({ data: undefined, isLoading: false, isError: true } as never);
    render(<OrderFiscalDocumentButton orderId="o1" orderStatus="PAID" />);
    expect(screen.getByText('failed')).toBeInTheDocument();
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
