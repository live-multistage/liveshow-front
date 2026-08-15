import { describe, it, expect, vi, beforeEach } from 'vitest';

// The event resolves from the PUBLIC GET /events/:id, so reaching
// /dashboard/analytics/<any-event-id> never proved access. These cover the gate
// that mirrors the server's assertEventAnalyticsAccess on the view.

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));
vi.mock('chart.js', () => ({
  Chart: { register: vi.fn() },
  CategoryScale: {}, LinearScale: {}, PointElement: {}, LineElement: {}, Tooltip: {}, Filler: {},
}));
vi.mock('react-chartjs-2', () => ({ Line: () => <div data-testid="chart" /> }));

vi.mock('@/features/events/queries/get-event', () => ({ useGetEventQuery: vi.fn() }));
vi.mock('@/features/organizations/queries/get-my-organizations', () => ({
  useMyOrganizationsQuery: vi.fn(),
}));
vi.mock('../hooks/use-event-sales', () => ({
  useGetEventSalesQuery: vi.fn(() => ({ data: { events: [] }, isLoading: false })),
}));
vi.mock('../hooks/use-event-metrics', () => ({
  useGetEventMetricsQuery: vi.fn(() => ({ data: undefined, isLoading: false })),
}));
vi.mock('../hooks/use-viewer-analytics', () => ({
  useViewerAnalyticsQuery: vi.fn(() => ({ data: undefined, isLoading: false })),
}));
vi.mock('../hooks/use-camera-breakdown', () => ({
  useCameraBreakdownQuery: vi.fn(() => ({ data: undefined, isLoading: false })),
}));
vi.mock('../hooks/use-notification-breakdown', () => ({
  useNotificationBreakdownQuery: vi.fn(() => ({ data: undefined, isLoading: false })),
}));
vi.mock('../hooks/use-sales-origin', () => ({
  useSalesOriginQuery: vi.fn(() => ({ data: undefined, isLoading: false })),
}));

import { render, screen } from '@testing-library/react';
import { AnalyticsDashboard } from './AnalyticsDashboard';
import { useGetEventQuery } from '@/features/events/queries/get-event';
import { useMyOrganizationsQuery } from '@/features/organizations/queries/get-my-organizations';

const NO_ACCESS = /não tem acesso às métricas/i;

function mockEvent(organizationId: string, isLoading = false) {
  vi.mocked(useGetEventQuery).mockReturnValue({
    data: isLoading ? undefined : { id: 'evt-1', organizationId },
    isLoading,
  } as unknown as ReturnType<typeof useGetEventQuery>);
}

function mockOrgs(ids: string[], isLoading = false) {
  vi.mocked(useMyOrganizationsQuery).mockReturnValue({
    data: ids.map((id) => ({ id, role: 'STAFF' })),
    isLoading,
  } as unknown as ReturnType<typeof useMyOrganizationsQuery>);
}

describe('AnalyticsDashboard access gate', () => {
  beforeEach(() => vi.clearAllMocks());

  it('refuses an event owned by an organization the caller does not belong to', () => {
    mockEvent('org-theirs');
    mockOrgs(['org-mine']);

    render(<AnalyticsDashboard eventId="evt-1" />);

    expect(screen.getByText(NO_ACCESS)).toBeInTheDocument();
    expect(screen.queryByText('MÉTRICAS')).not.toBeInTheDocument();
  });

  it('admits any member of the owning organization — the server does not require admin here', () => {
    mockEvent('org-mine');
    mockOrgs(['org-mine']);

    render(<AnalyticsDashboard eventId="evt-1" />);

    expect(screen.queryByText(NO_ACCESS)).not.toBeInTheDocument();
    expect(screen.getByText('MÉTRICAS')).toBeInTheDocument();
  });

  it('fails closed when the membership query errors out and yields no organizations', () => {
    mockEvent('org-theirs');
    mockOrgs([]);

    render(<AnalyticsDashboard eventId="evt-1" />);

    expect(screen.getByText(NO_ACCESS)).toBeInTheDocument();
  });

  // Without this the gate would flash a refusal before membership resolves —
  // drop `orgsLoading` from the condition and this fails.
  it('renders neither the dashboard nor a refusal while membership is still loading', () => {
    mockEvent('org-mine');
    mockOrgs([], true);

    render(<AnalyticsDashboard eventId="evt-1" />);

    expect(screen.queryByText(NO_ACCESS)).not.toBeInTheDocument();
    expect(screen.queryByText('MÉTRICAS')).not.toBeInTheDocument();
  });

  it('does not refuse while the event itself is still loading', () => {
    mockEvent('org-mine', true);
    mockOrgs(['org-mine']);

    render(<AnalyticsDashboard eventId="evt-1" />);

    expect(screen.queryByText(NO_ACCESS)).not.toBeInTheDocument();
  });
});
