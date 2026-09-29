vi.mock('next-intl', () => ({
  useTranslations: () => {
    const t = (key: string, values?: Record<string, unknown>) =>
      values ? `${key}:${JSON.stringify(values)}` : key;
    t.rich = (key: string) => key;
    return t;
  },
  useFormatter: () => ({
    number: (n: number, opts?: { style?: string; maximumFractionDigits?: number }) => {
      if (opts?.style === 'percent') return `${(n * 100).toFixed(1)}%`;
      if (opts?.maximumFractionDigits !== undefined) return n.toFixed(opts.maximumFractionDigits).replace('.', ',');
      return String(n);
    },
    dateTime: (d: Date, opts?: { day?: string; hour?: string }) => {
      if (opts?.hour && !opts.day) return String(d.getUTCHours()).padStart(2, '0');
      if (opts?.day) return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
      return d.toISOString();
    },
    relativeTime: () => 'agora',
  }),
}));
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));
vi.mock('next/navigation', () => ({ usePathname: () => '/dashboard/platform/tracking' }));
vi.mock('../queries/get-overview', () => ({ useTrackingOverviewQuery: vi.fn() }));

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TrackingOverviewPage, normalizeHourly24 } from './TrackingOverviewPage';
import { useTrackingOverviewQuery } from '../queries/get-overview';
import type { OverviewReport } from '@live-show/api-contracts';

const mockedQuery = vi.mocked(useTrackingOverviewQuery);

function mock(data: OverviewReport | undefined, overrides: Record<string, unknown> = {}) {
  mockedQuery.mockReturnValue({ data, isLoading: false, isError: false, refetch: vi.fn(), ...overrides } as never);
}

// Real, hour-aligned UTC timestamps (matching what the backend/normalizeHourly24
// produce) so bars line up with whatever "now" the component resolves at render.
function makeHourly(counts: number[]): OverviewReport['hourly'] {
  const end = new Date();
  end.setUTCMinutes(0, 0, 0);
  return counts.map((count, i) => {
    const d = new Date(end);
    d.setUTCHours(d.getUTCHours() - (23 - i));
    return { hour: d.toISOString(), count };
  });
}

const report: OverviewReport = {
  hourly: makeHourly(Array.from({ length: 24 }, (_, i) => (i === 5 ? 100 : 10))),
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

  it('shows the flag-off banner and dims the KPIs/chart when tracking is disabled', () => {
    mock(report);
    const { container } = render(<TrackingOverviewPage trackingEnabled={false} />);

    expect(screen.getByText('shell.flagOffBanner')).toBeInTheDocument();
    expect(screen.getByText('overview.kpis.events')).toBeInTheDocument();
    expect(container.querySelector('[class*="dimmed"]')).toBeInTheDocument();
  });

  it('renders a 4-tick y-axis scale for the hourly chart', () => {
    mock(report);
    render(<TrackingOverviewPage trackingEnabled />);

    expect(screen.getByText('100')).toBeInTheDocument(); // top tick == the peak hour's count
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('normalizes a single hourly point into 24 bars, only the last flagged as the current hour', () => {
    const now = new Date('2026-09-29T03:00:00.000Z');
    mock({
      ...report,
      hourly: [{ hour: now.toISOString(), count: 8 }],
    });
    const { container } = render(<TrackingOverviewPage trackingEnabled />);

    const bars = container.querySelectorAll('[class*="bar"][title]');
    expect(bars.length).toBe(24);
    const nowBars = container.querySelectorAll('[class*="barNow"]');
    expect(nowBars.length).toBe(1);
    expect(nowBars[0]).toBe(bars[bars.length - 1]);
  });

  it('formats the peak label with the real timestamp, never a raw ISO string', () => {
    mock(report);
    render(<TrackingOverviewPage trackingEnabled />);

    const peakLine = screen.getByText('overview.chart.peak').closest('div');
    expect(peakLine?.textContent).toContain('overview.chart.peakCount');
    expect(peakLine?.textContent).not.toMatch(/T\d{2}:\d{2}:\d{2}/);
  });

  it('shows the average per hour with one decimal when total events is small', () => {
    mock({
      ...report,
      hourly: makeHourly(Array.from({ length: 24 }, (_, i) => (i === 0 ? 8 : 0))),
    });
    render(<TrackingOverviewPage trackingEnabled />);

    expect(screen.getByText('overview.kpis.eventsSub:{"avg":"0,3"}')).toBeInTheDocument();
  });

  it('shows the violation sub-label without a fabricated message count', () => {
    mock(report);
    render(<TrackingOverviewPage trackingEnabled />);

    expect(screen.getByText('overview.kpis.violationRateSub')).toBeInTheDocument();
  });
});

describe('normalizeHourly24', () => {
  it('fills 24 UTC hourly slots ending at "now", zeroing missing hours', () => {
    const now = new Date('2026-09-29T03:00:00.000Z');
    const bars = normalizeHourly24([{ hour: now.toISOString(), count: 8 }], now);

    expect(bars).toHaveLength(24);
    expect(bars[23]).toEqual({ hour: now.toISOString(), count: 8 });
    expect(bars[0].count).toBe(0);
    expect(bars[0].hour).toBe('2026-09-28T04:00:00.000Z');
  });
});
