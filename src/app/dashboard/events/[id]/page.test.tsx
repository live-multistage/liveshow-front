import { describe, it, expect, vi } from 'vitest';
import { DEFAULT_FEATURE_FLAGS } from '@/features/feature-flags';

const fetchFeatureFlags = vi.fn();
vi.mock('@/features/feature-flags', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  fetchFeatureFlags,
}));

vi.mock('@/features/events/components/dashboard/EventDashboardDetailContent', () => ({
  EventDashboardDetailContent: 'EventDashboardDetailContent',
}));

import DashboardEventDetailPage from './page';

describe('DashboardEventDetailPage', () => {
  it('fails physical_tickets and event_collaborations open even when the global flags are off', async () => {
    fetchFeatureFlags.mockResolvedValue({
      ...DEFAULT_FEATURE_FLAGS,
      physical_tickets: false,
      event_collaborations: false,
    });

    const element = await DashboardEventDetailPage({ params: Promise.resolve({ id: 'evt-1' }) });

    expect(element.props.physicalTicketsEnabled).toBe(true);
    expect(element.props.collaborationsEnabled).toBe(true);
  });
});
