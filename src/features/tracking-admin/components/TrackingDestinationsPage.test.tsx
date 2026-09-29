vi.mock('next-intl', () => ({
  useTranslations: () => {
    const t = (key: string, values?: Record<string, unknown>) =>
      values ? `${key}:${JSON.stringify(values)}` : key;
    t.rich = (key: string) => key;
    return t;
  },
}));
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));
vi.mock('next/navigation', () => ({ usePathname: () => '/dashboard/platform/tracking/destinations' }));
vi.mock('../queries/get-destinations', () => ({
  useDestinationsQuery: vi.fn(),
  useCreateDestinationMutation: vi.fn(),
  useUpdateDestinationMutation: vi.fn(),
  useDeleteDestinationMutation: vi.fn(),
  useDestinationDeliveriesQuery: vi.fn(),
  useTestDestinationMutation: vi.fn(),
}));

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TrackingDestinationsPage } from './TrackingDestinationsPage';
import {
  useDestinationsQuery,
  useCreateDestinationMutation,
  useUpdateDestinationMutation,
  useDestinationDeliveriesQuery,
  useTestDestinationMutation,
} from '../queries/get-destinations';
import type { TrackingDestination } from '@live-show/api-contracts';

const mockedDestinations = vi.mocked(useDestinationsQuery);
const mockedCreate = vi.mocked(useCreateDestinationMutation);
const mockedUpdate = vi.mocked(useUpdateDestinationMutation);
const mockedDeliveries = vi.mocked(useDestinationDeliveriesQuery);
const mockedTest = vi.mocked(useTestDestinationMutation);

const destinations: TrackingDestination[] = [
  { id: 'd1', name: 'CRM — HubSpot', url: 'https://api.hubapi.com/webhooks/v3/showon', eventFilter: ['order_paid'], enabled: true, createdAt: '02/09/2026' },
];

let testMutateAsync: ReturnType<typeof vi.fn>;
let createMutateAsync: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  mockedDestinations.mockReturnValue({ data: destinations, isLoading: false, isError: false, refetch: vi.fn() } as never);
  mockedUpdate.mockReturnValue({ mutate: vi.fn(), isPending: false } as never);
  mockedDeliveries.mockReturnValue({ data: [], refetch: vi.fn() } as never);
  testMutateAsync = vi.fn().mockResolvedValue({ status: 404, error: 'HTTP 404 Not Found' });
  mockedTest.mockReturnValue({ mutateAsync: testMutateAsync, isPending: false } as never);
  createMutateAsync = vi.fn().mockResolvedValue({ ...destinations[0], secret: 'whsec_abc123' });
  mockedCreate.mockReturnValue({ mutateAsync: createMutateAsync, isPending: false } as never);
});

describe('TrackingDestinationsPage', () => {
  it('shows the returned status after sending a test', async () => {
    render(<TrackingDestinationsPage trackingEnabled />);

    fireEvent.click(screen.getByText('destinations.testSend'));

    expect(await screen.findByText('destinations.testFailureToast:{"error":"HTTP 404 Not Found"}')).toBeInTheDocument();
    expect(testMutateAsync).toHaveBeenCalledWith('d1');
  });

  it('shows the destination secret once after creating it', async () => {
    render(<TrackingDestinationsPage trackingEnabled />);

    fireEvent.click(screen.getByText('destinations.newDestination'));
    fireEvent.change(screen.getByLabelText('destinations.newDialog.name'), { target: { value: 'Slack' } });
    fireEvent.change(screen.getByLabelText('destinations.newDialog.url'), { target: { value: 'https://hooks.slack.com/x' } });
    fireEvent.click(screen.getByText('destinations.newDialog.create'));

    expect(await screen.findByText('whsec_abc123')).toBeInTheDocument();
    expect(createMutateAsync).toHaveBeenCalledWith({ name: 'Slack', url: 'https://hooks.slack.com/x', eventFilter: [] });
  });
});
