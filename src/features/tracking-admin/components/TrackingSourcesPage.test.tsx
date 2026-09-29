vi.mock('next-intl', () => ({
  useTranslations: () => {
    const t = (key: string, values?: Record<string, unknown>) =>
      values ? `${key}:${JSON.stringify(values)}` : key;
    t.rich = (key: string) => key;
    return t;
  },
  useFormatter: () => ({
    number: (n: number) => String(n),
    relativeTime: () => 'agora',
    dateTime: () => '02/09/2026 10:00',
  }),
}));
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));
vi.mock('next/navigation', () => ({ usePathname: () => '/dashboard/platform/tracking/sources' }));
vi.mock('../queries/get-sources', () => ({
  useTrackingSourcesQuery: vi.fn(),
  useCreateSourceMutation: vi.fn(),
  useRotateSourceKeyMutation: vi.fn(),
  useUpdateSourceMutation: vi.fn(),
}));

Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TrackingSourcesPage } from './TrackingSourcesPage';
import {
  useTrackingSourcesQuery,
  useCreateSourceMutation,
  useRotateSourceKeyMutation,
  useUpdateSourceMutation,
} from '../queries/get-sources';
import type { TrackingSource } from '@live-show/api-contracts';

const mockedSources = vi.mocked(useTrackingSourcesQuery);
const mockedCreate = vi.mocked(useCreateSourceMutation);
const mockedRotate = vi.mocked(useRotateSourceKeyMutation);
const mockedUpdate = vi.mocked(useUpdateSourceMutation);

const sources: TrackingSource[] = [
  { id: 's1', name: 'web', kind: 'web', writeKeyPrefix: 'wk_live_8a2f…', enabled: true, createdAt: '02/09/2026' },
];

beforeEach(() => {
  vi.clearAllMocks();
  mockedSources.mockReturnValue({ data: sources, isLoading: false, isError: false, refetch: vi.fn() } as never);
  mockedCreate.mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
  mockedUpdate.mockReturnValue({ mutate: vi.fn(), isPending: false } as never);
  mockedRotate.mockReturnValue({
    mutateAsync: vi.fn().mockResolvedValue({ ...sources[0], writeKey: 'wk_live_8a2f5e91c3d0' }),
    isPending: false,
  } as never);
});

describe('TrackingSourcesPage', () => {
  it('shows the full write key once after rotating, then hides it after dismissing', async () => {
    render(<TrackingSourcesPage trackingEnabled />);

    fireEvent.click(screen.getByLabelText('sources.rotate'));
    expect(await screen.findByText('wk_live_8a2f5e91c3d0')).toBeInTheDocument();

    fireEvent.click(screen.getByText('sources.keyShown.close'));
    await waitFor(() => expect(screen.queryByText('wk_live_8a2f5e91c3d0')).not.toBeInTheDocument());
  });

  it('does not offer rotate for server sources', () => {
    mockedSources.mockReturnValue({
      data: [{ ...sources[0], kind: 'server' }],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never);
    render(<TrackingSourcesPage trackingEnabled />);
    expect(screen.queryByLabelText('sources.rotate')).not.toBeInTheDocument();
  });

  it('formats the created date via the formatter instead of rendering the raw ISO string', () => {
    render(<TrackingSourcesPage trackingEnabled />);
    expect(document.body.textContent).not.toMatch(/T\d\d:/);
    expect(screen.getByText('02/09/2026 10:00')).toBeInTheDocument();
  });
});
