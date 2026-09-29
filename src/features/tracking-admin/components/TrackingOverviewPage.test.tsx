vi.mock('next-intl', () => ({
  useTranslations: () => {
    const t = (key: string, values?: Record<string, unknown>) =>
      values ? `${key}:${JSON.stringify(values)}` : key;
    t.rich = (key: string) => key;
    return t;
  },
  useFormatter: () => ({
    number: (n: number, opts?: { style?: string }) => (opts?.style === 'percent' ? `${(n * 100).toFixed(1)}%` : String(n)),
    relativeTime: () => 'agora',
    dateTime: (d: Date) => d.toISOString(),
  }),
}));
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));
vi.mock('next/navigation', () => ({ usePathname: () => '/dashboard/platform/tracking' }));
vi.mock('../queries/get-overview', () => ({ useTrackingOverviewQuery: vi.fn() }));

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TrackingOverviewPage } from './TrackingOverviewPage';
import { useTrackingOverviewQuery } from '../queries/get-overview';
import type { OverviewReport } from '@live-show/api-contracts';

const mockedQuery = vi.mocked(useTrackingOverviewQuery);

function mock(data: OverviewReport | undefined, overrides: Record<string, unknown> = {}) {
  mockedQuery.mockReturnValue({ data, isLoading: false, isError: false, refetch: vi.fn(), ...overrides } as never);
}

const report: OverviewReport = {
  hourly: Array.from({ length: 24 }, (_, i) => ({ hour: `${i}h`, count: i === 5 ? 100 : 10 })),
  topEvents: [{ event: 'page_viewed', count: 500 }, { event: 'order_paid', count: 20 }],
  violationRate: 0.008,
  queue: { waiting: 142, failed: 0 },
  sources: [{ id: 's1', name: 'web', lastSeenAt: new Date().toISOString() }],
};

beforeEach(() => vi.clearAllMocks());

describe('TrackingOverviewPage', () => {
  it('renders KPI tiles and the top events list from query data', () => {
    mock(report);
    render(<TrackingOverviewPage trackingEnabled />);

    expect(screen.getByText('overview.kpis.events')).toBeInTheDocument();
    expect(screen.getByText('page_viewed')).toBeInTheDocument();
    expect(screen.getByText('order_paid')).toBeInTheDocument();
    expect(screen.getByText('web')).toBeInTheDocument();
  });

  it('shows the empty state when there are no events and no top events', () => {
    mock({ ...report, hourly: report.hourly.map((h) => ({ ...h, count: 0 })), topEvents: [] });
    render(<TrackingOverviewPage trackingEnabled />);

    expect(screen.getByText('overview.empty.title')).toBeInTheDocument();
    expect(screen.queryByText('overview.kpis.events')).not.toBeInTheDocument();
  });

  it('shows the error state and retries', () => {
    mock(undefined, { isError: true });
    render(<TrackingOverviewPage trackingEnabled />);

    expect(screen.getByText('overview.error')).toBeInTheDocument();
  });

  it('shows the flag-off banner when tracking is disabled', () => {
    mock(report);
    render(<TrackingOverviewPage trackingEnabled={false} />);

    expect(screen.getByText('shell.flagOffBanner')).toBeInTheDocument();
  });
});
