import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { SeriesResponse } from '../../types/series.types';
import { SeriesPageContent } from './SeriesPageContent';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'pt-BR',
}));

const organizations = { data: [{ id: 'org-1', name: 'Org Um', slug: 'org-um' }] };
vi.mock('@/features/organizations/queries/get-my-organizations', () => ({
  useMyOrganizationsQuery: () => organizations,
}));

const useOrgSeriesQuery = vi.fn();
vi.mock('../../queries/series.queries', () => ({
  useOrgSeriesQuery: (...args: unknown[]) => useOrgSeriesQuery(...args),
}));

const series = (overrides: Partial<SeriesResponse> = {}): SeriesResponse => ({
  id: 'series-1',
  organizationId: 'org-1',
  slug: 'quinta-do-rock',
  name: 'Quinta do Rock',
  description: null,
  rrule: 'FREQ=WEEKLY;BYDAY=TH',
  dtstart: '2026-01-01T23:00:00.000Z',
  timezone: 'America/Sao_Paulo',
  durationMin: 90,
  horizonWeeks: 4,
  templateEventId: 'evt-template-1',
  status: 'ACTIVE',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

describe('SeriesPageContent', () => {
  beforeEach(() => {
    useOrgSeriesQuery.mockReset();
    useOrgSeriesQuery.mockReturnValue({ data: [series()], isLoading: false });
  });

  it('lists the series of the first organization, linking each to its detail page', () => {
    render(<SeriesPageContent />);

    expect(useOrgSeriesQuery).toHaveBeenCalledWith('org-1', { enabled: true });
    expect(screen.getByText('Quinta do Rock').closest('a')).toHaveAttribute(
      'href',
      '/dashboard/series/quinta-do-rock',
    );
    expect(screen.getByText('dashboard.status.ACTIVE')).toBeInTheDocument();
  });

  it('offers the create link when the organization has no series yet', () => {
    useOrgSeriesQuery.mockReturnValue({ data: [], isLoading: false });

    render(<SeriesPageContent />);

    expect(screen.getAllByText('dashboard.new')[0].closest('a')).toHaveAttribute(
      'href',
      '/dashboard/series/new',
    );
  });
});
