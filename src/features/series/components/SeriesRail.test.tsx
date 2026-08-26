import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { SeriesListItem } from '../types/series.types';
import { SeriesRail } from './SeriesRail';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'pt-BR',
}));
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

const series = (overrides: Partial<SeriesListItem> = {}): SeriesListItem => ({
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
  status: 'ACTIVE',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  nextEpisode: null,
  episodeCount: 0,
  ...overrides,
});

describe('SeriesRail', () => {
  it('renders nothing when there are no active series', () => {
    const { container } = render(<SeriesRail series={[]} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders one card per series, linking to the series page', () => {
    render(
      <SeriesRail
        series={[series(), series({ id: 'series-2', slug: 'sexta-jazz', name: 'Sexta Jazz' })]}
      />,
    );

    expect(screen.getByText('Quinta do Rock').closest('a')).toHaveAttribute(
      'href',
      '/series/quinta-do-rock',
    );
    expect(screen.getByText('Sexta Jazz').closest('a')).toHaveAttribute(
      'href',
      '/series/sexta-jazz',
    );
  });

  it('links to the full series listing', () => {
    render(<SeriesRail series={[series()]} />);

    expect(screen.getByText('seeAll')).toHaveAttribute('href', '/series');
  });
});
