import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CatalogCards } from './CatalogCards';
import { useCatalogSummaryQuery } from '@/features/platform-admin/queries/get-catalog';

vi.mock('@/features/platform-admin/queries/get-catalog', () => ({
  useCatalogSummaryQuery: vi.fn(),
}));

const mockedUseCatalogSummaryQuery = vi.mocked(useCatalogSummaryQuery);

function renderCards() {
  mockedUseCatalogSummaryQuery.mockReturnValue({ data: undefined } as ReturnType<typeof useCatalogSummaryQuery>);
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <CatalogCards />
    </QueryClientProvider>,
  );
}

describe('CatalogCards', () => {
  it('renders the Ads card as an external link to the Ads Manager, opening a new tab', () => {
    renderCards();

    const link = screen.getByRole('link', { name: /Gerenciar campanhas/i });
    expect(link).toHaveAttribute('href', 'http://localhost:3002');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link.getAttribute('rel') ?? '').toContain('noopener');
  });

  it('renders the Events card as an internal link', () => {
    renderCards();

    const link = screen.getByRole('link', { name: /Abrir eventos/i });
    expect(link).toHaveAttribute('href', '/dashboard/events');
    expect(link).not.toHaveAttribute('target');
  });
});
