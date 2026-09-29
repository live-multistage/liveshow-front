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
vi.mock('next/navigation', () => ({ usePathname: () => '/dashboard/platform/tracking/plan' }));
vi.mock('../queries/get-plan', () => ({
  useTrackingPlanQuery: vi.fn(),
  useUnplannedEventsQuery: vi.fn(),
  useUpsertPlanEventMutation: vi.fn(),
}));

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AxiosError } from 'axios';
import { TrackingPlanPage } from './TrackingPlanPage';
import { useTrackingPlanQuery, useUnplannedEventsQuery, useUpsertPlanEventMutation } from '../queries/get-plan';
import type { PlanEvent, UnplannedEvent } from '@live-show/api-contracts';

const mockedPlan = vi.mocked(useTrackingPlanQuery);
const mockedUnplanned = vi.mocked(useUnplannedEventsQuery);
const mockedUpsert = vi.mocked(useUpsertPlanEventMutation);

const events: PlanEvent[] = [
  {
    name: 'player_started',
    description: 'Player iniciou.',
    owner: 'Streaming',
    status: 'live',
    properties: [{ name: 'quality', type: 'string', required: true }],
    updatedAt: '2026-09-01',
  },
];

const unplanned: UnplannedEvent[] = [
  { name: 'share_clicked', firstSeenAt: '21/09', lastSeenAt: 'há 2 min', count: 4120 },
];

let mutateAsync: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  mockedPlan.mockReturnValue({ data: events, isLoading: false, isError: false, refetch: vi.fn() } as never);
  mockedUnplanned.mockReturnValue({ data: unplanned } as never);
  mutateAsync = vi.fn().mockResolvedValue(events[0]);
  mockedUpsert.mockReturnValue({ mutateAsync, isPending: false } as never);
});

describe('TrackingPlanPage', () => {
  it('blocks save when the event name is invalid and shows the server 400 message otherwise', async () => {
    render(<TrackingPlanPage trackingEnabled />);

    fireEvent.click(screen.getByText('plan.newEvent'));
    const nameInput = screen.getByLabelText('plan.editor.name');
    fireEvent.change(nameInput, { target: { value: 'Invalid Name!' } });

    const saveButton = screen.getByText('plan.editor.save').closest('button') as HTMLButtonElement;
    expect(saveButton).toBeDisabled();
    fireEvent.click(saveButton);
    expect(mutateAsync).not.toHaveBeenCalled();

    fireEvent.change(nameInput, { target: { value: 'order_paid' } });
    expect(saveButton).not.toBeDisabled();

    mutateAsync.mockRejectedValueOnce(
      new AxiosError('Bad Request', undefined, undefined, undefined, {
        status: 400,
        data: { message: 'order_paid já existe.' },
      } as never),
    );
    fireEvent.click(saveButton);
    expect(await screen.findByText('order_paid já existe.')).toBeInTheDocument();
  });

  it('blocks save when a property has no name or an enum has no values', () => {
    render(<TrackingPlanPage trackingEnabled />);

    fireEvent.click(screen.getByText('player_started'));
    const saveButton = screen.getByText('plan.editor.save').closest('button') as HTMLButtonElement;
    expect(saveButton).not.toBeDisabled();

    fireEvent.click(screen.getByText('plan.editor.addProperty'));
    expect(saveButton).toBeDisabled();
    expect(screen.getByText('plan.editor.propertyNameError')).toBeInTheDocument();
  });

  it('prefills the event name when adding an unplanned event to the plan', () => {
    render(<TrackingPlanPage trackingEnabled />);

    fireEvent.click(screen.getByText('plan.tabs.unplanned'));
    fireEvent.click(screen.getByText('plan.addToPlan'));

    expect(screen.getByLabelText('plan.editor.name')).toHaveValue('share_clicked');
  });
});
